import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { PrismaClient } from '@prisma/client';
import { rehearse, people } from './journey.mjs';

process.chdir(fileURLToPath(new URL('../../', import.meta.url)));
for (const file of ['.env', '.env.local', '.env.development', '.env.development.local', '.env.production', '.env.production.local', 'prisma/.env']) {
  assert(!existsSync(file), `${file} is present. Run the rehearsal in a clean worktree without dotenv files.`);
}
assert(process.getuid?.() !== 0, 'Run as a non-root user on macOS or Linux.');
const pg = name => process.env.SETRU_QA_PG_BIN ? join(process.env.SETRU_QA_PG_BIN, name) : name;
const runtime = mkdtempSync(join(tmpdir(), 'setru-browser-'));
const cluster = join(runtime, 'pg');
const password = randomBytes(24).toString('hex');
const pgPassword = join(runtime, 'password');
const env = {
  PATH: process.env.PATH,
  XDG_CACHE_HOME: join(runtime, 'cache'),
  XDG_CONFIG_HOME: join(runtime, 'config'),
  XDG_DATA_HOME: join(runtime, 'data'),
  TMPDIR: runtime,
  LANG: 'C',
  TZ: 'Europe/London',
  NEXT_TELEMETRY_DISABLED: '1',
  PGCONNECT_TIMEOUT: '3',
};
const port = async () => {
  const server = createServer().listen(0, '127.0.0.1');
  await once(server, 'listening');
  const number = server.address().port;
  await new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
  return number;
};
const checked = (command, args, options = {}) => {
  const result = spawnSync(command, args, { env, encoding: 'utf8', stdio: 'pipe', ...options });
  assert(!result.error, `${command}: ${result.error?.message}`);
  assert.equal(result.status, 0, `${command} failed\n${result.stderr ?? ''}${result.stdout ?? ''}`);
  return result.stdout;
};
const eventually = async (check, message, timeout = 25000) => {
  const end = Date.now() + timeout;
  do {
    const value = await check();
    if (value) return value;
    await delay(100);
  } while (Date.now() < end);
  throw new Error(message);
};
let postgres, app, browser, db, rejectProxy;
let output = '';
let browserCompleted = false;
async function stopApp() {
  if (app && app.exitCode === null && app.signalCode === null) {
    const finished = once(app, 'exit');
    process.kill(-app.pid, 'SIGTERM');
    await finished;
  }
  app = undefined;
}
async function startApp(open) {
  await stopApp();
  const next = './node_modules/next/dist/bin/next';
  app = spawn(process.execPath, [next, 'dev', '--hostname', '127.0.0.1', '--port', new URL(env.APP_BASE_URL).port], {
    env: { ...env, SETRU_PRIVATE_PILOT_ADMISSION: open ? '1' : '0' },
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  for (const stream of [app.stdout, app.stderr]) stream.setEncoding('utf8').on('data', chunk => { output += chunk; });
  await eventually(async () => {
    assert.equal(app.exitCode, null, 'Next exited during startup');
    try { return (await fetch(`${env.APP_BASE_URL}/pilot/join`, { signal: AbortSignal.timeout(15000) })).ok; } catch { return false; }
  }, 'Local Setru failed to start', 60000);
}
const mail = {
  all() {
    return [...output.matchAll(/\[mail:dev\] to=(\S+) subject="([^"\n]+)"\n([\s\S]*?)(?=\n(?:\[mail:|\s*(?:POST|GET|✓|○|⚠)\s)|$)/g)]
      .map(([, to, subject, body]) => ({ to, subject, body }));
  },
  async get(to, subject) {
    return eventually(() => this.all().find(message => message.to === to && message.subject === subject), `Missing local mail: ${subject} to ${to}`);
  },
};

try {
  // Tenants, roles, credentials and both database URLs are generated here.
  // The command never accepts an existing server, database URL or app URL.
  assert.match(checked(pg('initdb'), ['--version']), /PostgreSQL/);
  writeFileSync(pgPassword, `${password}\n`, { mode: 0o600 });
  checked(pg('initdb'), ['-D', cluster, '-U', 'setru_qa', '-A', 'scram-sha-256', '--pwfile', pgPassword, '--no-locale']);
  rmSync(pgPassword);
  const dbPort = await port();
  checked(pg('pg_ctl'), ['-D', cluster, '-l', join(runtime, 'postgres.log'), '-o', `-h 127.0.0.1 -p ${dbPort} -k ''`, '-w', 'start']);
  postgres = true;
  const connection = `postgresql://setru_qa:${password}@127.0.0.1:${dbPort}`;
  const base = `http://localhost:${await port()}`;
  const expires = new Date(Date.now() + 90 * 60_000).toISOString().replace(/\.\d{3}Z$/, 'Z');
  Object.assign(env, {
    APP_BASE_URL: base,
    AUTH_URL: base,
    AUTH_SECRET: randomBytes(32).toString('hex'),
    AUTH_TRUST_HOST: 'true',
    FOUNDER_EMAILS: people.founder.email,
    PILOT_MANAGER_EMAILS: people.manager.email,
    PILOT_MARSHAL_EMAILS: people.marshals.map(person => person.email).join(','),
    SETRU_PRIVATE_PILOT_COVER_UNTIL: expires,
    EMAIL_FROM: 'sender@example.invalid',
    SUPPORT_NOTIFY_EMAIL: 'support@example.invalid',
    SETRU_PILOT_DISCLOSURES: JSON.stringify({
      businessAddress: 'Synthetic rehearsal address', contactEmail: 'support@example.invalid',
      providersAndTransfers: 'Local rehearsal only.', retention: 'Disposable fixtures removed at the end of the run.',
    }),
  });
  const setupDatabase = name => {
    env.DATABASE_URL = `${connection}/${name}`;
    env.POSTGRES_URL = env.DATABASE_URL;
    checked(process.execPath, ['./node_modules/prisma/build/index.js', 'db', 'push', '--skip-generate']);
    const security = readFileSync('prisma/pilot-security.sql', 'utf8');
    const supplemental = security.slice(security.indexOf('CREATE FUNCTION public.setru_disable_sessions'), security.lastIndexOf('COMMIT;'));
    assert(supplemental.startsWith('CREATE FUNCTION'), 'Pilot security SQL is missing the disable-session trigger');
    checked(process.execPath, ['./node_modules/prisma/build/index.js', 'db', 'execute', '--schema', 'prisma/schema.prisma', '--stdin'], { input: supplemental });
  };
  setupDatabase('setru_browser');
  db = new PrismaClient({ datasourceUrl: env.DATABASE_URL });
  await db.user.create({ data: { email: people.founder.email, passwordHash: 'passcode-only', role: 'UNSET' } });
  checked(process.execPath, ['scripts/write-version.mjs']);
  // Playwright routing checks the initial request. A deny proxy also prevents
  // Chromium from following a redirect to an external host.
  rejectProxy = createServer(socket => socket.destroy()).listen(0, '127.0.0.1');
  await once(rejectProxy, 'listening');
  browser = await chromium.launch({
    env,
    args: [
      `--proxy-server=http://127.0.0.1:${rejectProxy.address().port}`,
      `--proxy-bypass-list=<-loopback>;${new URL(base).host}`,
    ],
    ...(process.env.SETRU_QA_CHROMIUM && { executablePath: process.env.SETRU_QA_CHROMIUM }),
  });
  console.log(`Isolated browser rehearsal · ${checked('git', ['rev-parse', '--short', 'HEAD']).trim()} · Chromium ${browser.version()}`);
  await startApp(true);
  await rehearse({ browser, base, expires, db, mail, restartPaused: () => startApp(false) });
  browserCompleted = true;
  console.log('PASS · isolated mobile browser rehearsal');
  await stopApp();
  if (process.argv.includes('--checks')) {
    setupDatabase('setru_qa');
    const tests = [
      'booking-integrity.test.cjs', 'booking-wrap-cancellation.test.cjs', 'email-verification.test.cjs',
      'functional-bug-log.test.cjs', 'pilot-security.test.cjs', 'private-pilot-admission.test.cjs',
      'privacy-review.test.cjs', 'public-intake-hold.test.cjs', 'vacancy-release.test.cjs',
      'workspace_regression_tests.ts', 'auth_email_tests.ts', 'demo-regression.test.ts',
    ].map(file => `scripts/${file}`);
    checked(process.execPath, ['--import', 'tsx', '--test', '--test-concurrency=1', ...tests], { stdio: 'inherit' });
    checked(process.execPath, ['--import', 'tsx', 'scripts/audit_remediation_tests.ts'], { stdio: 'inherit' });
    checked(process.execPath, ['scripts/write-version.mjs'], { stdio: 'inherit' });
    checked(process.execPath, ['./node_modules/next/dist/bin/next', 'build'], { stdio: 'inherit' });
  }
} catch (error) {
  const diagnostics = output.split('\n').filter(line => /^\s*(?:[✓○]|Error:|TypeError:)|(?:GET|POST) /.test(line)).slice(-35);
  if (!browserCompleted && diagnostics.length) {
    console.error(diagnostics.map(line => line.replace(/\/reset\/[a-f\d]{32,}/g, '/reset/[token]')).join('\n'));
  }
  throw error;
} finally {
  try { await browser?.close(); } finally {
    rejectProxy?.close();
    try { await stopApp(); } finally {
      try { await db?.$disconnect(); } finally {
        if (postgres) checked(pg('pg_ctl'), ['-D', cluster, '-m', 'fast', '-w', 'stop']);
        rmSync(runtime, { recursive: true, force: true });
      }
    }
  }
}
