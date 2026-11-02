// Runs the Apps Script engine in Node against a fake Gmail mailbox.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ME = 'hr@acme.com';
const daysAgo = (n) => new Date(Date.now() - n * 86400000);

function makeMessage({ from, subject = '', body = '', attachments = [], date, headers = {}, isDraft = false }) {
  const msg = {
    thread: null,
    sent: [],
    drafts: [],
    draft: isDraft,
    getFrom: () => from,
    getSubject: () => subject,
    getPlainBody: () => body,
    getDate: () => date,
    isDraft: () => msg.draft,
    getAttachments: () => attachments.map((n) => ({ getName: () => n })),
    getHeader: (h) => headers[h] || '',
    reply: (b) => {
      msg.sent.push(b);
      if (msg.thread) msg.thread.messages.push(makeMessage({ from: `HR <${ME}>`, body: b, date: new Date() }));
    },
    createDraftReply: (b) => {
      msg.drafts.push(b);
      if (msg.thread) msg.thread.messages.push(makeMessage({ from: `HR <${ME}>`, body: b, date: new Date(), isDraft: true }));
    },
  };
  return msg;
}

function makeThread(id, messages, labels = []) {
  const set = new Set(labels);
  const thread = {
    labels: set,
    messages,
    getId: () => id,
    getMessages: () => thread.messages,
    getLastMessageDate: () => thread.messages[thread.messages.length - 1].getDate(),
    getLabels: () => [...set].map((n) => ({ getName: () => n })),
    addLabel: (l) => set.add(l.getName()),
    removeLabel: (l) => set.delete(l.getName()),
  };
  messages.forEach((m) => { m.thread = thread; });
  return thread;
}

