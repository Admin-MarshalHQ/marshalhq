import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { devices } from 'playwright';

export const people = {
  founder: { email: 'founder@example.invalid' },
  manager: { email: 'manager@example.invalid', name: 'QA Morgan', phone: '+447700900101', role: 'MANAGER' },
  marshals: [
    { email: 'alex@example.invalid', name: 'QA Alex', phone: '+447700900102', role: 'MARSHAL' },
    { email: 'bryn@example.invalid', name: 'QA Bryn', phone: '+447700900103', role: 'MARSHAL' },
    { email: 'casey@example.invalid', name: 'QA Casey', phone: '+447700900104', role: 'MARSHAL' },
  ],
};
const initialPassword = 'Setru-local-rehearsal-1';
const changedPassword = 'Setru-local-rehearsal-2';
const field = (page, name) => page.locator(`[name="${name}"]`);
const button = (page, name) => page.getByRole('button', { name, exact: true });
const text = (page, value) => page.getByText(value).filter({ visible: true }).first();
const shown = (page, value) => text(page, value).waitFor({ state: 'visible' });
const main = page => page.getByRole('main');
const absent = async (where, value) => assert(!(await where.textContent()).includes(value), `Unexpected visible text: ${value}`);
const phone = (page, person) => page.locator(`a[href="tel:${person.phone}"]`);
const noContact = async (page, person) => {
  assert.equal(await phone(page, person).count(), 0, `Unexpected phone link for ${person.name}`);
  await absent(main(page), person.email);
  const copy = (await main(page).textContent()).replace(/[\s().-]/g, '');
  assert(!copy.includes(person.phone) && !copy.includes(`0${person.phone.slice(3)}`), `Unexpected phone text for ${person.name}`);
};
const contact = async (page, person) => {
  await phone(page, person).waitFor({ state: 'visible' });
  assert.equal(await phone(page, person).count(), 1);
  await shown(main(page), person.email);
};
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const date = offset => new Date(Date.parse(today()) + offset * 86400000);
const iso = day => day.toISOString().slice(0, 10);
const displayDate = day => day.toLocaleDateString('en-GB', { timeZone: 'Europe/London', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const wrap = offset => `Final wrap ${displayDate(date(offset))} at 06:00`;
const section = label => console.log(`PASS · ${label}`);

export async function rehearse({ browser, base, expires, db, mail, restartPaused }) {
  const newPage = async () => {
    const { defaultBrowserType: _, ...mobile } = devices['Pixel 7'];
    const context = await browser.newContext({ ...mobile, locale: 'en-GB', timezoneId: 'Europe/London', serviceWorkers: 'block' });
    await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.setDefaultNavigationTimeout(40000);
    return page;
  };
  const go = async (page, path) => {
    const response = await page.goto(new URL(path, base).href);
    assert(response && response.status() < 500, `Server error on ${path.split('/').slice(0, 3).join('/')}`);
  };
  const at = (page, path) => page.waitForURL(url => url.pathname === path);
  const fill = async (page, values) => {
    for (const [name, value] of Object.entries(values)) await field(page, name).fill(value);
  };
  const confirm = async (page, trigger, action = trigger) => {
    await button(page, trigger).click();
    const dialog = page.getByRole('dialog');
    await button(dialog, action).click();
    await dialog.waitFor({ state: 'hidden' });
  };
  const login = async (page, person, password = initialPassword, next = '') => {
    await go(page, `/login${next ? `?next=${encodeURIComponent(next)}` : ''}`);
    await fill(page, { email: person.email, password });
    await button(page, 'Log in').click();
    await at(page, next || `/${person.role.toLowerCase()}`);
  };
  const logout = async page => {
    await button(page, 'Log out').click();
    await at(page, '/');
  };
  const register = async (page, person, code, role = person.role) => {
    const form = page.locator('form').filter({ has: button(page, 'Create my invited account') });
    await field(form, 'role').selectOption(role);
    await fill(form, { email: person.email, code, password: initialPassword,
      ...(role === 'MANAGER' ? { companyName: 'QA Direct Hirer', displayName: person.name } : {}) });
    await field(form, 'agreeTerms').check();
    await field(form, 'receiveNotice').check();
    await button(form, 'Create my invited account').click();
  };
  const join = async (page, person, checkRole = false) => {
    await go(page, '/pilot/join');
    const request = page.locator('form').filter({ has: button(page, 'Email me a registration code') });
    await fill(request, { email: person.email });
    await button(request, 'Email me a registration code').click();
    const message = await mail.get(person.email, 'Your private Setru registration code');
    assert(message.body.includes(`invited ${person.role.toLowerCase()} account`));
    const code = message.body.match(/\b[a-f\d]{32}\b/)?.[0];
    assert(code, 'Registration mail has no code');
    if (checkRole) {
      await register(page, person, code, 'MARSHAL');
      await shown(page, /Check your invitation address, role and code/);
    }
    await register(page, person, code);
    await at(page, '/login');
    await mail.get(person.email, 'Your Setru pilot terms and privacy notice');
    if (checkRole) {
      await go(page, '/pilot/join');
      await register(page, { ...person, email: 'uninvited@example.invalid' }, code);
      await shown(page, /Check your invitation address, role and code/);
      await register(page, person, code);
      await shown(page, /Check your invitation address, role and code/);
      assert.equal(await db.pilotJoinCode.count({ where: { email: person.email } }), 0);
      assert.equal(await db.user.count({ where: { email: person.email } }), 1);
      assert.equal(await db.user.count({ where: { email: 'uninvited@example.invalid' } }), 0);
    }
    await login(page, person);
    await go(page, '/pilot/agreement');
    await shown(page, /Your current agreement is recorded/);
    const download = page.getByRole('link', { name: 'Download your terms and privacy notice' });
    const href = await download.getAttribute('href');
    const [copy] = await Promise.all([page.waitForEvent('download'), download.click()]);
    const contents = await readFile(await copy.path(), 'utf8');
    for (const expected of ['Private pilot participant terms', 'Private pilot privacy notice', 'Synthetic rehearsal address']) assert(contents.includes(expected));
    await go(page, '/settings');
    await fill(page, { phone: person.phone });
    const [save] = await Promise.all([page.waitForResponse(response => response.request().method() === 'POST' && response.url().endsWith('/settings')), button(page, 'Save phone').click()]);
    assert((await save.finished()) === null);
    assert.equal((await db.user.findUniqueOrThrow({ where: { email: person.email } })).phone, person.phone);
    return href;
  };
  const [manager, alex, bryn, casey, founder, visitor] = await Promise.all(Array.from({ length: 6 }, newPage));
  const [a, b, c] = people.marshals;
  await go(visitor, '/pilot/join');
  await field(visitor, 'email').first().fill('uninvited@example.invalid');
  await button(visitor, 'Email me a registration code').click();
  await shown(visitor, /If this address is invited/);
  assert(!mail.all().some(message => message.to === 'uninvited@example.invalid'));
  const agreement = await join(manager, people.manager, true);
  for (const [page, person] of [[alex, a], [bryn, b], [casey, c]]) {
    await join(page, person);
    await go(page, '/marshal/profile/edit');
    await fill(page, { fullName: person.name, baseLocation: 'London', travelRadiusMiles: '25', experienceSummary: 'Synthetic location marshal with unit base and pedestrian liaison experience.' });
    await button(page, 'Create profile').click();
    await at(page, '/marshal/profile');
    await shown(main(page), person.name);
  }
  const inaccessible = await alex.request.get(`${base}${agreement}`);
  assert.equal(inaccessible.status(), 404);
  for (const [page, path, denied] of [[manager, '/marshal/history', 'Your record'], [alex, '/manager', 'Production dashboard'], [casey, '/founder/support', 'Support & privacy requests'], [visitor, '/marshal/history', 'Your record']]) {
    await go(page, path);
    await page.waitForURL(url => url.pathname !== path, { timeout: 10000 });
    await absent(main(page), denied);
  }
  await go(casey, '/marshal');
  await at(casey, '/marshal');
  await logout(manager);
  await login(manager, people.manager);
  const oldSession = await newPage();
  await login(oldSession, a);
  await logout(alex);
  await go(alex, '/forgot');
  await fill(alex, { email: a.email });
  await alex.locator('main form button[type=submit]').click();
  await at(alex, '/forgot/sent');
  const resetMail = await mail.get(a.email, 'Reset your Setru password');
  const reset = resetMail.body.match(/http:\/\/localhost:\d+\/reset\/[a-f\d]{64}/)?.[0];
  assert(reset && new URL(reset).origin === base, 'Reset mail must refer to this isolated app');
  await go(alex, reset);
  await fill(alex, { password: changedPassword });
  await button(alex, 'Set new password').click();
  await at(alex, '/login');
  await go(alex, reset);
  await at(alex, '/reset/expired');
  await go(oldSession, '/marshal');
  await at(oldSession, '/login');
  await login(alex, a, changedPassword);

  await go(founder, '/founder/shifts');
  await at(founder, '/login/founder');
  await fill(founder, { email: people.founder.email });
  await button(founder, 'Email me a code').click();
  const founderMessage = await mail.get(people.founder.email, 'Your Setru founder login code');
  const founderCode = founderMessage.body.match(/\b\d{8}\b/)?.[0];
  assert(founderCode, 'Founder mail has no passcode');
  await fill(founder, { code: founderCode });
  await button(founder, 'Log in').click();
  await at(founder, '/founder/shifts');
  section('Role-bound, one-use admission, retained copy, password reset and session invalidation');

  const showShift = (page, id) => go(page, `/manager/shifts/${id}`);
  const booking = (page, id) => go(page, `/manager/shifts/${id}/booking`);
  const application = (page, id) => go(page, `/marshal/applications/${id}`);
  const details = (page, id, app) => go(page, `/manager/shifts/${id}/applicants/${app}`);
  const createAndBook = async ({ name, overnight, applicants, verifyClearance }) => {
    await go(manager, '/manager/shifts/new');
    await fill(manager, { productionName: name, location: 'Synthetic unit base, London', startDate: iso(date(3)), endDate: iso(date(overnight ? 5 : 3)),
      dailyStartTime: overnight ? '20:00' : '08:00', dailyEndTime: overnight ? '06:00' : '16:00',
      marshalsNeeded: '2', rate: '17.50', duties: 'Guide pedestrians around the signed unit base, report concerns to the supervisor.',
      engagementTerms: 'Synthetic direct hire. Paid hours at the stated rate, breaks agreed on site, weekly payment, no overtime or expenses assumed. Follow the on-site induction and cancellation procedure.' });
    if (overnight) await shown(manager, wrap(6));
    await button(manager, 'Save draft').click();
    await manager.waitForURL(url => /^\/manager\/shifts\/[^/]+$/.test(url.pathname) && url.pathname !== '/manager/shifts/new');
    const id = new URL(manager.url()).pathname.split('/').at(-1);
    if (verifyClearance) {
      await go(alex, `/marshal/shifts/${id}`);
      await absent(main(alex), name);
      await confirm(manager, 'Publish');
      await shown(manager, /Publication is held until Setru checks/);
    }
    await go(founder, `/founder/shifts/${id}`);
    await fill(founder, { evidenceRef: 'QA-ISOLATED', expiresAt: expires });
    for (const [, person] of applicants) {
      const choices = founder.getByRole('group', { name: new RegExp(person.name) });
      for (const label of ['May see advert', 'May submit named application', 'May be booked']) await choices.getByLabel(label).check();
    }
    await button(founder, 'Record checked clearances').click();
    await shown(founder, 'Clearances recorded.');
    await showShift(manager, id);
    await confirm(manager, 'Publish');
    await shown(main(manager), 'Open');
    if (overnight) {
      await go(casey, `/marshal/shifts/${id}`);
      await absent(main(casey), name);
    }
    const apps = [];
    for (const [page] of applicants) {
      await go(page, '/marshal/shifts');
      await page.getByRole('link').filter({ hasText: name }).first().click();
      await at(page, `/marshal/shifts/${id}`);
      if (overnight) await shown(page, wrap(6));
      await noContact(page, people.manager);
      await button(page, 'Apply for this shift').click();
      await page.waitForURL(url => url.searchParams.get('applied') === '1');
      await go(page, '/marshal/applications');
      const link = page.locator('a[href^="/marshal/applications/"]').filter({ hasText: name });
      const href = await link.getAttribute('href');
      assert.match(href, /^\/marshal\/applications\//);
      const appId = href.split('/').at(-1);
      await application(page, appId);
      await noContact(page, people.manager);
      apps.push(appId);
    }
    const applicantMail = await mail.get(people.manager.email, `New applicant: ${name}`);
    for (const [, person] of applicants) assert(!applicantMail.body.includes(person.name) && !applicantMail.body.includes(person.email));
    await details(manager, id, apps[0]);
    await noContact(manager, a);
    await confirm(manager, 'Accept and book this marshal', 'Accept and book');
    await at(manager, `/manager/shifts/${id}/booking`);
    await contact(manager, a);
    await noContact(manager, b);
    await application(alex, apps[0]);
    await contact(alex, people.manager);
    await noContact(alex, b);
    await application(bryn, apps[1]);
    await noContact(bryn, people.manager);
    if (verifyClearance) {
      await showShift(manager, id);
      await shown(manager, '1/2 booked');
      await shown(main(manager), applicants[2][1].name);
    }
    await details(manager, id, apps[1]);
    await confirm(manager, 'Accept and book this marshal', 'Accept and book');
    await at(manager, `/manager/shifts/${id}/booking`);
    await contact(manager, b);
    await showShift(manager, id);
    await shown(main(manager), 'Filled');
    for (const person of [a, b]) await mail.get(person.email, `You’re booked: ${name}`);
    return { id, apps, name };
  };

  const future = await createAndBook({ name: 'QA Future Day', applicants: [[alex, a], [bryn, b], [casey, c]], verifyClearance: true });
  await application(casey, future.apps[2]);
  await shown(main(casey), 'Shift filled');
  assert.equal((await db.application.findUniqueOrThrow({ where: { id: future.apps[2] } })).status, 'APPLIED');
  await noContact(casey, people.manager);
  await details(manager, future.id, future.apps[2]);
  await confirm(manager, 'Reject', 'Reject applicant');
  await application(casey, future.apps[2]);
  await shown(main(casey), /Not selected|Rejected/);
  await noContact(casey, people.manager);
  await mail.get(c.email, `Not selected: ${future.name}`);
  await application(alex, future.apps[1]);
  await absent(main(alex), future.name);
  await noContact(alex, people.manager);
  await application(alex, future.apps[0]);
  await confirm(alex, 'Drop out');
  await at(alex, '/marshal/applications');
  await application(alex, future.apps[0]);
  await noContact(alex, people.manager);
  await booking(manager, future.id);
  await noContact(manager, a);
  await contact(manager, b);
  await mail.get(people.manager.email, `Accepted marshal withdrew: ${future.name}`);
  await showShift(manager, future.id);
  await shown(main(manager), 'Open');
  await confirm(manager, 'Stop recruitment');
  await application(bryn, future.apps[1]);
  await contact(bryn, people.manager);
  await button(bryn, 'Drop out').click();
  const stoppedDialog = bryn.getByRole('dialog');
  await absent(stoppedDialog, 'the shift will reopen');
  await shown(stoppedDialog, 'Recruitment will stay closed.');
  await button(stoppedDialog, 'Cancel').click();
  await confirm(manager, 'Cancel shift');
  await shown(main(manager), 'Closed');
  await application(bryn, future.apps[1]);
  await noContact(bryn, people.manager);
  await booking(manager, future.id);
  await noContact(manager, b);
  await mail.get(b.email, `Shift cancelled: ${future.name}`);
  await go(founder, `/founder/shifts/${future.id}`);
  await button(founder, 'Hold all new activity').click();
  await shown(founder, 'New activity is held.');
  section('Cleared advert, individual selection and capacity, reserve rejection, withdrawal and cancellation contacts');

  const night = await createAndBook({ name: 'QA Overnight Run', overnight: true, applicants: [[alex, a], [bryn, b]] });
  for (const page of [alex, bryn]) {
    await go(page, '/marshal/availability');
    await shown(page, wrap(6));
  }
  await exerciseElapsed({ db, manager, alex, bryn, casey, founder, visitor, night, mail, restartPaused, go, at, showShift, booking, application, fill, login, logout });
}

async function exerciseElapsed({ db, manager, alex, bryn, casey, founder, visitor, night, mail, restartPaused, go, at, showShift, booking, application, fill, login, logout }) {
  const [a, b, c] = people.marshals;
  const releaseDate = date(1);
  // Advance the fixture from its advertised schedule into a started run. The
  // original versioned brief remains as applied; no further hiring is tested.
  await db.shift.update({ where: { id: night.id }, data: { startDate: date(-1), endDate: releaseDate } });
  await showShift(manager, night.id);
  const release = manager.locator('form').filter({ hasText: `Release remaining calls · ${a.name}` });
  await fill(release, { releaseDate: iso(releaseDate) });
  await button(release, 'Release from selected call').click();
  await shown(manager, /Released from calls starting/);
  const releaseMail = await mail.get(a.email, 'Call release recorded');
  assert(releaseMail.body.includes(`/marshal/applications/${night.apps[0]}`));
  assert(!mail.all().some(message => message.to === b.email && message.subject === 'Call release recorded'));
  for (const [page, appId, end] of [[alex, night.apps[0], 1], [bryn, night.apps[1], 2]]) {
    for (const path of ['/marshal/applications', '/marshal', '/marshal/availability']) {
      await go(page, path);
      await shown(main(page), wrap(end));
      await absent(main(page), wrap(end === 1 ? 2 : 1));
    }
    await application(page, appId);
    await shown(main(page), wrap(end));
  }
  await absent(main(bryn), 'Released from calls starting');
  await contact(bryn, people.manager);
  section('Overnight final wrap and individual future-call release across dashboard, list, detail and availability');

  await restartPaused();
  await go(visitor, '/pilot/join');
  await shown(visitor, 'Private pilot admission is paused');
  assert.equal(await button(visitor, 'Email me a registration code').count(), 0);
  await go(visitor, '/signup');
  assert.equal(await field(visitor, 'password').count(), 0);
  await logout(alex);
  await login(alex, a, changedPassword);
  await go(alex, '/pilot/agreement');
  await alex.getByRole('link', { name: 'Download your terms and privacy notice' }).waitFor({ state: 'visible' });
  await application(bryn, night.apps[1]);
  await contact(bryn, people.manager);

  // Advance the same booking beyond final wrap before recording its actual
  // attendance through the UI. Seed older outcomes only to model legacy data.
  await db.$transaction([
    db.shift.update({ where: { id: night.id }, data: { startDate: date(-5), endDate: date(-3) } }),
    db.application.update({ where: { id: night.apps[0] }, data: { releasedFrom: date(-3) } }),
  ]);
  const managerUser = await db.user.findUniqueOrThrow({ where: { email: people.manager.email } });
  const caseyUser = await db.user.findUniqueOrThrow({ where: { email: c.email } });
  for (const [productionName, attendance] of [['QA Legacy Blank', null], ['QA Unworked Call', 'NOT_WORKED']]) {
    await db.shift.create({ data: { productionName, managerId: managerUser.id, location: 'Synthetic unit base', startDate: date(-12), endDate: date(-12),
      dailyStartTime: '08:00', dailyEndTime: '16:00', rate: 17.5, duties: 'Synthetic legacy record.', status: 'COMPLETED', completedAt: date(-11),
      applications: { create: { marshalId: caseyUser.id, status: 'ACCEPTED', attendance } } } });
  }
  await showShift(manager, night.id);
  const attendance = manager.locator('form').filter({ has: button(manager, 'Save call attendance') });
  for (const [offset, alexValue, brynValue] of [[-5, 'WORKED', 'WORKED'], [-4, 'WORKED', 'UNRESOLVED'], [-3, null, 'WORKED']]) {
    await shown(attendance, displayDate(date(offset)));
    if (alexValue) await field(attendance, night.apps[0]).selectOption(alexValue);
    else assert.equal(await field(attendance, night.apps[0]).count(), 0);
    await field(attendance, night.apps[1]).selectOption(brynValue);
    await button(attendance, 'Save call attendance').click();
  }
  await shown(main(manager), 'Completed');
  await mail.get(a.email, `Attendance update: ${night.name}`);
  await mail.get(b.email, `Attendance update: ${night.name}`);
  await mail.get(people.founder.email, `Attendance needs review: ${night.name}`);
  const history = async (page, count, ...labels) => {
    await go(page, '/marshal/history');
    for (const label of labels) await shown(main(page), label);
    const total = text(main(page), 'Shifts recorded as worked').locator('..');
    await total.getByText(String(count), { exact: true }).waitFor({ state: 'visible' });
  };
  await history(alex, 0, 'Worked part of the run');
  await absent(main(alex), 'QA Legacy Blank');
  await history(bryn, 0, 'Awaiting founder review');
  await history(casey, 0, 'QA Legacy Blank', 'Individual attendance unconfirmed', 'QA Unworked Call', 'Did not work');
  await absent(main(casey), night.name);
  for (const [page, id] of [[alex, night.apps[0]], [bryn, night.apps[1]]]) {
    await application(page, id);
    assert.equal(await button(page, 'Submit review').count(), 0);
  }
  await booking(manager, night.id);
  assert.equal(await button(manager, 'Submit review').count(), 0);
  section('Worked dates, partial and unresolved attendance, legacy blanks and unworked records without completion credit');

  await go(bryn, '/marshal/history');
  await bryn.getByRole('link', { name: 'Ask for an attendance correction' }).first().click();
  await at(bryn, '/support');
  const supportCase = 'QA private attendance case RUN-104';
  await field(bryn, 'category').selectOption('SHIFT_ISSUE');
  await fill(bryn, { message: supportCase });
  await button(bryn, 'Send request').click();
  await at(bryn, '/support/thanks');
  await mail.get(b.email, 'We received your Setru request');
  const staffMail = await mail.get('support@example.invalid', 'New Setru support request');
  assert(staffMail.body.includes(`${new URL(bryn.url()).origin}/founder/support`));
  assert(!staffMail.body.includes(supportCase) && !staffMail.body.includes(b.email));
  await go(founder, '/founder/support');
  const support = await db.supportRequest.findFirstOrThrow({ where: { message: supportCase } });
  await founder.getByRole('link', { name: 'Open', exact: true }).click();
  await at(founder, `/founder/support/${support.id}`);
  await shown(founder, supportCase);
  await go(alex, `/founder/support/${support.id}`);
  await absent(main(alex), supportCase);

  const reason = 'QA restricted adjudication: matched both call records';
  await go(founder, `/founder/shifts/${night.id}`);
  const correction = founder.locator('form').filter({ hasText: 'Current record: Awaiting founder review' });
  await shown(correction, displayDate(date(-4)));
  await fill(correction, { reason });
  await field(correction, night.apps[1]).selectOption('WORKED');
  await button(correction, 'Save reviewed outcomes').click();
  await correction.waitFor({ state: 'hidden' });
  const correctedMail = await mail.get(people.manager.email, `Attendance update: ${night.name}`);
  assert(!correctedMail.body.includes(reason));
  const changes = await db.attendanceChange.findMany({ where: { outcome: 'WORKED', reason } });
  assert.equal(changes.length, 1);
  assert.equal(changes[0].applicationId, night.apps[1]);
  assert.equal(iso(changes[0].callDate), iso(date(-4)));
  await history(alex, 0, 'Worked part of the run');
  await history(bryn, 1, 'Worked as agreed');
  await absent(main(bryn), reason);
  await application(bryn, night.apps[1]);
  await absent(main(bryn), reason);
  await field(bryn, 'rating').nth(4).locator('..').click();
  await button(bryn, 'Submit review').click();
  await bryn.waitForURL(url => url.searchParams.get('reviewed') === '1');
  await booking(manager, night.id);
  await field(manager, 'rating').nth(4).locator('..').click();
  await button(manager, 'Submit review').click();
  await manager.waitForURL(url => url.searchParams.get('reviewed') === '1');
  await application(alex, night.apps[0]);
  assert.equal(await button(alex, 'Submit review').count(), 0);
  section('Paused admission preserves login, support and private correction; only corrected booking earns two-way reviews');
}
