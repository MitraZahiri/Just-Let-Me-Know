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
  const body = JLMK.render('Received', { language: 'en' }, {}, { en: { employer: { Received: 'Custom text for {{company}}.' } } });
  assert.match(body, /Custom text for our company\./);
});

test('render: an English override also applies to a skeleton language', () => {
  const body = JLMK.render('Received', { language: 'de' }, {}, { en: { employer: { Received: 'Custom.' } } });
  assert.match(body, /Custom\./);
});

// --- false positives (employer side, incoming) ------------------------------

test('classify false positive: newsletter about careers', () => {
  const r = JLMK.classify({
    from: 'Career Weekly <hello@careerweekly.io>',
    subject: 'Your weekly career digest: 10 CV tips',
    body: 'How to write a resume that stands out... Click here to unsubscribe.',
    attachments: [],
  });
  assert.equal(r.isApplication, false);
});

test('classify false positive: invoice even with a "position" word', () => {
  const r = JLMK.classify({
    from: 'muhasebe@tedarikci.com.tr',
    subject: 'Fatura - Ekim dönemi pozisyon bazlı hizmet bedeli',
    body: 'Ekte faturanızı bulabilirsiniz.',
    attachments: ['fatura_ekim.pdf'],
  });
  assert.equal(r.isApplication, false);
});

test('classify false positive: personal mail asking to check a CV', () => {
  const r = JLMK.classify({
    from: 'Deniz <deniz@gmail.com>',
    subject: 'CV',
    body: 'Selam, CV\'me bir bakar mısın? Fikrini merak ediyorum.',
    attachments: ['Deniz_CV.pdf'],
  });
  assert.equal(r.isApplication, false);
});

test('classify false positive: personal mail with a PDF', () => {
  const r = JLMK.classify({
    from: 'Mom <mom@hotmail.com>',
    subject: 'Tatil planı',
    body: 'Uçak biletlerini ekledim.',
    attachments: ['bilet.pdf'],
  });
  assert.equal(r.isApplication, false);
});

// --- roles, delivery, texts --------------------------------------------------

test('deliveryMode: draft unless employer explicitly chose send', () => {
  assert.equal(JLMK.deliveryMode({}), 'draft');
  assert.equal(JLMK.deliveryMode({ mode: 'send' }), 'send');
  assert.equal(JLMK.deliveryMode({ mode: 'SEND' }), 'draft');
  assert.equal(JLMK.deliveryMode({ role: 'candidate', mode: 'send' }), 'draft');
});

test('withDefaults: role and maxFollowUps are clamped', () => {
  assert.equal(JLMK.withDefaults({}).role, 'employer');
  assert.equal(JLMK.withDefaults({ role: 'nonsense' }).role, 'employer');
  assert.equal(JLMK.withDefaults({ role: 'candidate' }).role, 'candidate');
  assert.equal(JLMK.withDefaults({ maxFollowUps: 9 }).maxFollowUps, 2);
  assert.equal(JLMK.withDefaults({ maxFollowUps: -1 }).maxFollowUps, 0);
});

test('fill: sections and inverted sections', () => {
  assert.equal(JLMK.fill('a{{#x}} [{{x}}]{{/x}}b', { x: 'X' }), 'a [X]b');
  assert.equal(JLMK.fill('a{{#x}} [{{x}}]{{/x}}b', { x: '' }), 'ab');
  assert.equal(JLMK.fill('{{^x}}none{{/x}}', {}), 'none');
  assert.equal(JLMK.fill('{{^x}}none{{/x}}', { x: 1 }), '');
});

test('i18n: every language has exactly the keys of en.js', () => {
  const i18n = require('./i18n');
  const shape = (o) => Object.keys(o).sort().map((k) =>
    o[k] && typeof o[k] === 'object' && !Array.isArray(o[k]) && k !== 'meta' ? k + '{' + shape(o[k]) + '}' : k).join(',');
  for (const code of Object.keys(i18n)) {
    assert.equal(shape(i18n[code]), shape(i18n.en), code);
  }
});

test('i18n: skeleton languages fall back to English, AR is right-to-left', () => {
  const langs = Object.fromEntries(JLMK.languages().map((l) => [l.code, l]));
  assert.equal(langs.de.complete, false);
  assert.equal(langs.ar.dir, 'rtl');
  assert.equal(JLMK.text('de', 'employer.signoff'), 'Kind regards,');
  assert.equal(JLMK.normalizeLanguage('xx'), 'en');
});

test('formatDate', () => {
  const d = new Date(2026, 9, 12);
  assert.equal(JLMK.formatDate(d, 'tr'), '12 Ekim');
  assert.equal(JLMK.formatDate(d, 'en'), 'October 12');
  assert.equal(JLMK.formatDate(d, 'de'), 'October 12');
});