/** Tiny subset of Gmail search: newer_than:Nd, label:x, -label:x, paging. */
function fakeSearch(threads) {
  return (q, start = 0, max = 500) => {
    const slug = (name) => name.toLowerCase().replace(/\//g, '-');
    const newer = q.match(/newer_than:(\d+)d/);
    const include = [...q.matchAll(/(^|\s)label:([\w-]+)/g)].map((m) => m[2]);
    const exclude = [...q.matchAll(/-label:([\w-]+)/g)].map((m) => m[1]);
    const hits = threads.filter((t) => {
      const labels = [...t.labels].map(slug);
      if (newer && t.getLastMessageDate() < daysAgo(Number(newer[1]))) return false;
      if (include.some((l) => !labels.includes(l))) return false;
      if (exclude.some((l) => labels.includes(l))) return false;
      return true;
    });
    if (max > 500) throw new Error('Gmail search max is 500');
    return hits.slice(start, start + max);
  };
}

function loadEngine(threads, settings, { clock } = {}) {
  const props = new Map();
  if (settings) props.set('JLMK_SETTINGS', JSON.stringify(settings));
  const triggers = [];
  const ctx = {
    console,
    PropertiesService: {
      getUserProperties: () => ({
        getProperty: (k) => (props.has(k) ? props.get(k) : null),
        setProperty: (k, v) => props.set(k, v),
        deleteProperty: (k) => props.delete(k),
      }),
    },
    LockService: { getUserLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    Session: { getActiveUser: () => ({ getEmail: () => ME }), getScriptTimeZone: () => 'UTC' },
    Utilities: { formatDate: (d) => d.toISOString().slice(0, 10) },
    GmailApp: {
      search: fakeSearch(threads),
      getAliases: () => [],
      getUserLabelByName: () => null,
      createLabel: (name) => ({ getName: () => name }),
    },
    ScriptApp: {
      getProjectTriggers: () => triggers.slice(),
      deleteTrigger: (t) => triggers.splice(triggers.indexOf(t), 1),
      newTrigger: (fn) => {
        const b = { timeBased: () => b, after: () => b, everyDays: () => b, atHour: () => b,
          create: () => { const t = { getHandlerFunction: () => fn }; triggers.push(t); return t; } };
        return b;
      },
    },
  };
  vm.createContext(ctx);
  for (const f of ['Engine.js', 'Core.js']) { // Engine first on purpose: load order must not matter
    vm.runInContext(fs.readFileSync(path.join(__dirname, 'src', f), 'utf8'), ctx, { filename: f });
  }
  if (clock) ctx.nowMs_ = clock;
  ctx.triggers = triggers;
  ctx.props = props;
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

test('drafts a Turkish "received" reply after 7 silent days, then never again while the draft exists', () => {
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
  assert.ok(threads[0].labels.has('JLMK/Notified/Received'));
  assert.equal(answered.sent.length, 0);
  assert.equal(rejected.sent.length, 1);
  assert.match(rejected.sent[0], /başka adaylarla ilerlemeye/);
  assert.equal(invoice.sent.length, 0);
  assert.ok(!threads[3].labels.has('JLMK/Application'));
});

test('candidate role does not run the employer engine', () => {
  const msg = application(daysAgo(8));
  const report = loadEngine([makeThread('t1', [msg])], { role: 'candidate', mode: 'send' }).run({ dryRun: false });
  assert.match(report.note, /Candidate mode/);
  assert.equal(msg.drafts.length + msg.sent.length, 0);
});

test('daily limit is respected', () => {
  const threads = [1, 2, 3].map((i) => makeThread('t' + i, [application(daysAgo(8))]));
  const report = loadEngine(threads, { dailyLimit: 2 }).run({ dryRun: false });
  const drafted = threads.filter((t) => t.messages[0].drafts.length).length;
  assert.equal(drafted, 2);
  assert.equal(report.actions.filter((a) => /limit/.test(a.mode)).length, 1);
});

// --- fix 3: Drafted vs Notified -------------------------------------------------------

test('fix3: draft mode labels Drafted, not Notified', () => {
  const thread = makeThread('t1', [application(daysAgo(8))]);
  loadEngine([thread]).run({ dryRun: false });
  assert.ok(thread.labels.has('JLMK/Drafted/Received'));
  assert.ok(!thread.labels.has('JLMK/Notified/Received'));
});

test('fix3: once the draft is sent, Notified replaces Drafted', () => {
  const msg = application(daysAgo(8));
  const thread = makeThread('t1', [msg]);
  const ctx = loadEngine([thread]);
  ctx.run({ dryRun: false });
  const draft = thread.messages.find((m) => m.isDraft());
  draft.draft = false; // HR clicked send
  draft.getDate = () => new Date(Date.now() + 60000);
  ctx.run({ dryRun: false });
  assert.ok(thread.labels.has('JLMK/Notified/Received'));
  assert.ok(!thread.labels.has('JLMK/Drafted/Received'));
  assert.equal(msg.drafts.length, 1);
});

test('fix3: a deleted draft is prepared again on the next run', () => {
  const msg = application(daysAgo(8));
  const thread = makeThread('t1', [msg]);
  const ctx = loadEngine([thread]);
  ctx.run({ dryRun: false });
  thread.messages = thread.messages.filter((m) => !m.isDraft()); // HR deleted the draft
  ctx.run({ dryRun: false });
  assert.equal(msg.drafts.length, 2);
  assert.ok(thread.labels.has('JLMK/Drafted/Received'));
  assert.ok(!thread.labels.has('JLMK/Notified/Received'));
});

test('fix3: our own unsent draft does not count as a human reply', () => {
  const msg = application(daysAgo(8));
  const ownDraft = makeMessage({ from: `HR <${ME}>`, body: 'half-written…', date: daysAgo(7), isDraft: true });
  const thread = makeThread('t1', [msg, ownDraft]);
  const report = loadEngine([thread]).run({ dryRun: true });
  assert.equal(report.actions.length, 1);
});

// --- fix 5: manual statuses ignore lookbackDays ----------------------------------------

test('fix5: a status label on a thread older than lookbackDays is still handled', () => {
  const old = application(daysAgo(120));
  const thread = makeThread('old', [old], ['JLMK/Application', 'JLMK/Rejected']);
  loadEngine([thread], { mode: 'send' }).run({ dryRun: false });
  assert.equal(old.sent.length, 1);
});

// --- fix 8: paging and resumable runs ---------------------------------------------------

test('fix8: more than 200 threads are all processed', () => {
  const threads = Array.from({ length: 250 }, (_, i) => makeThread('t' + i, [application(daysAgo(8))]));
  const report = loadEngine(threads, { dailyLimit: 500 }).run({ dryRun: false });
  assert.equal(report.applications, 250);
  assert.equal(threads.filter((t) => t.messages[0].drafts.length === 1).length, 250);
});

test('fix8: stops before the time limit, saves the cursor and continues on the next trigger', () => {
  const threads = Array.from({ length: 30 }, (_, i) => makeThread('t' + i, [application(daysAgo(8))]));
  let t = 0;
  const ctx = loadEngine(threads, { dailyLimit: 500 }, { clock: () => (t += 20 * 1000) }); // 20 s per call

  const first = ctx.run({ dryRun: false });
  const done = () => threads.filter((th) => th.messages[0].drafts.length === 1).length;
  assert.ok(first.partial, 'first run should report it stopped early');
  assert.ok(done() > 0 && done() < 30, `processed ${done()}`);
  assert.ok(ctx.triggers.some((tr) => tr.getHandlerFunction() === 'runContinuation'));

  t = 0;
  ctx.runContinuation();
  t = 0;
  ctx.runContinuation();
  assert.equal(done(), 30);
  assert.ok(threads.every((th) => th.messages[0].drafts.length === 1), 'no thread drafted twice');
});
