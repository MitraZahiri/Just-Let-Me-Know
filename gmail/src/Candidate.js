/**
 * Gmail candidate mode: finds the applications you sent, keeps a status label
 * on each one and prepares follow-up drafts. It never sends anything.
 * All decisions come from JLMKCandidate (Core.js); this file only reads and labels mail.
 */

var FOLLOWUPS_KEY = 'JLMK_FOLLOWUPS'; // {threadId: [ISO times follow-up drafts were prepared]}
var SHEET_KEY = 'JLMK_SHEET_ID';
var SUMMARY_KEY = 'JLMK_SUMMARY';     // last run's counts, shown on the homepage

var CANDIDATE_LABELS = {
  applied: 'JLMK/Applied',
  status: function (s) { return 'JLMK/Applied/' + s; },
};
// Literal on purpose, like MANUAL_STATUSES in Engine.js.
var CANDIDATE_STATUSES = ['Sent', 'Acknowledged', 'NoResponse', 'Rejected', 'Interview'];

/**
 * @param {{dryRun:boolean}} opts
 * @return {{scanned:number, applications:number, actions:object[], summary:object, apps:object[], partial?:boolean, note?:string}}
 */
function runCandidate(opts, settings) {
  var now = new Date();
  var me = ownAddresses();
  var mail = gatherCandidateMail(settings, me);
  var apps = JLMKCandidate.reconcile({ threads: mail.threads, inbox: mail.inbox, me: me }, now, settings);
  var report = {
    scanned: mail.threads.length,
    applications: apps.length,
    actions: [],
    summary: JLMKCandidate.summarize(apps),
    apps: apps,
  };
  if (mail.partial) {
    report.partial = true;
    report.note = 'Stopped reading before the time limit, so no follow-up drafts were prepared this time.';
  }

  var budget = remainingDailyBudget(settings, now);
  apps.forEach(function (app) {
    if (!opts.dryRun) labelApplication(mail.byId[app.threadId], app);
    if (app.decision.action !== 'draft') return;

    var entry = {
      subject: app.subject,
      to: app.target.to,
      status: app.decision.kind,
      language: app.language,
      reason: app.decision.reason,
      mode: opts.dryRun ? 'preview' : 'draft',
    };
    // Without the whole mailbox an answer may have been missed: never nudge on partial data.
    if (mail.partial) entry.mode = 'skipped (incomplete scan)';
    else if (budget <= 0) entry.mode = 'skipped (daily limit)';
    else if (!opts.dryRun) {
      createFollowUpDraft(app, settings);
      rememberFollowUp(app.threadId, now);
      budget--;
      incrementDailyCount(now);
    }
    report.actions.push(entry);
  });

  if (!opts.dryRun) {
    PropertiesService.getUserProperties().setProperty(SUMMARY_KEY, JSON.stringify({ at: now.toISOString(), summary: report.summary }));
    appendLog(now, report);
  }
  return report;
}

/**
 * Reads every thread that may hold an application or an answer to one.
 * Each thread is offered both as a possible application (your messages) and
 * as inbox mail (job-site confirmations, answers from another address).
 */
function gatherCandidateMail(settings, me) {
  var started = nowMs_();
  var followUps = loadFollowUps();
  var out = { threads: [], inbox: [], byId: {}, partial: false };

  var queries = candidateModeQueries(settings);
  for (var qi = 0; qi < queries.length; qi++) {
    for (var start = 0; ; start += PAGE_SIZE) {
      var page = GmailApp.search(queries[qi], start, PAGE_SIZE);
      for (var k = 0; k < page.length; k++) {
        if (nowMs_() - started > MAX_RUNTIME_MS) { out.partial = true; return out; }
        var thread = page[k];
        var id = thread.getId();
        if (out.byId[id]) continue;
        out.byId[id] = thread;
        addThread(out, thread, me, followUps[id]);
      }
      if (page.length < PAGE_SIZE) break;
    }
  }
  return out;
}

function candidateModeQueries(settings) {
  var window = 'newer_than:' + settings.lookbackDays + 'd -label:jlmk-skip';
  var words = '(' + JLMK.PREFILTER_WORDS.join(' OR ') + ')';
  return [
    // Applications you sent yourself.
    'in:sent ' + window + ' (has:attachment OR subject:' + words + ')',
    // Everything already tracked or marked by you.
    'label:jlmk-applied ' + window,
    // Job-site confirmations ("Your application was sent to …").
    'in:inbox ' + window + ' from:(' + JLMK.JOB_BOARD_DOMAIN_LIST.join(' OR ') + ')',
    // Answers that may come from another address (ATS, recruiter).
    'in:inbox ' + window + ' -from:me (application OR applying OR candidacy OR interview OR ' + words.slice(1, -1) +
      ' OR başvurunuz OR basvurunuz OR mülakat OR mulakat OR görüşme OR gorusme)',
  ];
}

