/**
 * Gmail engine: scans the mailbox, asks the core what to do, replies or drafts.
 * Depends on Core.js (the JLMK global, copied from /core by `npm run build:gmail`).
 */

var SETTINGS_KEY = 'JLMK_SETTINGS';
var DAILY_COUNT_KEY = 'JLMK_DAILY_COUNT';
var LOG_KEY = 'JLMK_LOG';
var TRIGGER_FUNCTION = 'runScheduled';

// Gmail label names. Users see them nested under "JLMK" in the sidebar.
var LABELS = {
  application: 'JLMK/Application',
  skip: 'JLMK/Skip',
  status: function (s) { return 'JLMK/' + s; },
  notified: function (s) { return 'JLMK/Notified/' + s; },
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
/** Called by the daily time-driven trigger. */
function runScheduled() {
  return run({ dryRun: false });
}

/**
 * Processes all candidate threads.
 * @param {{dryRun:boolean}} opts dryRun = only report, change nothing
 * @return {{scanned:number, applications:number, actions:Array<object>}}
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
  var me = ownAddresses();
  var now = new Date();
  var budget = remainingDailyBudget(settings, now);
  var report = { scanned: 0, applications: 0, actions: [] };

  var threads = findCandidateThreads(settings);
  for (var i = 0; i < threads.length; i++) {
    var thread = threads[i];
    report.scanned++;
    var info = describeThread(thread, me, settings);
    if (!info) continue;
    report.applications++;

    if (!opts.dryRun && !info.tracked) thread.addLabel(label(LABELS.application));

    var decision = JLMK.decide(info, now, settings);
    if (decision.action !== 'reply') continue;

    var entry = {
      subject: info.subject,
      to: info.candidateEmail,
      status: decision.status,
      language: info.language,
      reason: decision.reason,
      mode: opts.dryRun ? 'preview' : JLMK.deliveryMode(settings),
    };

    if (budget <= 0) {
      entry.mode = 'skipped (daily limit)';
      report.actions.push(entry);
      continue;
    }

    if (!opts.dryRun) {
      var body = JLMK.render(decision.status, info, settings, getCustomTemplates());
      if (JLMK.deliveryMode(settings) === 'send') info.replyTo.reply(body);
      else info.replyTo.createDraftReply(body);
      thread.addLabel(label(LABELS.notified(decision.status)));
      budget--;
      incrementDailyCount(now);
    }
    report.actions.push(entry);
  }

  if (!opts.dryRun) appendLog(now, report);
  return report;
}

// ---------------------------------------------------------------------------
// Mailbox access
// ---------------------------------------------------------------------------
function findCandidateThreads(settings) {
  var window = 'newer_than:' + settings.lookbackDays + 'd -label:jlmk-skip';
  var queries = [
    // Untracked inbox mail that looks like it might be an application.
    'in:inbox ' + window + ' -label:jlmk-application -from:me ' +
      '(has:attachment OR subject:(cv OR resume OR application OR applying OR başvuru OR basvuru OR özgeçmiş OR ozgecmis OR pozisyon OR position))',
    // Everything already tracked, wherever it lives now (may have been archived).
    'label:jlmk-application ' + window,
  ];
  MANUAL_STATUSES.forEach(function (s) { queries.push('label:jlmk-' + s.toLowerCase() + ' ' + window); });

  var seen = {};
  var out = [];
  queries.forEach(function (q) {
    GmailApp.search(q, 0, 200).forEach(function (t) {
      if (!seen[t.getId()]) { seen[t.getId()] = true; out.push(t); }
    });
  });
  return out;
}

/**
 * Converts a GmailThread into the shape JLMK.decide() expects,
 * or returns null when the thread is not a job application.
 */
function describeThread(thread, me, settings) {
  var labels = thread.getLabels().map(function (l) { return l.getName(); });
  var has = function (name) { return labels.indexOf(name) >= 0; };

  var messages = thread.getMessages();
  var first = null;
  var lastCandidate = null;
  var lastOwnAt = null;
  for (var i = 0; i < messages.length; i++) {
    var m = messages[i];
    var fromEmail = JLMK.extractEmail(m.getFrom());
    if (me.indexOf(fromEmail) >= 0) {
      lastOwnAt = m.getDate();
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

  var subject = first.getSubject();
  return {
    tracked: tracked,
    subject: subject,
    candidateEmail: JLMK.extractEmail(first.getFrom()),
    name: JLMK.extractFirstName(first.getFrom()),
    position: JLMK.extractPosition(subject),
    language: JLMK.detectLanguage(subject + '\n' + first.getPlainBody().slice(0, 3000), settings.defaultLanguage),
    receivedAt: first.getDate(),
    lastCandidateAt: lastCandidate.getDate(),
    lastOwnReplyAt: lastOwnAt,
    statuses: statuses,
    notifiedStatuses: Object.keys(JLMK.STATUS).map(function (k) { return JLMK.STATUS[k]; })
      .filter(function (s) { return has(LABELS.notified(s)); }),
    skip: has(LABELS.skip),
    replyTo: lastCandidate,
  };
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
  log.unshift({ at: now.toISOString(), applications: report.applications, replies: report.actions.length });
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
}
