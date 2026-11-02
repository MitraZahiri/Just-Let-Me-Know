/**
 * Gmail engine: scans the mailbox, asks the core what to do, replies or drafts.
 * Depends on Core.js (the JLMK global, copied from /core by `npm run build:gmail`).
 */

var SETTINGS_KEY = 'JLMK_SETTINGS';
var DAILY_COUNT_KEY = 'JLMK_DAILY_COUNT';
var LOG_KEY = 'JLMK_LOG';
var DRAFTS_KEY = 'JLMK_DRAFTS';   // {threadId: {status: ISO time the draft was created}}
var CURSOR_KEY = 'JLMK_CURSOR';   // where an interrupted run stopped: {q, start}
var TRIGGER_FUNCTION = 'runScheduled';
var CONTINUATION_FUNCTION = 'runContinuation';

// Apps Script stops a run after 6 minutes; stop early and continue in a new trigger.
var MAX_RUNTIME_MS = 4.5 * 60 * 1000;
var PAGE_SIZE = 100;
// Indirection so tests can drive the clock that measures run time.
var nowMs_ = function () { return Date.now(); };

// Gmail label names. Users see them nested under "JLMK" in the sidebar.
var LABELS = {
  application: 'JLMK/Application',
  skip: 'JLMK/Skip',
  status: function (s) { return 'JLMK/' + s; },
  drafted: function (s) { return 'JLMK/Drafted/' + s; },   // draft prepared, not sent yet
  notified: function (s) { return 'JLMK/Notified/' + s; }, // a sent message was seen
};

// Statuses HR can set by hand (Received is automatic). Literal strings on purpose:
// Apps Script runs top-level code file by file, so JLMK may not exist yet here.
var MANUAL_STATUSES = ['InReview', 'Pool', 'Rejected', 'PositionFilled'];

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------
function getSettings() {
  var raw = PropertiesService.getUserProperties().getProperty(SETTINGS_KEY);
  return JLMK.withDefaults(raw ? JSON.parse(raw) : {});
}

function saveSettings(settings) {
  PropertiesService.getUserProperties().setProperty(SETTINGS_KEY, JSON.stringify(settings));
}

// ---------------------------------------------------------------------------
// Entry points
// ---------------------------------------------------------------------------
/** Called by the daily time-driven trigger. Resumes an interrupted run if there is one. */
function runScheduled() {
  return run({ dryRun: false });
}

/** One-off trigger created when a run hit the time limit. */
function runContinuation() {
  clearContinuation();
  return run({ dryRun: false });
}

/**
 * Processes all candidate threads.
 * @param {{dryRun:boolean}} opts dryRun = only report, change nothing
 * @return {{scanned:number, applications:number, actions:Array<object>, partial?:boolean, note?:string}}
 */
function run(opts) {
  var lock = LockService.getUserLock();
  if (!lock.tryLock(5000)) return { scanned: 0, applications: 0, actions: [], note: 'Another run is in progress.' };
  try {
    return runLocked(opts || {});
  } finally {
    lock.releaseLock();
  }
}

