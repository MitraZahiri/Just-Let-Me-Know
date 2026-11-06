const test = require('node:test');
const assert = require('node:assert/strict');
const JLMK = require('./jlmk-core');
const C = require('./candidate');

const ME = 'mitra@gmail.com';
const day = (n) => new Date(Date.UTC(2026, 9, 1 + n, 9));

const application = (extra = {}) => ({
  from: `Mitra Zahiri <${ME}>`,
  to: 'HR Team <hr@acme.com>',
  subject: 'Application for Data Analyst position',
  body: 'Dear team, I am writing to apply for the Data Analyst position. Please find attached my CV.',
  attachments: ['Mitra_Zahiri_CV.pdf'],
  date: day(0),
  messageId: '<app-1@mail.gmail.com>',
  ...extra,
});
const reply = (body, extra = {}) => ({
  from: 'Jane Doe <jane@acme.com>',
  to: ME,
  subject: 'Re: Application for Data Analyst position',
  body,
  date: day(3),
  ...extra,
});
const track = (messages, now = day(1), settings, followUps) =>
  C.trackThread({ messages, me: [ME], followUps }, now, settings);

// --- outgoing classifier -------------------------------------------------------

test('classifyOutgoing: English application with CV', () => {
  assert.equal(C.classifyOutgoing(application()).isApplication, true);
});

test('classifyOutgoing: Turkish application', () => {
  const r = C.classifyOutgoing(application({
    to: 'ik@aselsan.com.tr',
    subject: 'Yazılım Mühendisi Pozisyonu Başvurusu',
    body: 'Merhaba, ilanınızdaki pozisyona başvurmak istiyorum. Özgeçmişim ektedir.',
    attachments: ['ozgecmis.pdf'],
  }));
  assert.equal(r.isApplication, true);
});

test('classifyOutgoing: application to a recruiter on Gmail still counts', () => {
  const r = C.classifyOutgoing(application({ to: 'Ali Recruiter <ali.recruiter@gmail.com>', subject: 'CV - Data Analyst' }));
  assert.equal(r.isApplication, true);
});

test('classifyOutgoing false positive: asking a friend to check the CV', () => {
  const r = C.classifyOutgoing(application({
    to: 'Deniz <deniz@gmail.com>', subject: 'my CV', body: 'Hey, could you take a look at my CV before I send it?',
  }));
  assert.equal(r.isApplication, false);
});

test('classifyOutgoing false positive: personal mail with a PDF', () => {
  const r = C.classifyOutgoing(application({
    to: 'mom@hotmail.com', subject: 'Biletler', body: 'Uçak biletlerini ekledim.', attachments: ['bilet.pdf'],
  }));
  assert.equal(r.isApplication, false);
});

test('classifyOutgoing false positive: invoice / order mail', () => {
  const r = C.classifyOutgoing(application({
    to: 'billing@client.com', subject: 'Invoice #42 — freelance position work', body: 'Please find the invoice attached.', attachments: ['invoice-42.pdf'],
  }));
  assert.equal(r.isApplication, false);
});

test('classifyOutgoing false positive: newsletter you sent', () => {
  const r = C.classifyOutgoing(application({
    subject: 'Kariyer bülteni: CV ipuçları', body: 'Bu ayın CV ipuçları... Abonelikten çıkmak için tıklayın.', attachments: [],
  }));
  assert.equal(r.isApplication, false);
});

test('classifyOutgoing: rejects mass mail, self, job boards, internal and bulk', () => {
  const many = Array.from({ length: 6 }, (_, i) => `hr${i}@co${i}.com`).join(', ');
  assert.equal(C.classifyOutgoing(application({ to: many })).isApplication, false);
  assert.equal(C.classifyOutgoing(application({ to: ME })).isApplication, false);
  assert.equal(C.classifyOutgoing(application({ to: 'jobs-noreply@linkedin.com' })).isApplication, false);
  assert.equal(C.classifyOutgoing(application({ to: 'boss@mycompany.com' }), { ownDomains: ['mycompany.com'] }).isApplication, false);
  assert.equal(C.classifyOutgoing(application({ isBulk: true })).isApplication, false);
  assert.equal(C.classifyOutgoing(application({ to: '' })).isApplication, false);
});

