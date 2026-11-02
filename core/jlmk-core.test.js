const test = require('node:test');
const assert = require('node:assert/strict');
const JLMK = require('./jlmk-core');

const day = (n) => new Date(Date.UTC(2026, 0, 1 + n));

test('classify: English application with CV attachment', () => {
  const r = JLMK.classify({
    from: 'John Smith <john@gmail.com>',
    subject: 'Application for Frontend Developer position',
    body: 'Dear team, I am writing to apply for the role. Please find attached my CV.',
    attachments: ['John_Smith_CV.pdf'],
  });
  assert.equal(r.isApplication, true);
  assert.ok(r.score >= 5);
});

test('classify: Turkish application', () => {
  const r = JLMK.classify({
    from: 'Ayşe Yılmaz <ayse@hotmail.com>',
    subject: 'İş Başvurusu',
    body: 'Merhaba, ilanınızdaki pozisyona başvurmak istiyorum. Özgeçmişim ektedir.',
    attachments: ['ozgecmis.pdf'],
  });
  assert.equal(r.isApplication, true);
});

test('classify: invoice with PDF is not an application', () => {
  const r = JLMK.classify({
    from: 'billing@vendor.com',
    subject: 'Invoice #2231',
    body: 'Please find attached the invoice.',
    attachments: ['invoice-2231.pdf'],
  });
  assert.equal(r.isApplication, false);
});

test('classify: rejects automated, job-board, internal and bulk senders', () => {
  const base = { subject: 'Job application CV', body: 'I would like to apply', attachments: ['cv.pdf'] };
  assert.equal(JLMK.classify({ ...base, from: 'noreply@company.com' }).isApplication, false);
  assert.equal(JLMK.classify({ ...base, from: 'jobs-noreply@linkedin.com' }).isApplication, false);
  assert.equal(JLMK.classify({ ...base, from: 'hr@acme.com' }, { ownDomains: ['acme.com'] }).isApplication, false);
  assert.equal(JLMK.classify({ ...base, from: 'a@b.com', isBulk: true }).isApplication, false);
});

test('extractFirstName', () => {
  assert.equal(JLMK.extractFirstName('"Ayşe Yılmaz" <ayse@x.com>'), 'Ayşe');
  assert.equal(JLMK.extractFirstName('SMITH JOHN <j@x.com>'), 'Smith');
  assert.equal(JLMK.extractFirstName('Smith, John <j@x.com>'), 'John');
  assert.equal(JLMK.extractFirstName('j@x.com'), '');
  assert.equal(JLMK.extractFirstName('j@x.com <j@x.com>'), '');
});

test('extractPosition', () => {
  assert.equal(JLMK.extractPosition('Application for Frontend Developer position'), 'Frontend Developer');
  assert.equal(JLMK.extractPosition('Re: Applying for the Data Analyst role'), 'Data Analyst');
  assert.equal(JLMK.extractPosition('Muhasebe Uzmanı pozisyonu için başvuru'), 'Muhasebe Uzmanı');
  assert.equal(JLMK.extractPosition('Başvuru - Satış Temsilcisi'), 'Satış Temsilcisi');
  assert.equal(JLMK.extractPosition('My CV'), '');
});

test('detectLanguage', () => {
  assert.equal(JLMK.detectLanguage('Merhaba, pozisyon için başvuru yapıyorum. Saygılarımla'), 'tr');
  assert.equal(JLMK.detectLanguage('Dear team, attached is my application for the position.'), 'en');
  assert.equal(JLMK.detectLanguage('123', 'tr'), 'tr');
});

test('decide: waits until waitDays have passed', () => {
  const t = { receivedAt: day(0), lastCandidateAt: day(0), statuses: [], notifiedStatuses: [], skip: false };
  assert.equal(JLMK.decide(t, day(3)).action, 'none');
  const d = JLMK.decide(t, day(7));
  assert.equal(d.action, 'reply');
  assert.equal(d.status, 'Received');
});