function runLocked(opts) {
  var settings = getSettings();
  if (settings.role !== JLMK.ROLE.EMPLOYER) {
    return { scanned: 0, applications: 0, actions: [], note: 'Candidate mode is not available in Gmail yet.' };
  }
  ensureLabels();
  var started = nowMs_();
  var ctx = {
    opts: opts,
    settings: settings,
    me: ownAddresses(),
    now: new Date(),
    budget: remainingDailyBudget(settings, new Date()),
    report: { scanned: 0, applications: 0, actions: [] },
  };

  // Previews always start from the top and never touch the saved cursor.
  var cursor = (!opts.dryRun && loadCursor()) || { q: 0, start: 0 };
  var queries = candidateQueries(settings);
  var seen = {};

  for (var qi = cursor.q; qi < queries.length; qi++) {
    var start = qi === cursor.q ? cursor.start : 0;
    for (;;) {
      var page = GmailApp.search(queries[qi], start, PAGE_SIZE);
      for (var k = 0; k < page.length; k++) {
        if (nowMs_() - started > MAX_RUNTIME_MS) {
          ctx.report.partial = true;
          ctx.report.note = 'Stopped before the time limit; ' + (opts.dryRun ? 'preview is incomplete.' : 'will continue automatically.');
          if (!opts.dryRun) {
            saveCursor({ q: qi, start: start + k });
            scheduleContinuation();
            appendLog(ctx.now, ctx.report);
          }
          return ctx.report;
        }
        var thread = page[k];
        if (seen[thread.getId()]) continue;
        seen[thread.getId()] = true;
        processThread(thread, ctx);
      }
      if (page.length < PAGE_SIZE) break;
      start += PAGE_SIZE;
    }
  }

  if (!opts.dryRun) {
    clearCursor();
    appendLog(ctx.now, ctx.report);
  }
  return ctx.report;
}

function processThread(thread, ctx) {
  var opts = ctx.opts;
  var settings = ctx.settings;
  ctx.report.scanned++;
  var info = describeThread(thread, ctx.me, settings);
  if (!info) return;
  ctx.report.applications++;

  if (!opts.dryRun) {
    if (!info.tracked) thread.addLabel(label(LABELS.application));
    applyDraftResolutions(thread, info.draftResolutions);
  }

  var decision = JLMK.decide(info, ctx.now, settings);
  if (decision.action !== 'reply') return;

  var mode = JLMK.deliveryMode(settings);
  var entry = {
    subject: info.subject,
    to: info.candidateEmail,
    status: decision.status,
    language: info.language,
    reason: decision.reason,
    mode: opts.dryRun ? 'preview' : mode,
  };

  if (ctx.budget <= 0) {
    entry.mode = 'skipped (daily limit)';
    ctx.report.actions.push(entry);
    return;
  }

  if (!opts.dryRun) {
    var body = JLMK.render(decision.status, info, settings, getCustomTemplates());
    if (mode === 'send') {
      info.replyTo.reply(body);
      thread.addLabel(label(LABELS.notified(decision.status)));
    } else {
      info.replyTo.createDraftReply(body);
      thread.addLabel(label(LABELS.drafted(decision.status)));
      rememberDraft(thread.getId(), decision.status, new Date());
    }
    ctx.budget--;
    incrementDailyCount(ctx.now);
  }
  ctx.report.actions.push(entry);
}

// ---------------------------------------------------------------------------
// Mailbox access
// ---------------------------------------------------------------------------
/**
 * Search queries, in order. They must not depend on labels this run adds
 * (except to *include* threads), so paging offsets stay stable while we work.
 */
function candidateQueries(settings) {
  var skip = '-label:jlmk-skip';
  var window = 'newer_than:' + settings.lookbackDays + 'd ' + skip;
  var queries = [
    // Inbox mail that might be an application (prefilter words shared with Outlook via core).
    'in:inbox ' + window + ' -from:me (has:attachment OR subject:(' + JLMK.PREFILTER_WORDS.join(' OR ') + '))',
    // Everything already tracked, wherever it lives now (may have been archived).
    'label:jlmk-application ' + window,
  ];
  // Manual statuses are honoured however old the thread is.
  MANUAL_STATUSES.forEach(function (s) { queries.push('label:jlmk-' + s.toLowerCase() + ' ' + skip); });
  return queries;
}

/**
 * Converts a GmailThread into the shape JLMK.decide() expects,
 * or returns null when the thread is not a job application. Read-only:
 * label changes it implies are returned in `draftResolutions`.
 */