// --- reply classifier --------------------------------------------------------

test('classifyReply: rejection (EN, TR, polite pool wording)', () => {
  assert.equal(C.classifyReply(reply('Unfortunately we have decided to move forward with other candidates.')).kind, 'rejected');
  assert.equal(C.classifyReply(reply('Maalesef bu aşamada başvurunuzla ilerleyemiyoruz.')).kind, 'rejected');
  assert.equal(C.classifyReply(reply('We will keep your CV on file for future roles.')).kind, 'rejected');
  assert.equal(C.classifyReply(reply('We won\'t be inviting you to interview this time.')).kind, 'rejected');
});

test('classifyReply: interview (EN, TR) but not the "görüşmek üzere" sign-off', () => {
  assert.equal(C.classifyReply(reply('We would like to invite you to an interview. What is your availability next week?')).kind, 'interview');
  assert.equal(C.classifyReply(reply('Sizinle bir görüşme planlamak isteriz, uygun olduğunuz gün nedir?')).kind, 'interview');
  assert.equal(C.classifyReply(reply('Başvurunuz alınmıştır. Görüşmek üzere.')).kind, 'acknowledged');
});

test('classifyReply: acknowledgment and automated ATS mail', () => {
  assert.equal(C.classifyReply(reply('Thank you for applying! We have received your application.')).kind, 'acknowledged');
  const ats = C.classifyReply(reply('Please complete your candidate profile.', { from: 'no-reply@greenhouse.io', isAuto: true }));
  assert.deepEqual(ats, { kind: 'acknowledged', automated: true, explicit: false });
});

test('classifyReply: out-of-office and bounces are not answers', () => {
  assert.equal(C.classifyReply(reply('I am out of the office until Monday.', { subject: 'Automatic reply: Application' })).kind, 'auto');
  assert.equal(C.classifyReply(reply('İzindeyim, 10 Kasım\'da döneceğim.', { subject: 'Otomatik yanıt: Başvuru' })).kind, 'auto');
  assert.equal(C.classifyReply(reply('Address not found', { from: 'mailer-daemon@googlemail.com', subject: 'Delivery Status Notification (Failure)' })).kind, 'bounce');
});

test('classifyReply: words in the quoted application are ignored', () => {
  const body = 'Could you send us your portfolio?\n\nOn Mon, Oct 1, 2026 at 9:00 Mitra wrote:\n> I hope to get an interview.';
  assert.equal(C.classifyReply(reply(body)).kind, 'human');
});

test('classifyReply recognises our own employer templates', () => {
  const ctx = { name: 'Mitra', position: 'Data Analyst' };
  for (const lang of ['en', 'tr']) {
    const r = (status) => C.classifyReply(reply(JLMK.render(status, { ...ctx, language: lang }))).kind;
    assert.equal(r('Rejected'), 'rejected', lang);
    assert.equal(r('PositionFilled'), 'rejected', lang);
    assert.equal(r('Pool'), 'rejected', lang);
    assert.equal(r('Received'), 'acknowledged', lang); // fix1: neutral "it reached us, we'll let you know"
    assert.equal(r('InReview'), 'acknowledged', lang);
  }
});

// --- tracking ------------------------------------------------------------------

test('trackThread: extracts company, position, language; null when no application', () => {
  const app = track([application()]);
  assert.equal(app.company, 'Acme');
  assert.equal(app.position, 'Data Analyst');
  assert.equal(app.recipient, 'hr@acme.com');
  assert.equal(app.language, 'en');
  assert.equal(app.status, 'Sent');
  assert.equal(track([reply('hello', { date: day(0) })]), null);
});

test('trackThread: Sent → NoResponse after waitDays of silence', () => {
  assert.equal(track([application()], day(6)).status, 'Sent');
  assert.equal(track([application()], day(7)).status, 'NoResponse');
  assert.equal(track([application()], day(7), { waitDays: 10 }).status, 'Sent');
});

