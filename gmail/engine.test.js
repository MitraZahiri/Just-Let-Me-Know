// Runs the Apps Script engine in Node against a fake Gmail mailbox.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ME = 'hr@acme.com';
const daysAgo = (n) => new Date(Date.now() - n * 86400000);

function makeMessage({ from, subject = '', body = '', attachments = [], date, headers = {} }) {
  const msg = {
    sent: [],
    drafts: [],
    getFrom: () => from,
    getSubject: () => subject,
    getPlainBody: () => body,
    getDate: () => date,
    getAttachments: () => attachments.map((n) => ({ getName: () => n })),
    getHeader: (h) => headers[h] || '',
    reply: (b) => msg.sent.push(b),
    createDraftReply: (b) => msg.drafts.push(b),
  };
  return msg;
}

function makeThread(id, messages, labels = []) {
  const set = new Set(labels);
  return {
    labels: set,
    messages,
    getId: () => id,
    getMessages: () => messages,
    getLabels: () => [...set].map((n) => ({ getName: () => n })),
    addLabel: (l) => set.add(l.getName()),
    removeLabel: (l) => set.delete(l.getName()),
  };
}

function loadEngine(threads, settings) {
  const props = new Map();
  if (settings) props.set('JLMK_SETTINGS', JSON.stringify(settings));
  const ctx = {
    console,
    PropertiesService: {
      getUserProperties: () => ({
        getProperty: (k) => (props.has(k) ? props.get(k) : null),
        setProperty: (k, v) => props.set(k, v),
      }),
    },
    LockService: { getUserLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    Session: { getActiveUser: () => ({ getEmail: () => ME }), getScriptTimeZone: () => 'UTC' },
    Utilities: { formatDate: (d) => d.toISOString().slice(0, 10) },
    GmailApp: {
      search: () => threads,
      getAliases: () => [],
      getUserLabelByName: () => null,
      createLabel: (name) => ({ getName: () => name }),
    },
    ScriptApp: { getProjectTriggers: () => [] },
  };
  vm.createContext(ctx);
  for (const f of ['Engine.js', 'Core.js']) { // Engine first on purpose: load order must not matter
    vm.runInContext(fs.readFileSync(path.join(__dirname, 'src', f), 'utf8'), ctx, { filename: f });
  }
  return ctx;
}

const application = (date, extra = {}) => makeMessage({
  from: 'Ayşe Yılmaz <ayse@gmail.com>',
  subject: 'Muhasebe Uzmanı pozisyonu için başvuru',
  body: 'Merhaba, pozisyonunuza başvurmak istiyorum. Özgeçmişim ektedir. Saygılarımla',
  attachments: ['Ayse_Yilmaz_CV.pdf'],
  date,
  ...extra,
});

test('drafts a Turkish "received" reply after 7 silent days, then never again', () => {
  const msg = application(daysAgo(8));
  const thread = makeThread('t1', [msg]);
  const ctx = loadEngine([thread], { companyName: 'Acme' });

  const report = ctx.run({ dryRun: false });
  assert.equal(report.applications, 1);
  assert.equal(report.actions.length, 1);
  assert.equal(msg.drafts.length, 1);
  assert.equal(msg.sent.length, 0); // draft mode is the default
  assert.match(msg.drafts[0], /^Merhaba Ayşe,/);
  assert.ok(thread.labels.has('JLMK/Application'));
  assert.ok(thread.labels.has('JLMK/Notified/Received'));

  ctx.run({ dryRun: false });
  assert.equal(msg.drafts.length, 1);
});

test('preview changes nothing', () => {
  const msg = application(daysAgo(8));
  const thread = makeThread('t1', [msg]);
  const report = loadEngine([thread]).run({ dryRun: true });
  assert.equal(report.actions.length, 1);
  assert.equal(msg.drafts.length + msg.sent.length, 0);
  assert.equal(thread.labels.size, 0);
});

test('send mode, human reply, status label and non-applications', () => {
  const waiting = application(daysAgo(10));
  const answered = application(daysAgo(10));
  const humanReply = makeMessage({ from: `HR <${ME}>`, date: daysAgo(9) });
  const rejected = application(daysAgo(1));
  const invoice = makeMessage({ from: 'billing@vendor.com', subject: 'Invoice', body: 'Invoice attached', attachments: ['inv.pdf'], date: daysAgo(10) });

  const threads = [
    makeThread('waiting', [waiting]),
    makeThread('answered', [answered, humanReply]),
    makeThread('rejected', [rejected], ['JLMK/Application', 'JLMK/Rejected']),
    makeThread('invoice', [invoice]),
  ];
  const report = loadEngine(threads, { mode: 'send' }).run({ dryRun: false });

  assert.equal(report.applications, 3);
  assert.equal(waiting.sent.length, 1);
  assert.equal(answered.sent.length, 0);
  assert.equal(rejected.sent.length, 1);
  assert.match(rejected.sent[0], /başka adaylarla ilerlemeye/);
  assert.equal(invoice.sent.length, 0);
  assert.ok(!threads[3].labels.has('JLMK/Application'));
});

test('daily limit is respected', () => {
  const threads = [1, 2, 3].map((i) => makeThread('t' + i, [application(daysAgo(8))]));
  const report = loadEngine(threads, { dailyLimit: 2 }).run({ dryRun: false });
  const drafted = threads.filter((t) => t.messages[0].drafts.length).length;
  assert.equal(drafted, 2);
  assert.equal(report.actions.filter((a) => /limit/.test(a.mode)).length, 1);
});
