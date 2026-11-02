/**
 * Just Let Me Know — candidate side (pure functions).
 *
 * Finds the applications *you* sent, follows what happened to each one and
 * decides when a polite follow-up draft is due. Follow-ups are never sent
 * automatically: the only action this module ever returns is 'draft'.
 *
 * Messages are plain objects (the platform layer converts Gmail / Graph messages):
 *   { from, to, cc?, subject, body, attachments?: string[], date: Date,
 *     isAuto?: boolean,   // Auto-Submitted header / no-reply sender
 *     isBulk?: boolean,   // List-Unsubscribe / Precedence: bulk
 *     messageId?, inReplyTo?, references?: string[] }
 */
var JLMKCandidate = (function () {
  'use strict';

  function core() {
    return typeof module !== 'undefined' && module.exports ? require('./jlmk-core') : JLMK;
  }

  var STATUS = {
    SENT: 'Sent',                 // Gönderildi
    ACKNOWLEDGED: 'Acknowledged', // Alındı onayı geldi
    NO_RESPONSE: 'NoResponse',    // Cevap yok
    REJECTED: 'Rejected',         // Olumsuz
    INTERVIEW: 'Interview',       // Mülakat
  };

  var MAX_RECIPIENTS = 5; // more than this is a mass mail, not an application

  // ---------------------------------------------------------------------------
  // Outgoing: is this sent message a job application?
  // ---------------------------------------------------------------------------
  function recipientsOf(msg) {
    var all = [].concat(msg.to || [], msg.cc || []).join(', ');
    var found = all.match(/[^\s<>",;:]+@[^\s<>",;:]+/g) || [];
    var unique = [];
    found.forEach(function (e) {
      e = e.toLowerCase();
      if (unique.indexOf(e) < 0) unique.push(e);
    });
    return unique;
  }

  /**
   * @param {object} msg outgoing message
   * @param {object} [settings]
   * @return {{isApplication:boolean, score:number, reasons:string[]}}
   */
  function classifyOutgoing(msg, settings) {
    var J = core();
    settings = J.withDefaults(settings);
    var recipients = recipientsOf(msg);
    var me = J.extractEmail(msg.from);
    var no = function (reason) { return { isApplication: false, score: 0, reasons: [reason] }; };

    if (!recipients.length) return no('no recipients');
    if (recipients.length > MAX_RECIPIENTS) return no('mass mail (' + recipients.length + ' recipients)');
    if (msg.isBulk) return no('bulk / mailing list');
    if (recipients.every(function (r) { return r === me; })) return no('sent to yourself');
    if (recipients.every(function (r) { return J.JOB_BOARD_DOMAINS.test(r) || J.NOT_APPLICATION_SENDERS.test(r); })) {
      return no('sent to a job board / no-reply address');
    }
    if (recipients.every(function (r) { return J.isOwnDomain(r, settings); })) return no('internal recipient');

    var s = J.applicationSignals(msg);
    return { isApplication: s.score >= settings.minScore, score: s.score, reasons: s.reasons };
  }

  // ---------------------------------------------------------------------------
  // Incoming: what does this answer say?
  // ---------------------------------------------------------------------------
  var OUT_OF_OFFICE_SUBJECT = /^\s*(automatic reply|auto(matic)?[- ]?reply|autoreply|out of (the )?office|otomatik (yanıt|yanit|cevap)|ofis dışında|ofis disinda|abwesenheit)/i;
  var OUT_OF_OFFICE_BODY = /(i am|i'm|currently) out of (the )?office|i am (currently )?on (annual )?leave|izindeyim|ofis dışındayım|ofis disindayim/i;
  var BOUNCE = /(delivery status notification|undeliverable|undelivered mail|mail delivery (failed|subsystem)|address not found|teslim edilemedi|iletilemedi)/i;

  var REJECTED = [
    /(decided|chosen|decision) to (move|proceed|go) forward with (other|another)/i,
    /not (be )?(moving|proceeding|able to (move|proceed)) forward/i,
    /(regret|sorry) to (inform|let you know)/i,
    /will not be (moving|proceeding|taking)/i,
    /(won't|will not|not) be (inviting|invite) you|not (to )?invite you/i,
    /not been (selected|successful|shortlisted)/i,
    /\bunsuccessful\b/i,
    /position has (now )?been filled/i,
    /(keep|kept) your (cv|resume|details|application) on file/i,
    /talent pool/i,
    /\bolumsuz\b/i,
    /başka (bir )?aday(lar)?la|baska (bir )?aday(lar)?la/i,
    /maalesef.{0,120}(ilerle|devam ede|değerlendirm|degerlendirm|uygun (bul|gör|gor)|olumlu)/i,
    /pozisyon(un)? (doldu|doldurul)/i,
    /aday havuzu/i,
    /süreci ilerletemiyoruz|sureci ilerletemiyoruz/i,
  ];
  var INTERVIEW = [
    /\binterview/i,
    /(schedule|set up|arrange|book) (a |an )?(quick )?(call|meeting|chat|time)/i,
    /your availability|when (are|would) you (be )?available/i,
    /phone screen/i,
    /mülakat|mulakat/i,
    /görüşme(ye| için| icin| planla| ayarla| daveti|mize)|gorusme(ye| icin| planla| ayarla| daveti|mize)/i,
    /uygun olduğunuz (gün|saat|zaman)|uygun oldugunuz (gun|saat|zaman)/i,
    /tanışmak isteriz|tanismak isteriz/i,
  ];
  var ACKNOWLEDGED = [
    /(we|i) (have )?received your (application|cv|resume)/i,
    /thank you for (your )?(applying|application|interest)/i,
    /thanks for (applying|your application)/i,
    /application (has been |was )?received/i,
    /(is|are) (currently )?(being )?review(ing|ed)/i,
    /başvurunuz (bize )?(ulaştı|ulasti|alındı|alindi|alınmıştır|alinmistir)/i,
    /başvurunuz için teşekkür|basvurunuz icin tesekkur/i,
    /değerlendirilmektedir|degerlendirilmektedir/i,
  ];

  /** Drops quoted history so words from *your own* application are not re-read. */
  function stripQuoted(body) {
    var lines = String(body || '').split(/\r?\n/);
    var out = [];
    for (var i = 0; i < lines.length; i++) {
      var l = lines[i];
      if (/^\s*>/.test(l)) break;
      if (/^On .+wrote:\s*$/i.test(l) || /tarihinde .+yazdı:\s*$/i.test(l) || /tarihinde .+yazdi:\s*$/i.test(l)) break;
      if (/^-{2,}\s*(original message|orijinal ileti|özgün ileti)/i.test(l)) break;
      if (/^\s*(from|kimden|gönderen):\s/i.test(l) && i > 0) break;
      out.push(l);
    }
    return out.join('\n');
  }

  /**
   * @param {object} msg incoming message in an application thread
   * @return {{kind:'auto'|'bounce'|'rejected'|'interview'|'acknowledged'|'human', automated:boolean}}
   */
  function classifyReply(msg) {
    var J = core();
    var subject = msg.subject || '';
    var body = stripQuoted(msg.body);
    var from = J.extractEmail(msg.from);
    var automated = !!msg.isAuto || J.NOT_APPLICATION_SENDERS.test(from);
    var both = subject + '\n' + body;
    var any = function (list) { return list.some(function (r) { return r.test(both); }); };

    if (/mailer-daemon|postmaster/i.test(from) || BOUNCE.test(subject)) return { kind: 'bounce', automated: true };
    if (OUT_OF_OFFICE_SUBJECT.test(subject) || OUT_OF_OFFICE_BODY.test(body)) return { kind: 'auto', automated: true };
    if (any(REJECTED)) return { kind: 'rejected', automated: automated };
    if (any(INTERVIEW)) return { kind: 'interview', automated: automated };
    if (any(ACKNOWLEDGED)) return { kind: 'acknowledged', automated: automated };
    // Any other answer: a person (or a system) did react to the application.
    return { kind: automated ? 'acknowledged' : 'human', automated: automated };
  }

  var KIND_TO_STATUS = {
    rejected: STATUS.REJECTED,
    interview: STATUS.INTERVIEW,
    acknowledged: STATUS.ACKNOWLEDGED,
    human: STATUS.ACKNOWLEDGED,
  };

  /** An acknowledgment never downgrades a clearer outcome. */
  function nextStatus(current, incoming) {
    if (incoming === STATUS.ACKNOWLEDGED && (current === STATUS.REJECTED || current === STATUS.INTERVIEW)) return current;
    return incoming;
  }

  // ---------------------------------------------------------------------------
  // Thread → application record
  // ---------------------------------------------------------------------------
  /**
   * Builds the application record for one conversation, or null if the
   * conversation does not contain an application you sent.
   *
   * @param {{messages: object[], me: string[], followUps?: Date[]}} thread
   *        followUps = dates this tool already prepared follow-up drafts
   * @param {Date} now
   * @param {object} [settings]
   */
  function trackThread(thread, now, settings) {
    var J = core();
    settings = J.withDefaults(settings);
    var me = (thread.me || []).map(function (a) { return a.toLowerCase(); });
    var isMine = function (m) { return me.indexOf(J.extractEmail(m.from)) >= 0; };
    var msgs = (thread.messages || []).slice().sort(function (a, b) { return a.date - b.date; });

    var start = -1;
    for (var i = 0; i < msgs.length; i++) {
      if (isMine(msgs[i]) && classifyOutgoing(msgs[i], settings).isApplication) { start = i; break; }
    }
    if (start < 0) return null;

    var first = msgs[start];
    var toHeader = [].concat(first.to || [])[0] || '';
    var recipient = recipientsOf({ to: first.to })[0] || '';
    var followUps = (thread.followUps || []).slice().sort(function (a, b) { return a - b; });
    var language = J.detectLanguage((first.subject || '') + '\n' + (first.body || '').slice(0, 3000), settings.defaultLanguage);

    var app = {
      source: 'email',
      company: J.extractCompany({ to: toHeader, subject: first.subject }),
      position: J.extractPosition(first.subject),
      recipient: recipient,
      recipientName: J.extractFirstName(toHeader, language),
      subject: first.subject || '',
      appliedAt: first.date,
      language: language,
      status: STATUS.SENT,
      history: [{ status: STATUS.SENT, at: first.date, reason: 'application sent' }],
      lastOutboundAt: first.date,
      lastInboundAt: null,
      lastHumanInboundAt: null,
      followUpCount: followUps.length,
      lastFollowUpAt: followUps.length ? followUps[followUps.length - 1] : null,
      bounced: false,
      messageIds: first.messageId ? [first.messageId] : [],
    };

    for (var j = start + 1; j < msgs.length; j++) {
      var m = msgs[j];
      if (m.messageId) app.messageIds.push(m.messageId);
      if (isMine(m)) { app.lastOutboundAt = m.date; continue; }
      applyReply(app, m);
    }

    if (app.status === STATUS.SENT && J.daysBetween(latestOwnActivity(app), now) >= settings.waitDays) {
      app.status = STATUS.NO_RESPONSE;
      app.history.push({ status: STATUS.NO_RESPONSE, at: now, reason: 'no answer after ' + settings.waitDays + ' days' });
    }
    return app;
  }

  /** Updates a record with one incoming message (same thread or matched by matchReply). */
  function applyReply(app, msg) {
    var r = classifyReply(msg);
    if (r.kind === 'auto') return app;
    if (r.kind === 'bounce') { app.bounced = true; return app; }
    app.lastInboundAt = msg.date;
    if (!r.automated) app.lastHumanInboundAt = msg.date;
    var next = nextStatus(app.status, KIND_TO_STATUS[r.kind]);
    if (next !== app.status) {
      app.status = next;
      app.history.push({ status: next, at: msg.date, reason: r.kind + (r.automated ? ' (automated)' : '') });
    }
    return app;
  }

  function latestOwnActivity(app) {
    var t = [app.appliedAt, app.lastOutboundAt, app.lastFollowUpAt].filter(Boolean);
    return new Date(Math.max.apply(null, t.map(function (d) { return d.getTime(); })));
  }

  // ---------------------------------------------------------------------------
  // Job boards: "Your application was sent to Acme" confirmations
  // ---------------------------------------------------------------------------
  var JOB_ALERT = /(job alert|new jobs|jobs (you may|for you|matching)|recommended jobs|is hiring|people (viewed|are looking)|iş alarmı|is alarmi|size uygun (iş|is|ilan)|yeni ilanlar|benzer ilanlar|önerilen ilanlar|onerilen ilanlar|profilinizi görüntüledi)/i;
  var CONFIRMATION = [
    { re: /your application was sent to (.+?)\s*$/i, company: 1 },
    { re: /başvurunuz (.+?) (?:firmasına|şirketine|firmasina|sirketine) (?:iletildi|gönderildi|gonderildi|ulaştı|ulasti)/i, company: 1 },
    { re: /indeed application:\s*(.+?)\s*$/i, position: 1 },
    { re: /application (submitted|sent|received)|your application has been (submitted|sent|received)/i },
    { re: /başvurunuz (alındı|alindi|iletildi|gönderildi|gonderildi|tamamlandı|tamamlandi)|başvurunuz başarıyla|basvurunuz basariyla/i },
  ];

  /**
   * Recognises a job board's "application sent" confirmation (not job alerts).
   * @return {{source:string, company:string, position:string, appliedAt:Date}|null}
   */
  function parseJobBoardConfirmation(msg) {
    var J = core();
    var from = J.extractEmail(msg.from);
    if (!J.JOB_BOARD_DOMAINS.test(from)) return null;
    var subject = msg.subject || '';
    var body = (msg.body || '').slice(0, 3000);
    if (JOB_ALERT.test(subject)) return null;

    var company = '';
    var position = '';
    var matched = false;
    CONFIRMATION.forEach(function (c) {
      var m = subject.match(c.re) || body.match(c.re);
      if (!m) return;
      matched = true;
      if (c.company && !company) company = m[c.company].trim();
      if (c.position && !position) position = m[c.position].trim();
    });
    if (!matched) return null;

    if (!position) {
      var p = body.match(/(?:for|applied to) (?:the )?(.+?) (?:position|role)\b/i) || body.match(/([^\n.]{2,60}?) pozisyonu(?:na|nuza)? (?:için |icin )?(?:yaptığınız |yaptiginiz )?başvuru/i);
      if (p) position = p[1].trim();
    }
    return {
      source: J.domainOf(from).split('.').slice(-2)[0],
      company: company,
      position: position,
      appliedAt: msg.date,
    };
  }

  // ---------------------------------------------------------------------------
  // Matching replies that arrive outside the original thread
  // ---------------------------------------------------------------------------
  /**
   * Finds which application an incoming message belongs to.
   * Order: thread headers → sender's company domain → company named in the text.
   * Ties are broken by the position being mentioned, then by the most recent application.
   *
   * @param {object} msg incoming message
   * @param {Array<{id:string, company:string, position:string, recipient:string, appliedAt:Date, messageIds?:string[]}>} applications
   * @return {{application:object, reason:string}|null}
   */
  function matchReply(msg, applications) {
    var J = core();
    var before = (applications || []).filter(function (a) { return !msg.date || a.appliedAt <= msg.date; });
    var refs = [].concat(msg.inReplyTo || [], msg.references || []);

    var byThread = before.filter(function (a) {
      return (a.messageIds || []).some(function (id) { return refs.indexOf(id) >= 0; });
    });
    if (byThread.length) return { application: pick(byThread, msg), reason: 'same thread' };

    var from = J.extractEmail(msg.from);
    if (!J.isFreeMail(from) && !J.JOB_BOARD_DOMAINS.test(from)) {
      var senderCompany = J.extractCompany({ to: from }).toLowerCase();
      var byDomain = before.filter(function (a) {
        return senderCompany && (a.company || '').toLowerCase() === senderCompany;
      });
      if (byDomain.length) return { application: pick(byDomain, msg), reason: 'sender domain' };
    }

    var text = (msg.subject || '') + '\n' + stripQuoted(msg.body);
    var byName = before.filter(function (a) {
      return a.company && a.company.length >= 3 && new RegExp('\\b' + escapeRe(a.company) + '\\b', 'i').test(text);
    });
    if (byName.length) return { application: pick(byName, msg), reason: 'company mentioned' };
    return null;
  }

  function pick(list, msg) {
    var text = (msg.subject || '') + '\n' + (msg.body || '');
    var byPosition = list.filter(function (a) { return a.position && text.toLowerCase().indexOf(a.position.toLowerCase()) >= 0; });
    var pool = byPosition.length ? byPosition : list;
    return pool.slice().sort(function (a, b) { return b.appliedAt - a.appliedAt; })[0];
  }

  function escapeRe(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // ---------------------------------------------------------------------------
  // Follow-up decision
  // ---------------------------------------------------------------------------
  /**
   * @param {object} app record from trackThread()
   * @param {Date} now
   * @param {object} [settings]
   * @return {{action:'none'|'draft', kind?:'followUp1'|'followUp2', reason:string}}
   */
  function decideFollowUp(app, now, settings) {
    var J = core();
    settings = J.withDefaults(settings);
    var none = function (reason) { return { action: 'none', reason: reason }; };

    if (app.source !== 'email' || !app.recipient) return none('applied via ' + app.source + ' — no address to write to');
    if (app.bounced) return none('the application email bounced');
    if (app.status === STATUS.REJECTED) return none('answer received: rejected');
    if (app.status === STATUS.INTERVIEW) return none('answer received: interview');
    if (app.followUpCount >= settings.maxFollowUps) return none('already ' + app.followUpCount + ' follow-up(s)');
    if (J.daysBetween(app.appliedAt, now) > settings.lookbackDays) return none('older than lookback window');

    var ownLast = latestOwnActivity(app);
    if (app.lastHumanInboundAt && app.lastHumanInboundAt > ownLast) return none('they wrote last — your turn to reply');

    var needed = app.followUpCount === 0 ? settings.waitDays : settings.followUpGapDays;
    var silent = J.daysBetween(ownLast, now);
    if (silent < needed) return none('waiting (' + silent + '/' + needed + ' days)');

    return {
      action: 'draft',
      kind: app.followUpCount === 0 ? 'followUp1' : 'followUp2',
      reason: silent + ' days without an answer',
    };
  }

  /**
   * Text of a follow-up draft, in the language the application was written in.
   * @param {'followUp1'|'followUp2'} kind
   */
  function renderFollowUp(kind, app, settings, overrides) {
    var J = core();
    settings = J.withDefaults(settings);
    var lang = J.normalizeLanguage(app.language);
    return J.compose('candidate', kind, {
      name: app.recipientName || '',
      position: app.position || '',
      company: app.company || '',
      appliedDate: J.formatDate(app.appliedAt, lang),
    }, {
      lang: lang,
      privacy: false,
      signature: [settings.senderName],
      overrides: overrides,
    });
  }

  /** Counts for the summary card: {total, byStatus:{Sent:n,…}}. */
  function summarize(applications) {
    var byStatus = {};
    Object.keys(STATUS).forEach(function (k) { byStatus[STATUS[k]] = 0; });
    (applications || []).forEach(function (a) { byStatus[a.status] = (byStatus[a.status] || 0) + 1; });
    return { total: (applications || []).length, byStatus: byStatus };
  }

  return {
    STATUS: STATUS,
    classifyOutgoing: classifyOutgoing,
    classifyReply: classifyReply,
    stripQuoted: stripQuoted,
    trackThread: trackThread,
    applyReply: applyReply,
    parseJobBoardConfirmation: parseJobBoardConfirmation,
    matchReply: matchReply,
    decideFollowUp: decideFollowUp,
    renderFollowUp: renderFollowUp,
    summarize: summarize,
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = JLMKCandidate;