test('trackThread: Acknowledged → Interview → Rejected, history kept', () => {
  const app = track([
    application(),
    reply('Thank you for applying, we received your application.', { date: day(1), isAuto: true, from: 'no-reply@acme.com' }),
    reply('We would like to invite you to an interview.', { date: day(5) }),
    reply('Unfortunately we decided to move forward with another candidate.', { date: day(12) }),
  ], day(13));
  assert.equal(app.status, 'Rejected');
  assert.deepEqual(app.history.map((h) => h.status), ['Sent', 'Acknowledged', 'Interview', 'Rejected']);
});

test('trackThread: a later acknowledgment does not downgrade an interview', () => {
  const app = track([
    application(),
    reply('Let\'s schedule a call — what is your availability?', { date: day(2) }),
    reply('Thanks, received your documents.', { date: day(3), isAuto: true, from: 'no-reply@acme.com' }),
  ], day(4));
  assert.equal(app.status, 'Interview');
});

test('trackThread: out-of-office does not count as an answer', () => {
  const app = track([application(), reply('I am out of the office.', { subject: 'Out of Office', date: day(1) })], day(8));
  assert.equal(app.status, 'NoResponse');
  assert.equal(app.lastInboundAt, null);
});

test('trackThread: a CV sent later in a thread the company started is tracked from there', () => {
  const app = track([
    reply('Hi Mitra, we saw your profile. Are you open to a Data Analyst role?', { date: day(0), subject: 'Data Analyst role' }),
    application({ date: day(1), subject: 'Re: Data Analyst role' }),
  ], day(2));
  assert.equal(app.appliedAt.getTime(), day(1).getTime());
});

// --- follow-up decision ------------------------------------------------------------

const decide = (messages, now, followUps, settings) => C.decideFollowUp(track(messages, now, settings, followUps), now, settings);

test('decideFollowUp: first reminder after waitDays, only as a draft', () => {
  assert.equal(decide([application()], day(6)).action, 'none');
  const d = decide([application()], day(7));
  assert.deepEqual([d.action, d.kind], ['draft', 'followUp1']);
});

test('decideFollowUp: candidate role with mode=send still only drafts', () => {
  const d = decide([application()], day(7), [], { role: 'candidate', mode: 'send' });
  assert.equal(d.action, 'draft');
  assert.equal(JLMK.deliveryMode({ role: 'candidate', mode: 'send' }), 'draft');
});

test('decideFollowUp: second reminder after followUpGapDays, never a third', () => {
  assert.equal(decide([application()], day(10), [day(7)]).action, 'none');
  const d = decide([application()], day(14), [day(7)]);
  assert.deepEqual([d.action, d.kind], ['draft', 'followUp2']);
  assert.equal(decide([application()], day(40), [day(7), day(14)]).action, 'none');
});

test('decideFollowUp: maxFollowUps can be lowered to 1 or 0', () => {
  assert.equal(decide([application()], day(30), [day(7)], { maxFollowUps: 1 }).action, 'none');
  assert.equal(decide([application()], day(30), [], { maxFollowUps: 0 }).action, 'none');
});

test('decideFollowUp: a manual follow-up resets the clock', () => {
  const mine = application({ date: day(5), subject: 'Re: Application', body: 'Just checking in!', attachments: [], messageId: undefined });
  assert.equal(decide([application(), mine], day(8)).action, 'none');
  assert.equal(decide([application(), mine], day(12)).action, 'draft');
});

test('decideFollowUp: nothing after rejection, interview or a bounce', () => {
  assert.equal(decide([application(), reply('We regret to inform you…')], day(20)).action, 'none');
  assert.equal(decide([application(), reply('Can we schedule an interview?')], day(20)).action, 'none');
  const bounce = reply('Address not found', { from: 'mailer-daemon@googlemail.com', subject: 'Delivery Status Notification (Failure)' });
  assert.match(decide([application(), bounce], day(20)).reason, /bounced/);
});

test('decideFollowUp: when they wrote last it is your turn, not a reminder', () => {
  const d = decide([application(), reply('Could you send your portfolio?', { date: day(2) })], day(20));
  assert.equal(d.action, 'none');
  assert.match(d.reason, /your turn/);
});