test('decide: respects custom waitDays', () => {
  const t = { receivedAt: day(0), statuses: [], notifiedStatuses: [], skip: false };
  assert.equal(JLMK.decide(t, day(7), { waitDays: 10 }).action, 'none');
  assert.equal(JLMK.decide(t, day(10), { waitDays: 10 }).action, 'reply');
});

test('decide: does nothing if a human already replied', () => {
  const t = { receivedAt: day(0), lastCandidateAt: day(0), lastOwnReplyAt: day(2), statuses: [], notifiedStatuses: [], skip: false };
  assert.equal(JLMK.decide(t, day(10)).action, 'none');
});

test('decide: candidate wrote again after our reply -> still eligible', () => {
  const t = { receivedAt: day(0), lastCandidateAt: day(5), lastOwnReplyAt: day(2), statuses: [], notifiedStatuses: [], skip: false };
  assert.equal(JLMK.decide(t, day(10)).action, 'reply');
});

test('decide: status label is sent immediately and only once', () => {
  const t = { receivedAt: day(0), statuses: ['Rejected'], notifiedStatuses: [], skip: false };
  const d = JLMK.decide(t, day(1));
  assert.equal(d.action, 'reply');
  assert.equal(d.status, 'Rejected');
  assert.equal(JLMK.decide({ ...t, notifiedStatuses: ['Rejected'] }, day(2)).action, 'none');
});

test('decide: status upgrade after Received notice is still sent', () => {
  const t = { receivedAt: day(0), statuses: ['PositionFilled'], notifiedStatuses: ['Received'], skip: false };
  assert.equal(JLMK.decide(t, day(20)).status, 'PositionFilled');
});

test('decide: Received is not sent twice, Skip and lookback honoured', () => {
  const base = { receivedAt: day(0), statuses: [], skip: false };
  assert.equal(JLMK.decide({ ...base, notifiedStatuses: ['Received'] }, day(30)).action, 'none');
  assert.equal(JLMK.decide({ ...base, notifiedStatuses: [], skip: true }, day(30)).action, 'none');
  assert.equal(JLMK.decide({ ...base, notifiedStatuses: [] }, day(90)).action, 'none');
});

test('render: Turkish with name, position and privacy note', () => {
  const body = JLMK.render('Received', { name: 'Ayşe', position: 'Muhasebe Uzmanı', language: 'tr' },
    { companyName: 'Acme', senderName: 'İK Ekibi' });
  assert.match(body, /^Merhaba Ayşe,/);
  assert.match(body, /Muhasebe Uzmanı pozisyonu için başvurunuz/);
  assert.match(body, /KVKK/);
  assert.match(body, /Saygılarımızla,\nİK Ekibi\nAcme/);
  assert.doesNotMatch(body, /\{\{/);
});

test('render: English without name/position, no privacy note', () => {
  const body = JLMK.render('Rejected', { language: 'en' }, { includePrivacyNote: false });
  assert.match(body, /^Hello,/);
  assert.match(body, /Thank you for your application and/);
  assert.doesNotMatch(body, /stored only/);
  assert.doesNotMatch(body, /\{\{/);
});

test('render: Turkish without position is capitalised', () => {
  const body = JLMK.render('Pool', { language: 'tr' });
  assert.match(body, /\n\nBaşvurunuz için teşekkür/);
});

test('render: all statuses in both languages produce clean text', () => {
  for (const lang of ['en', 'tr']) {
    for (const st of Object.values(JLMK.STATUS)) {
      const body = JLMK.render(st, { name: 'X', position: 'Y', language: lang });
      assert.doesNotMatch(body, /\{\{|undefined/, `${lang}/${st}`);
    }
  }
});

test('render: custom template override', () => {
  const body = JLMK.render('Received', { language: 'en' }, {}, { en: { Received: 'Custom text for {{company}}.' } });
  assert.match(body, /Custom text for our company\./);
});