function describeThread(thread, me, settings) {
  var labels = thread.getLabels().map(function (l) { return l.getName(); });
  var has = function (name) { return labels.indexOf(name) >= 0; };

  var messages = thread.getMessages();
  var first = null;
  var lastCandidate = null;
  var lastOwnAt = null;
  var ownSentDates = [];
  var draftExists = false;
  for (var i = 0; i < messages.length; i++) {
    var m = messages[i];
    if (m.isDraft()) { draftExists = true; continue; } // an unsent draft is not a reply
    var fromEmail = JLMK.extractEmail(m.getFrom());
    if (me.indexOf(fromEmail) >= 0) {
      lastOwnAt = m.getDate();
      ownSentDates.push(m.getDate());
    } else {
      if (!first) first = m;
      lastCandidate = m;
    }
  }
  if (!first) return null; // a thread we started ourselves

  var statuses = MANUAL_STATUSES.filter(function (s) { return has(LABELS.status(s)); });
  var tracked = has(LABELS.application);

  if (!tracked && !statuses.length) {
    var verdict = JLMK.classify(toCoreMessage(first), settings);
    if (!verdict.isApplication) return null;
  }

  var allStatuses = Object.keys(JLMK.STATUS).map(function (k) { return JLMK.STATUS[k]; });
  var notified = allStatuses.filter(function (s) { return has(LABELS.notified(s)); });
  var drafted = [];
  var resolutions = [];
  var stored = loadDrafts()[thread.getId()] || {};
  allStatuses.forEach(function (s) {
    if (!has(LABELS.drafted(s)) || notified.indexOf(s) >= 0) return;
    var outcome = JLMK.resolveDraft({
      draftedAt: stored[s] ? new Date(stored[s]) : null,
      lastCandidateAt: lastCandidate.getDate(),
      draftExists: draftExists,
      ownSentDates: ownSentDates,
    });
    if (outcome === 'pending') drafted.push(s);
    else resolutions.push({ status: s, outcome: outcome });
    if (outcome === 'sent') notified.push(s);
  });

  var subject = first.getSubject();
  var language = JLMK.detectLanguage(subject + '\n' + first.getPlainBody().slice(0, 3000), settings.defaultLanguage);
  return {
    tracked: tracked,
    subject: subject,
    candidateEmail: JLMK.extractEmail(first.getFrom()),
    name: JLMK.extractFirstName(first.getFrom(), language),
    position: JLMK.extractPosition(subject),
    language: language,
    receivedAt: first.getDate(),
    lastCandidateAt: lastCandidate.getDate(),
    lastOwnReplyAt: lastOwnAt,
    statuses: statuses,
    notifiedStatuses: notified,
    draftedStatuses: drafted,
    draftResolutions: resolutions,
    skip: has(LABELS.skip),
    replyTo: lastCandidate,
  };
}

/** Sent drafts become Notified; deleted drafts lose their label so they are prepared again. */
function applyDraftResolutions(thread, resolutions) {
  resolutions.forEach(function (r) {
    thread.removeLabel(label(LABELS.drafted(r.status)));
    if (r.outcome === 'sent') thread.addLabel(label(LABELS.notified(r.status)));
    forgetDraft(thread.getId(), r.status);
  });
}

function toCoreMessage(msg) {
  return {
    from: msg.getFrom(),
    subject: msg.getSubject(),
    body: msg.getPlainBody(),
    attachments: msg.getAttachments({ includeInlineImages: false }).map(function (a) { return a.getName(); }),
    isBulk: !!(msg.getHeader('List-Unsubscribe') || /bulk|list/i.test(msg.getHeader('Precedence') || '')),
  };
}

function ownAddresses() {
  var list = [Session.getActiveUser().getEmail()].concat(GmailApp.getAliases());
  return list.filter(Boolean).map(function (a) { return a.toLowerCase(); });
}

var labelCache_ = {};
function label(name) {
  if (!labelCache_[name]) labelCache_[name] = GmailApp.getUserLabelByName(name) || GmailApp.createLabel(name);
  return labelCache_[name];
}

function ensureLabels() {
  label('JLMK');
  label(LABELS.application);
  label(LABELS.skip);
  MANUAL_STATUSES.forEach(function (s) { label(LABELS.status(s)); });
}