test('decideFollowUp: after an automated acknowledgment a reminder is still allowed', () => {
  const ack = reply('We have received your application.', { date: day(1), from: 'no-reply@acme.com', isAuto: true });
  assert.equal(decide([application(), ack], day(8)).action, 'draft');
});

test('decideFollowUp: too old, or applied via a job board', () => {
  assert.equal(decide([application()], day(61)).action, 'none');
  const viaBoard = { source: 'linkedin', recipient: '', followUpCount: 0, appliedAt: day(0), status: 'Sent' };
  assert.match(C.decideFollowUp(viaBoard, day(10)).reason, /linkedin/);
});

// --- texts ---------------------------------------------------------------------------

test('renderFollowUp: Turkish, warm and without blame', () => {
  const app = track([application({
    to: 'ik@aselsan.com.tr', subject: 'Yazılım Mühendisi Pozisyonu Başvurusu',
    body: 'Merhaba, pozisyona başvurmak istiyorum. Özgeçmişim ektedir.', date: new Date(2026, 9, 12),
  })], new Date(2026, 9, 13));
  const body = C.renderFollowUp('followUp1', app, { senderName: 'Mitra Zahiri' });
  assert.match(body, /^Merhaba,/);
  assert.match(body, /12 Ekim tarihinde Yazılım Mühendisi pozisyonu için Aselsan şirketine başvuruda bulunmuştum/);
  assert.match(body, /Saygılarımla,\nMitra Zahiri\n$/);
  assert.doesNotMatch(body, /\{\{|undefined|cevap vermediniz|dönmediniz/);
});

test('renderFollowUp: English uses the recipient name and works without position/company', () => {
  const app = { recipientName: 'Jane', position: '', company: '', appliedAt: new Date(2026, 9, 12), language: 'en' };
  const body = C.renderFollowUp('followUp1', app, {});
  assert.match(body, /^Hello Jane,/);
  assert.match(body, /I applied on October 12 and wanted/);
  const second = C.renderFollowUp('followUp2', app, {});
  assert.match(second, /one last time on my application from October 12/);
  assert.doesNotMatch(body + second, /\{\{|undefined|  /);
});

test('renderFollowUp: every language and kind renders cleanly (skeletons fall back)', () => {
  for (const { code } of JLMK.languages()) {
    for (const kind of ['followUp1', 'followUp2']) {
      const body = C.renderFollowUp(kind, { position: 'X', company: 'Y', appliedAt: day(0), language: code }, {});
      assert.doesNotMatch(body, /\{\{|undefined|null/, `${code}/${kind}`);
    }
  }
});

// --- job boards ----------------------------------------------------------------------

test('parseJobBoardConfirmation: LinkedIn, Kariyer.net, Indeed', () => {
  const li = C.parseJobBoardConfirmation({ from: 'LinkedIn <jobs-noreply@linkedin.com>', subject: 'Mitra, your application was sent to Globex', body: 'You applied for the Data Analyst position at Globex.', date: day(0) });
  assert.deepEqual([li.source, li.company, li.position], ['linkedin', 'Globex', 'Data Analyst']);
  const kn = C.parseJobBoardConfirmation({ from: 'bilgi@kariyer.net', subject: 'Başvurunuz Aselsan firmasına iletildi', body: '', date: day(0) });
  assert.deepEqual([kn.source, kn.company], ['kariyer', 'Aselsan']);
  const ind = C.parseJobBoardConfirmation({ from: 'indeedapply@indeed.com', subject: 'Indeed Application: Backend Developer', body: 'Your application has been submitted.', date: day(0) });
  assert.equal(ind.position, 'Backend Developer');
});

test('parseJobBoardConfirmation false positives: job alerts and non-job-board mail', () => {
  assert.equal(C.parseJobBoardConfirmation({ from: 'jobalerts-noreply@linkedin.com', subject: '30+ new jobs for you: Data Analyst', body: 'Apply now', date: day(0) }), null);
  assert.equal(C.parseJobBoardConfirmation({ from: 'bilgi@kariyer.net', subject: 'Size uygun yeni ilanlar', body: 'Başvurunuz başarıyla…', date: day(0) }), null);
  assert.equal(C.parseJobBoardConfirmation({ from: 'messages-noreply@linkedin.com', subject: 'Globex is hiring', body: '', date: day(0) }), null);
  assert.equal(C.parseJobBoardConfirmation({ from: 'friend@gmail.com', subject: 'Your application was sent to Globex', body: '', date: day(0) }), null);
});

// --- matching replies outside the thread ----------------------------------------------

const apps = [
  { id: 'a', company: 'Acme', position: 'Data Analyst', recipient: 'hr@acme.com', appliedAt: day(0), messageIds: ['<app-1@mail.gmail.com>'] },
  { id: 'b', company: 'Acme', position: 'BI Developer', recipient: 'hr@acme.com', appliedAt: day(2), messageIds: ['<app-2@mail.gmail.com>'] },
  { id: 'c', company: 'Globex', position: 'Data Analyst', recipient: 'jobs@globex.com', appliedAt: day(1) },
];

test('matchReply: by thread headers first', () => {
  const m = C.matchReply({ from: 'x@other.com', inReplyTo: '<app-1@mail.gmail.com>', date: day(5) }, apps);
  assert.deepEqual([m.application.id, m.reason], ['a', 'same thread']);
});

test('matchReply: by sender domain, position breaks the tie, else most recent', () => {
  const byPos = C.matchReply({ from: 'talent@careers.acme.com', subject: 'Your Data Analyst application', body: '', date: day(5) }, apps);
  assert.deepEqual([byPos.application.id, byPos.reason], ['a', 'sender domain']);
  const recent = C.matchReply({ from: 'talent@acme.com', subject: 'Update', body: '', date: day(5) }, apps);
  assert.equal(recent.application.id, 'b');
});

test('matchReply: by company named in an ATS mail', () => {
  const m = C.matchReply({ from: 'no-reply@greenhouse.io', subject: 'Thank you for applying to Globex', body: '', date: day(5) }, apps);
  assert.deepEqual([m.application.id, m.reason], ['c', 'company mentioned']);
});

test('matchReply false positives: unrelated personal mail, and mail older than the application', () => {
  assert.equal(C.matchReply({ from: 'friend@gmail.com', subject: 'Dinner?', body: 'See you at 8', date: day(5) }, apps), null);
  assert.equal(C.matchReply({ from: 'hr@globex.com', subject: 'Newsletter', body: '', date: day(0) }, apps), null);
});

test('fix2: a sent visa application is not a job application', () => {
  const r = C.classifyOutgoing(application({ to: 'vize@konsolosluk.gov.tr', subject: 'Vize başvurusu', body: 'Belgelerim ektedir.', attachments: ['pasaport.pdf'] }));
  assert.equal(r.isApplication, false);
});

test('summarize', () => {
  const s = C.summarize([{ status: 'Sent' }, { status: 'Rejected' }, { status: 'Rejected' }]);
  assert.equal(s.total, 3);
  assert.equal(s.byStatus.Rejected, 2);
  assert.equal(s.byStatus.Interview, 0);
});

// --- stage 2: tracking the whole mailbox ------------------------------------------

test('trackThread: a thread you marked yourself counts even if it does not read like an application', () => {
  const msg = application({ subject: 'Hello', body: 'Nice to meet you at the fair yesterday.', attachments: [] });
  assert.equal(track([msg]), null);
  const app = C.trackThread({ id: 't9', messages: [msg], me: [ME], forced: true }, day(1));
  assert.equal(app.threadId, 't9');
  assert.equal(app.status, C.STATUS.SENT);
});

test('decideFollowUp: no second draft while one is waiting in the conversation', () => {
  const app = C.trackThread({ messages: [application()], me: [ME], draftExists: true }, day(10));
  const d = C.decideFollowUp(app, day(10));
  assert.equal(d.action, 'none');
  assert.equal(d.code, 'draftPending');
});

test('decideFollowUp: every decision carries a code for the UI', () => {
  assert.equal(C.decideFollowUp(track([application()], day(3)), day(3)).code, 'waiting');
  assert.equal(C.decideFollowUp(track([application()], day(8)), day(8)).code, 'due');
  const rejected = track([application(), reply('We regret to inform you that we will not be moving forward.')], day(8));
  assert.equal(C.decideFollowUp(rejected, day(8)).code, 'rejected');
  const theirs = track([application(), reply('Could you send me your portfolio?')], day(12));
  assert.equal(C.decideFollowUp(theirs, day(12)).code, 'theirTurn');
});

test('classifyReply: explicit only when the text says what happened', () => {
  assert.equal(C.classifyReply(reply('We have received your application.')).explicit, true);
  assert.equal(C.classifyReply(reply('Thanks, talk soon.')).explicit, false);
  assert.equal(C.classifyReply(reply('Your invoice is ready', { from: 'billing@acme.com', isAuto: true })).explicit, false);
});

test('followUpTarget: answers the recruiter who wrote, not the original address', () => {
  const msgs = [application(), reply('Thanks, I will pass it on to the team.', { from: 'Jane Doe <jane@acme.com>' })];
  const app = track(msgs, day(20));
  const t = C.followUpTarget(msgs, app, [ME]);
  assert.equal(t.replyTo, msgs[1]);
  assert.equal(t.to, 'jane@acme.com');
  assert.equal(t.name, 'Jane');
});

test('followUpTarget: skips no-reply, out-of-office and job-site senders', () => {
  const msgs = [
    application(),
    reply('We have received your application.', { from: 'Acme Careers <no-reply@acme.com>', isAuto: true }),
    reply('I am currently out of the office until Monday.', { from: 'Jane Doe <jane@acme.com>' }),
    reply('Your application was viewed', { from: 'jobs-noreply@linkedin.com' }),
  ];
  const t = C.followUpTarget(msgs, track(msgs, day(20)), [ME]);
  assert.equal(t.replyTo, null);
  assert.equal(t.to, 'hr@acme.com');
  assert.equal(t.subject, 'Re: Application for Data Analyst position');
});

test('followUpTarget: does not stack "Re:" prefixes (also Turkish "Ynt:")', () => {
  const msgs = [application({ subject: 'Ynt: Başvuru - Veri Analisti' })];
  const app = C.trackThread({ messages: msgs, me: [ME], forced: true }, day(20));
  assert.equal(C.followUpTarget(msgs, app, [ME]).subject, 'Ynt: Başvuru - Veri Analisti');
});

// reconcile: answers that arrive outside the application thread
let inboxId = 0;
const sentThread = (extra = {}) => ({ id: 'sent-1', messages: [application()], ...extra });
const inboxMsg = (extra) => ({ to: ME, date: day(5), threadId: 'in-' + (++inboxId), ...extra });
const reconcile = (inbox, now = day(20), threads = [sentThread()]) => C.reconcile({ threads, inbox, me: [ME] }, now);

test('reconcile: an ATS rejection from another thread closes the application — no follow-up', () => {
  const apps = reconcile([inboxMsg({
    from: 'Acme Careers <no-reply@acme.com>', isAuto: true,
    subject: 'Your application to Acme', body: 'Unfortunately we have decided to move forward with other candidates.',
  })]);
  assert.equal(apps.length, 1);
  assert.equal(apps[0].status, C.STATUS.REJECTED);
  assert.equal(apps[0].decision.action, 'none');
});

test('reconcile: an interview invitation from another thread is matched', () => {
  const apps = reconcile([inboxMsg({
    from: 'Jane Doe <jane@acme.com>', subject: 'Data Analyst — next steps',
    body: 'We would like to invite you to an interview. What is your availability next week?',
  })]);
  assert.equal(apps[0].status, C.STATUS.INTERVIEW);
});

test('reconcile false positive: a newsletter from the same company does not change the status', () => {
  const apps = reconcile([inboxMsg({
    from: 'Acme <news@acme.com>', isBulk: true,
    subject: 'Acme monthly: thank you for your interest', body: 'Thank you for your interest in Acme. Unsubscribe here.',
  })]);
  assert.equal(apps[0].status, C.STATUS.NO_RESPONSE);
  assert.equal(apps[0].decision.code, 'due');
});

test('reconcile false positive: an invoice from the same company does not change the status', () => {
  const apps = reconcile([inboxMsg({
    from: 'Acme Billing <billing@acme.com>', isAuto: true,
    subject: 'Your Acme invoice #4411', body: 'Your invoice for October is attached.',
  })]);
  assert.equal(apps[0].status, C.STATUS.NO_RESPONSE);
});

test('reconcile false positive: a job alert mentioning the company is not an answer', () => {
  const apps = reconcile([inboxMsg({
    from: 'LinkedIn <jobalerts-noreply@linkedin.com>', isBulk: true,
    subject: 'Acme is hiring: Data Analyst', body: 'New jobs for you. Acme is hiring.',
  })]);
  assert.equal(apps.length, 1);
  assert.equal(apps[0].status, C.STATUS.NO_RESPONSE);
});

test('reconcile false positive: personal mail that mentions the company is not an answer', () => {
  const apps = reconcile([inboxMsg({
    from: 'Deniz <deniz@gmail.com>', subject: 'Acme?', body: 'Did you hear back from Acme yet? Fingers crossed!',
  })]);
  assert.equal(apps[0].status, C.STATUS.NO_RESPONSE);
});

test('reconcile: a job-site confirmation becomes an application without follow-ups', () => {
  const apps = reconcile([inboxMsg({
    from: 'LinkedIn <jobs-noreply@linkedin.com>', subject: 'Your application was sent to Globex',
    body: 'You applied for the Product Designer position.', date: day(2),
  })], day(20), []);
  assert.equal(apps.length, 1);
  assert.equal(apps[0].source, 'linkedin');
  assert.equal(apps[0].company, 'Globex');
  assert.equal(apps[0].status, C.STATUS.NO_RESPONSE);
  assert.equal(apps[0].decision.code, 'noAddress');
});

test('reconcile: answers inside an application thread are not counted twice', () => {
  const answer = reply('We have received your application.', { threadId: 'sent-1' });
  const apps = reconcile([answer], day(20), [sentThread({ messages: [application(), answer] })]);
  assert.equal(apps.length, 1);
  assert.equal(apps[0].status, C.STATUS.ACKNOWLEDGED);
});

test('reconcile: the follow-up greets the person it is addressed to', () => {
  const msgs = [
    application(),
    reply('Thanks, I will pass it on.', { from: 'Jane Doe <jane@acme.com>' }),
    { from: ME, to: 'jane@acme.com', subject: 'Re: Application for Data Analyst position', body: 'Thank you, Jane!', date: day(4) },
  ];
  const [app] = reconcile([], day(30), [{ id: 's', messages: msgs }]);
  assert.equal(app.decision.action, 'draft');
  assert.equal(app.target.to, 'jane@acme.com');
  assert.match(C.renderFollowUp(app.decision.kind, { ...app, recipientName: app.target.name }), /^Hello Jane,/);
});

// export
test('exportRows: Turkish headers and status names, newest first', () => {
  const older = track([application({ date: day(0) })], day(20));
  const newer = track([application({ date: day(5), to: 'ik@globex.com.tr', messageId: '<2>' })], day(20));
  [older, newer].forEach((a) => { a.decision = C.decideFollowUp(a, day(20)); });
  const rows = C.exportRows([older, newer], { defaultLanguage: 'tr' });
  assert.deepEqual(rows[0].slice(0, 5), ['Şirket', 'Pozisyon', 'Başvuru tarihi', 'Gönderilen adres / site', 'Durum']);
  assert.equal(rows[1][3], 'ik@globex.com.tr');
  assert.equal(rows[1][4], 'Henüz yanıt yok');
  assert.equal(rows[1][7], 'Hatırlatma taslağı zamanı');
  assert.equal(rows.length, 3);
});

test('exportRows: German skeleton falls back to English', () => {
  const rows = C.exportRows([], { defaultLanguage: 'de' });
  assert.equal(rows[0][0], 'Company');
});

test('safeCell: text that Sheets would run as a formula is escaped', () => {
  assert.equal(C.safeCell('=HYPERLINK("http://x")'), '\'=HYPERLINK("http://x")');
  assert.equal(C.safeCell('+90 555'), "'+90 555");
  assert.equal(C.safeCell('Acme'), 'Acme');
  assert.equal(C.safeCell(2), 2);
});
