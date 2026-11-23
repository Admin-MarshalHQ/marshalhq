import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { authEmailPreview, passwordResetEmail, verificationEmail } from "../lib/auth-emails";

test("auth email previews have no actionable button, token or auth endpoint", () => {
  for (const kind of ["verification", "reset"] as const) {
    const { html, body } = authEmailPreview(kind);
    assert.deepEqual(
      [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]),
      ["https://setru.co.uk/support", "https://setru.co.uk/privacy"],
    );
    for (const content of [html, body]) {
      assert.match(content, /Design preview only/);
      assert.doesNotMatch(content, /\/(verify-email|reset)\//);
    }
  }
});

test("HTML attributes escape special characters while plain text keeps the original URL", () => {
  const url = 'https://setru.example/path?ref=a&example="quoted"';
  for (const template of [verificationEmail, passwordResetEmail]) {
    const { html, body } = template(url);
    assert(html.includes('href="https://setru.example/path?ref=a&amp;example=&quot;quoted&quot;"'));
    assert(body.includes(url));
    assert(!html.includes("Design preview only"));
  }
});

test("real verification and reset entry points retain token destinations and lifetimes in both email formats", async (t) => {
  const keys = ["RESEND_API_KEY", "APP_BASE_URL", "EMAIL_FROM"] as const;
  const saved = keys.map((key) => process.env[key]);
  const savedPrisma = globalThis.__prisma;
  t.after(() => {
    keys.forEach((key, i) => {
      const value = saved[i];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    });
    globalThis.__prisma = savedPrisma;
  });
  process.env.RESEND_API_KEY = "test-only";
  process.env.APP_BASE_URL = "https://setru.example/";
  process.env.EMAIL_FROM = "configured@example.com";

  type Token = { userId: string; tokenHash: string; expiresAt: Date };
  const savedTokens: Array<{ kind: "verify-email" | "reset"; data: Token }> = [];
  const requested = "person@example.com";
  globalThis.__prisma = {
    user: { findUnique: async ({ where: { email } }: { where: { email: string } }) =>
      email === requested ? { id: "test-user", email } : null },
    emailVerificationToken: {
      create: async ({ data }: { data: Token }) => {
        savedTokens.push({ kind: "verify-email", data });
        return { id: "verification-id" };
      },
    },
    passwordResetToken: {
      create: async ({ data }: { data: Token }) => {
        savedTokens.push({ kind: "reset", data });
        return { id: "reset-id" };
      },
    },
  } as unknown as typeof savedPrisma;

  const sent: Array<Record<string, string>> = [];
  t.mock.method(globalThis, "fetch", async (url: string, options: RequestInit) => {
    assert.equal(url, "https://api.resend.com/emails");
    sent.push(JSON.parse(String(options.body)));
    return new Response(null, { status: 200 });
  });

  const { issueEmailVerification } = await import("../lib/email-verification");
  const { requestPasswordResetAction } = await import("../app/actions/recovery");
  const started = Date.now();
  assert.deepEqual(await issueEmailVerification("test-user", requested), { ok: true });
  const resetForm = new FormData();
  resetForm.set("email", requested);
  await assert.rejects(requestPasswordResetAction(null, resetForm), (error: Error & { digest?: string }) =>
    error.message === "NEXT_REDIRECT" && !!error.digest?.includes(";/forgot/sent;"),
  );

  const unknownForm = new FormData();
  unknownForm.set("email", "unknown@example.com");
  await assert.rejects(requestPasswordResetAction(null, unknownForm), (error: Error & { digest?: string }) =>
    error.message === "NEXT_REDIRECT" && !!error.digest?.includes(";/forgot/sent;"),
  );

  assert.equal(savedTokens.length, 2);
  assert.equal(sent.length, 2);
  for (const [i, { kind, data }] of savedTokens.entries()) {
    const message = sent[i];
    const isVerification = kind === "verify-email";
    const ttl = isVerification ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000;
    const urlPattern = new RegExp(`https://setru\\.example/${kind}/([a-f0-9]{64})`);
    const matched = message.text.match(urlPattern);
    assert(matched);
    assert(message.html.includes(`href="${matched[0]}"`));
    assert.equal(data.tokenHash, createHash("sha256").update(matched[1]).digest("hex"));
    assert.equal(data.userId, "test-user");
    assert(data.expiresAt.getTime() >= started + ttl && data.expiresAt.getTime() <= Date.now() + ttl);
    assert.match(message.html, isVerification ? /24 hours/ : /1 hour/);
    assert.match(message.text, isVerification ? /24 hours/ : /1 hour/);
    assert.equal(message.to, requested);
    assert.equal(message.from, "Setru <configured@example.com>");
    assert.equal(message.subject, isVerification ? "Verify your Setru email" : "Reset your Setru password");
  }
});