test('extractCompany', () => {
  assert.equal(JLMK.extractCompany({ to: 'HR <hr@acme.com>' }), 'Acme');
  assert.equal(JLMK.extractCompany({ to: 'kariyer@careers.trendyol.com' }), 'Trendyol');
  assert.equal(JLMK.extractCompany({ to: 'ik@aselsan.com.tr' }), 'Aselsan');
  assert.equal(JLMK.extractCompany({ to: 'jobs@bbc.co.uk' }), 'Bbc');
  assert.equal(JLMK.extractCompany({ to: 'recruiter@gmail.com', subject: 'Application for Data Analyst at Globex' }), 'Globex');
  assert.equal(JLMK.extractCompany({ to: 'recruiter@gmail.com', subject: 'My CV' }), '');
});

test('extractFirstName ignores role mailboxes', () => {
  assert.equal(JLMK.extractFirstName('HR Team <hr@acme.com>'), '');
  assert.equal(JLMK.extractFirstName('Careers <c@acme.com>'), '');
  assert.equal(JLMK.extractFirstName('Jane Doe <jane@acme.com>'), 'Jane');
});

test('extractPosition: more subject shapes', () => {
  assert.equal(JLMK.extractPosition('Application for Data Analyst at Globex'), 'Data Analyst');
  assert.equal(JLMK.extractPosition('Yazılım Mühendisi Pozisyonu Başvurusu'), 'Yazılım Mühendisi');
  assert.equal(JLMK.extractPosition('Başvurusu: İK Uzmanı'), 'İK Uzmanı');
});

// =============================================================================
// Bug fixes (v0.2.1) — each test below was red before its fix.
// =============================================================================

// 1. Received must be neutral; "can't move forward / talent pool" only in Pool, Rejected, PositionFilled.
test('fix1: Received template is neutral in TR and EN', () => {
  const tr = JLMK.render('Received', { language: 'tr' }, { includePrivacyNote: false });
  const en = JLMK.render('Received', { language: 'en' }, { includePrivacyNote: false });
  assert.doesNotMatch(tr, /ilerlet|ilerley|havuz/i);
  assert.doesNotMatch(en, /move forward|talent pool|on file/i);
  assert.match(tr, /bize ulaştı/);
  assert.match(tr, /değerlendirme/i);
  assert.match(tr, /sonucu.*bildireceğiz/);
  assert.match(en, /reached us/);
  assert.match(en, /review/i);
  assert.match(en, /let you know/);
});

test('fix1: negative wording stays in Pool, Rejected and PositionFilled', () => {
  assert.match(JLMK.render('Pool', { language: 'tr' }), /havuz/);
  assert.match(JLMK.render('Rejected', { language: 'en' }), /other candidates/);
  assert.match(JLMK.render('PositionFilled', { language: 'en' }), /has now been filled/);
});

// 2. "başvuru" is only a strong signal next to a job word; visa/loan/scholarship… are negative.
const personal = (subject, body, attachment) =>
  JLMK.classify({ from: 'Ayşe <ayse@gmail.com>', subject, body, attachments: [attachment] });

test('fix2: visa / loan / scholarship applications are not job applications', () => {
  assert.equal(personal('Vize başvurusu', 'Merhaba, vize başvurusu için belgeler ektedir.', 'pasaport.pdf').isApplication, false);
  assert.equal(personal('Kredi başvurunuz', 'Kredi başvurunuzla ilgili sözleşme ektedir.', 'sözleşme.pdf').isApplication, false);
  assert.equal(personal('Burs başvurusu', 'Burs başvurusu için transkriptim ekte.', 'transkript.pdf').isApplication, false);
});

test('fix2: other negative subject words', () => {
  for (const w of ['Kart', 'Abonelik', 'Üyelik', 'Ruhsat', 'Patent', 'Tender']) {
    assert.equal(personal(`${w} başvurusu`, 'Belgeler ektedir.', 'belge.pdf').isApplication, false, w);
  }
});

test('fix2: bare "başvuru" + any document is not enough; with a job word it is strong', () => {
  assert.equal(personal('Başvuru', 'Belgeler ektedir.', 'dosya.pdf').isApplication, false);
  assert.equal(personal('Staj başvurusu', 'Belgeler ektedir.', 'dosya.pdf').isApplication, true);
  assert.equal(personal('İş başvurusu', 'Belgeler ektedir.', 'dosya.pdf').isApplication, true);
  assert.equal(personal('Bursa şubesi pozisyonu için başvuru', 'Merhaba.', 'cv.pdf').isApplication, true);
});

test('fix2: case folding keeps English capitals working ("INTERNSHIP", not "ınternshıp")', () => {
  assert.equal(JLMK.classify({ from: 'a@b.com', subject: 'INTERNSHIP APPLICATION FOR IT', body: '', attachments: ['doc.pdf'] }).isApplication, true);
  assert.equal(JLMK.prefilter({ subject: 'INTERNSHIP' }), true);
  assert.equal(personal('VİZE BAŞVURUSU', 'Belgeler ektedir.', 'pasaport.pdf').isApplication, false);
});