// ---------------------------------------------------------------------------
// Stored state: drafts we created, cursor of an interrupted run
// ---------------------------------------------------------------------------
function loadDrafts() {
  return JSON.parse(PropertiesService.getUserProperties().getProperty(DRAFTS_KEY) || '{}');
}

function rememberDraft(threadId, status, at) {
  var all = loadDrafts();
  all[threadId] = all[threadId] || {};
  all[threadId][status] = at.toISOString();
  PropertiesService.getUserProperties().setProperty(DRAFTS_KEY, JSON.stringify(all));
}

function forgetDraft(threadId, status) {
  var all = loadDrafts();
  if (!all[threadId]) return;
  delete all[threadId][status];
  if (!Object.keys(all[threadId]).length) delete all[threadId];
  PropertiesService.getUserProperties().setProperty(DRAFTS_KEY, JSON.stringify(all));
}

function loadCursor() {
  var raw = PropertiesService.getUserProperties().getProperty(CURSOR_KEY);
  return raw ? JSON.parse(raw) : null;
}

function saveCursor(cursor) {
  PropertiesService.getUserProperties().setProperty(CURSOR_KEY, JSON.stringify(cursor));
}

function clearCursor() {
  PropertiesService.getUserProperties().deleteProperty(CURSOR_KEY);
}

// ---------------------------------------------------------------------------
// Daily limit, log, custom templates
// ---------------------------------------------------------------------------
function todayKey(now) {
  return Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function remainingDailyBudget(settings, now) {
  var raw = PropertiesService.getUserProperties().getProperty(DAILY_COUNT_KEY);
  var state = raw ? JSON.parse(raw) : {};
  var used = state.day === todayKey(now) ? state.count : 0;
  return Math.max(0, settings.dailyLimit - used);
}

function incrementDailyCount(now) {
  var props = PropertiesService.getUserProperties();
  var raw = props.getProperty(DAILY_COUNT_KEY);
  var state = raw ? JSON.parse(raw) : {};
  var day = todayKey(now);
  state = state.day === day ? { day: day, count: state.count + 1 } : { day: day, count: 1 };
  props.setProperty(DAILY_COUNT_KEY, JSON.stringify(state));
}

function appendLog(now, report) {
  var props = PropertiesService.getUserProperties();
  var log = JSON.parse(props.getProperty(LOG_KEY) || '[]');
  log.unshift({ at: now.toISOString(), applications: report.applications, replies: report.actions.length, partial: !!report.partial });
  props.setProperty(LOG_KEY, JSON.stringify(log.slice(0, 20)));
}

function getLog() {
  return JSON.parse(PropertiesService.getUserProperties().getProperty(LOG_KEY) || '[]');
}

/** Optional: JSON shaped like core/i18n files, e.g. {"en":{"employer":{"Received":"…"}}}, to override wording. */
function getCustomTemplates() {
  var raw = PropertiesService.getUserProperties().getProperty('JLMK_TEMPLATES');
  return raw ? JSON.parse(raw) : null;
}

// ---------------------------------------------------------------------------
// Trigger management
// ---------------------------------------------------------------------------
function isScheduled() {
  return ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === TRIGGER_FUNCTION; });
}

function enableSchedule() {
  if (isScheduled()) return;
  ScriptApp.newTrigger(TRIGGER_FUNCTION).timeBased().everyDays(1).atHour(9).create();
}

function disableSchedule() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === TRIGGER_FUNCTION) ScriptApp.deleteTrigger(t);
  });
  clearContinuation();
  clearCursor();
}

function scheduleContinuation() {
  var exists = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === CONTINUATION_FUNCTION; });
  if (!exists) ScriptApp.newTrigger(CONTINUATION_FUNCTION).timeBased().after(60 * 1000).create();
}

function clearContinuation() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === CONTINUATION_FUNCTION) ScriptApp.deleteTrigger(t);
  });
}