function addThread(out, thread, me, followUps) {
  var id = thread.getId();
  var labels = thread.getLabels().map(function (l) { return l.getName(); });
  var messages = [];
  var draftExists = false;
  thread.getMessages().forEach(function (m) {
    if (m.isDraft()) { draftExists = true; return; }
    var msg = toCandidateMessage(m, id);
    messages.push(msg);
    if (me.indexOf(JLMK.extractEmail(msg.from)) < 0) out.inbox.push(msg);
  });
  out.threads.push({
    id: id,
    messages: messages,
    followUps: (followUps || []).map(function (t) { return new Date(t); }),
    forced: labels.indexOf(CANDIDATE_LABELS.applied) >= 0,
    draftExists: draftExists,
  });
}

function toCandidateMessage(m, threadId) {
  var autoSubmitted = m.getHeader('Auto-Submitted') || '';
  return {
    threadId: threadId,
    from: m.getFrom(),
    to: m.getTo(),
    cc: m.getCc(),
    subject: m.getSubject(),
    body: m.getPlainBody(),
    attachments: m.getAttachments({ includeInlineImages: false }).map(function (a) { return a.getName(); }),
    date: m.getDate(),
    isAuto: !!autoSubmitted && !/^no$/i.test(autoSubmitted),
    isBulk: !!(m.getHeader('List-Unsubscribe') || /bulk|list/i.test(m.getHeader('Precedence') || '')),
    messageId: m.getHeader('Message-ID'),
    inReplyTo: m.getHeader('In-Reply-To'),
    references: (m.getHeader('References') || '').split(/\s+/).filter(Boolean),
    ref: m, // the GmailMessage, handed back in app.target.replyTo
  };
}

/** One JLMK/Applied/<status> label per thread, kept in sync with the record. */
function labelApplication(thread, app) {
  if (!thread) return;
  thread.addLabel(label(CANDIDATE_LABELS.applied));
  CANDIDATE_STATUSES.forEach(function (s) {
    if (s !== app.status) thread.removeLabel(label(CANDIDATE_LABELS.status(s)));
  });
  thread.addLabel(label(CANDIDATE_LABELS.status(app.status)));
}

function createFollowUpDraft(app, settings) {
  var who = {};
  for (var k in app) who[k] = app[k];
  who.recipientName = app.target.name;
  var body = JLMKCandidate.renderFollowUp(app.decision.kind, who, settings, getCustomTemplates());
  if (app.target.replyTo) app.target.replyTo.ref.createDraftReply(body);
  else GmailApp.createDraft(app.target.to, app.target.subject, body);
}

/** Record of the open thread only (no cross-thread matching) for the sidebar. */
function describeCandidateThread(thread, settings) {
  var ignored = thread.getLabels().some(function (l) { return l.getName() === LABELS.skip; });
  if (ignored) return null;
  var me = ownAddresses();
  var out = { threads: [], inbox: [], byId: {} };
  addThread(out, thread, me, loadFollowUps()[thread.getId()]);
  return JLMKCandidate.reconcile({ threads: out.threads, inbox: out.inbox, me: me }, new Date(), settings)[0] || null;
}

// ---------------------------------------------------------------------------
// Google Sheets export (a spreadsheet in your own Drive)
// ---------------------------------------------------------------------------
/** @return {{url:string, rows:number, partial:boolean}} */
function exportToSheet() {
  var settings = getSettings();
  var report = run({ dryRun: true });
  if (!report.apps) throw new Error(report.note || 'Export is only available in candidate mode.');
  var rows = JLMKCandidate.exportRows(report.apps, settings);
  var title = JLMK.text(JLMK.normalizeLanguage(settings.defaultLanguage), 'candidate.export.sheetTitle');
  var ss = openOrCreateSheet(title);
  var sheet = ss.getSheets()[0];
  sheet.clearContents();
  sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  sheet.setFrozenRows(1);
  return { url: ss.getUrl(), rows: rows.length - 1, partial: !!report.partial };
}

function openOrCreateSheet(title) {
  var props = PropertiesService.getUserProperties();
  var id = props.getProperty(SHEET_KEY);
  if (id) {
    try { return SpreadsheetApp.openById(id); } catch (e) { /* deleted or no access: make a new one */ }
  }
  var ss = SpreadsheetApp.create(title);
  props.setProperty(SHEET_KEY, ss.getId());
  return ss;
}

// ---------------------------------------------------------------------------
// Stored state
// ---------------------------------------------------------------------------
function loadFollowUps() {
  return JSON.parse(PropertiesService.getUserProperties().getProperty(FOLLOWUPS_KEY) || '{}');
}

function rememberFollowUp(threadId, at) {
  var all = loadFollowUps();
  all[threadId] = (all[threadId] || []).concat(at.toISOString());
  PropertiesService.getUserProperties().setProperty(FOLLOWUPS_KEY, JSON.stringify(all));
}

function lastCandidateSummary() {
  var raw = PropertiesService.getUserProperties().getProperty(SUMMARY_KEY);
  return raw ? JSON.parse(raw) : null;
}