// 3. Draft bookkeeping.
test('fix3: resolveDraft — sent, still pending, or deleted', () => {
  const at = new Date('2026-10-10T09:00:00Z');
  const later = new Date('2026-10-11T09:00:00Z');
  const earlier = new Date('2026-10-09T09:00:00Z');
  assert.equal(JLMK.resolveDraft({ draftedAt: at, draftExists: true, ownSentDates: [] }), 'pending');
  assert.equal(JLMK.resolveDraft({ draftedAt: at, draftExists: false, ownSentDates: [later] }), 'sent');
  assert.equal(JLMK.resolveDraft({ draftedAt: at, draftExists: false, ownSentDates: [earlier] }), 'deleted');
  assert.equal(JLMK.resolveDraft({ draftedAt: at, draftExists: false, ownSentDates: [] }), 'deleted');
  // No stored time: a sent message after the candidate's last message counts.
  assert.equal(JLMK.resolveDraft({ draftedAt: null, lastCandidateAt: earlier, draftExists: false, ownSentDates: [at] }), 'sent');
});

test('fix3: decide does not prepare a second draft while one is pending', () => {
  const base = { receivedAt: day(0), statuses: [], notifiedStatuses: [], skip: false };
  assert.equal(JLMK.decide({ ...base, draftedStatuses: ['Received'] }, day(10)).action, 'none');
  assert.equal(JLMK.decide({ ...base, statuses: ['Rejected'], draftedStatuses: ['Rejected'] }, day(10)).action, 'none');
  // A pending Received draft does not block a newer status.
  assert.equal(JLMK.decide({ ...base, statuses: ['Rejected'], draftedStatuses: ['Received'] }, day(10)).status, 'Rejected');
});

// 5. Manual statuses are exempt from lookbackDays.
test('fix5: status labels work on threads older than lookbackDays; Received does not', () => {
  const old = { receivedAt: day(0), statuses: ['Rejected'], notifiedStatuses: [], skip: false };
  assert.equal(JLMK.decide(old, day(120)).status, 'Rejected');
  assert.equal(JLMK.decide({ ...old, statuses: [] }, day(120)).action, 'none');
});

// 6. Turkish casing.
test('fix6: extractFirstName follows Turkish casing', () => {
  assert.equal(JLMK.extractFirstName('IŞIK YILMAZ <isik@x.com>'), 'Işık');
  assert.equal(JLMK.extractFirstName('İREM KAYA <irem@x.com>'), 'İrem');
  assert.equal(JLMK.extractFirstName('ılgaz <i@x.com>'), 'Ilgaz');
  assert.equal(JLMK.extractFirstName('irem kaya <i@x.com>', 'tr'), 'İrem');
  // ASCII capitals carry no dot information: "KADIR" must not become "Kadır".
  assert.equal(JLMK.extractFirstName('KADIR DEMIR <k@x.com>', 'tr'), 'Kadir');
  assert.equal(JLMK.extractFirstName('LIAM SMITH <l@x.com>'), 'Liam');
  assert.equal(JLMK.extractFirstName('LIAM SMITH <l@x.com>', 'en'), 'Liam');
});

// 7. One pre-filter for both platforms.
test('fix7: prefilter is shared and covers Turkish word forms', () => {
  assert.equal(JLMK.prefilter({ subject: 'Lunch?', hasAttachments: false }), false);
  assert.equal(JLMK.prefilter({ subject: 'Lunch?', hasAttachments: true }), true);
  assert.equal(JLMK.prefilter({ subject: 'Muhasebe pozisyonu başvurusu', hasAttachments: false }), true);
  assert.equal(JLMK.prefilter({ subject: 'Özgeçmişim', hasAttachments: false }), true);
  assert.ok(JLMK.PREFILTER_WORDS.includes('başvurusu'));
});

// 9. Optional link to the full privacy notice.
test('fix9: privacyNoticeUrl appears in the KVKK/GDPR note only when set', () => {
  const url = 'https://acme.com/kvkk';
  assert.match(JLMK.render('Received', { language: 'tr' }, { privacyNoticeUrl: url }), /KVKK[\s\S]*https:\/\/acme\.com\/kvkk/);
  assert.match(JLMK.render('Received', { language: 'en' }, { privacyNoticeUrl: url }), /https:\/\/acme\.com\/kvkk/);
  assert.doesNotMatch(JLMK.render('Received', { language: 'en' }, {}), /https?:|Details|Ayrıntılı/);
  assert.doesNotMatch(JLMK.render('Received', { language: 'en' }, { includePrivacyNote: false, privacyNoticeUrl: url }), /https?:/);
  assert.equal(JLMK.withDefaults({ privacyNoticeUrl: 'javascript:alert(1)' }).privacyNoticeUrl, '');
});

test('job-site domains: list and pattern agree, dots are literal', () => {
  assert.ok(JLMK.JOB_BOARD_DOMAIN_LIST.includes('kariyer.net'));
  assert.ok(JLMK.JOB_BOARD_DOMAINS.test('jobs-noreply@mail.linkedin.com'));
  assert.ok(JLMK.JOB_BOARD_DOMAINS.test('bilgi@kariyer.net'));
  assert.ok(!JLMK.JOB_BOARD_DOMAINS.test('hr@linkedinxcom'));
  assert.ok(!JLMK.JOB_BOARD_DOMAINS.test('hr@notlinkedin.com'));
});
