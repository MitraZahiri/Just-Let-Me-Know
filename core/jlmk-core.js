/**
 * Just Let Me Know — platform-independent core.
 *
 * Pure functions only (no Gmail / Graph calls) so the exact same file runs
 * inside Google Apps Script (as a global) and in Node.js (as a CommonJS module).
 * Texts live in core/i18n/*.js; candidate-side logic in core/candidate.js.
 */
var JLMK = (function () {
  'use strict';

  // In Node the language files are modules; in Apps Script they share a global.
  // Resolved lazily so file load order never matters.
  function i18n() {
    return typeof module !== 'undefined' && module.exports ? require('./i18n') : JLMK_I18N;
  }

  var ROLE = {
    CANDIDATE: 'candidate', // tracks applications you sent, drafts polite follow-ups
    EMPLOYER: 'employer',   // answers applications you received
  };

  // ---------------------------------------------------------------------------
  // Employer statuses. In Gmail these are labels ("JLMK/Rejected"), in Outlook categories.
  // HR applies one manually; the tool sends the matching template on next run.
  // ---------------------------------------------------------------------------
  var STATUS = {
    RECEIVED: 'Received',     // automatic: no answer after `waitDays`
    IN_REVIEW: 'InReview',    // "we are still evaluating"
    POOL: 'Pool',             // "not now, kept in our talent pool"
    REJECTED: 'Rejected',     // "we moved forward with other candidates"
    FILLED: 'PositionFilled', // "the position has been filled"
  };

  // Control labels, never sent as templates.
  var CONTROL = {
    ROOT: 'JLMK',
    NOTIFIED: 'Notified', // a template was already sent for the current status
    SKIP: 'Skip',         // never touch this thread
  };

  var MAX_FOLLOW_UPS = 2;

  var DEFAULT_SETTINGS = {
    role: ROLE.EMPLOYER,     // 'candidate' | 'employer'
    waitDays: 7,             // days of silence before acting
    followUpGapDays: 7,      // candidate: days between the 1st and 2nd follow-up
    maxFollowUps: MAX_FOLLOW_UPS,
    lookbackDays: 60,        // ignore applications older than this
    mode: 'draft',           // 'draft' (safe default) | 'send' — employer only, must be set explicitly
    dailyLimit: 50,          // max replies per run/day
    minScore: 3,             // classifier threshold
    companyName: '',
    senderName: '',
    defaultLanguage: 'en',   // used when language cannot be detected
    ownDomains: [],          // e.g. ['acme.com'] — internal mail is never an application
    includePrivacyNote: true,
    retentionMonths: 12,
    privacyNoticeUrl: '',    // optional link to the full KVKK/GDPR notice (http/https only)
  };

  /**
   * How replies leave the mailbox. Candidates never get automatic sending,
   * and employers only when `mode` is exactly 'send'.
   * @return {'draft'|'send'}
   */
  function deliveryMode(settings) {
    settings = withDefaults(settings);
    if (settings.role !== ROLE.EMPLOYER) return 'draft';
    return settings.mode === 'send' ? 'send' : 'draft';
  }

  // ---------------------------------------------------------------------------
  // Application signals (shared by the incoming and the outgoing classifier)
  // ---------------------------------------------------------------------------
  var CV_FILE = /(\bcv\b|resume|résumé|curriculum|ozgecmis|özgeçmiş|lebenslauf|portfolio|portfolyo)/i;
  var DOC_EXT = /\.(pdf|docx?|odt|rtf|pages)$/i;

  var SUBJECT_STRONG = [
    /\bjob application\b/i, /\bapplication for\b/i, /\bapplying for\b/i,
    /\b(cv|resume|résumé)\b/i, /iş başvurusu|is basvurusu/i,
    /özgeçmiş|ozgecmis/i, /\bbewerbung\b/i, /\bcandidature\b/i,
  ];
  // "başvuru" alone is used for visas, loans, cards…; it is only strong next to a job word.
  var BASVURU = /başvuru|basvuru/i;
  var JOB_CONTEXT = /(^|[^\p{L}])(pozisyon|iş(e|i|in|te)?(?!\p{L})|cv(?!\p{L})|özgeçmiş|ozgecmis|staj|ilan|kariyer|job|position)/iu;
  var SUBJECT_WEAK = [
    /\bposition\b/i, /\brole\b/i, /\bvacancy\b/i, /\bopening\b/i, /\binternship\b/i,
    /pozisyon|kadro|staj|ilan/i, /\bjob\b/i, /\bcareer\b/i, /kariyer/i,
  ];
  var BODY_PHRASES = [
    /i would like to apply/i, /i am writing to apply/i, /i'm writing to apply/i,
    /please find (attached )?my (cv|resume|résumé)/i, /attached (is )?my (cv|resume|résumé)/i,
    /my (cv|resume|résumé) (is )?attached/i, /interested in the .{0,60}(position|role)/i,
    /cover letter/i, /başvurmak istiyorum/i, /basvurmak istiyorum/i,
    /özgeçmişim(i)? ek(te|tedir|liyorum)/i, /ozgecmisim(i)? ek(te|tedir|liyorum)/i,
    /pozisyonu(na|nuza) başvur/i, /ekte (cv|özgeçmiş)/i, /ön yazı|on yazi/i,
  ];

  // Things that look like an application on the surface but are not.
  var NEGATIVE_SUBJECT = /\b(invoice|receipt|order|payment|statement|newsletter|unsubscribe|digest)\b|fatura|makbuz|sipariş|siparis|ödeme|odeme|ekstre|bülten|bulten|abonelik/i;
  // Non-job applications. "burs" but not "Bursa", "kart" but not "Kartal".
  var NEGATIVE_APPLICATION = /(^|[^\p{L}])(vize|kredi|burs(?!a)|kart(ı|i|ınız|iniz|lar|ları|lari)?(?!\p{L})|abonelik|üyelik|uyelik|ruhsat|patent|tender)/iu;

  // Cheap subject check before downloading a message (shared by Gmail and Outlook).
  // PREFILTER_WORDS are whole words for Gmail search; the regex is the substring version.
  var PREFILTER_WORDS = ['cv', 'resume', 'application', 'applying', 'başvuru', 'basvuru', 'başvurusu', 'basvurusu',
    'başvurum', 'özgeçmiş', 'ozgecmis', 'özgeçmişim', 'pozisyon', 'pozisyonu', 'position', 'staj', 'internship'];
  var PREFILTER = /(cv|resume|résumé|application|applying|ba[sş]vuru|[oö]zge[cç]mi[sş]|pozisyon|position|staj|internship)/;

  /** True when a message is worth classifying at all. */
  function prefilter(msg) {
    return !!msg.hasAttachments || PREFILTER.test(plainLower(msg.subject));
  }
  var NEGATIVE_BODY = [
    /unsubscribe|abonelikten çık|abonelikten cik/i,                                      // newsletter
    /(can|could) you (take a )?(look|check|review)|feedback on my (cv|resume)/i,        // "check my CV?" to a friend
    /bakar m[ıi]s[ıi]n|göz atar m[ıi]s[ıi]n|goz atar m[ıi]s[ıi]n|fikrini|ne düşünüyorsun|ne dusunuyorsun/i,
    /what do you think/i,
  ];

  var NOT_APPLICATION_SENDERS = /(no-?reply|do-?not-?reply|mailer-daemon|postmaster|notifications?@|newsletter|bounce)/i;
  var JOB_BOARD_DOMAINS = /@(.*\.)?(linkedin\.com|kariyer\.net|indeed\.com|glassdoor\.com|secretcv\.com|yenibiris\.com|eleman\.net|xing\.com)$/i;
  var FREE_MAIL_DOMAINS = /^(gmail|googlemail|hotmail|outlook|live|msn|yahoo|ymail|icloud|me|mac|yandex|aol|gmx|web|proton|protonmail|mail|zoho|tutanota)\.[a-z.]+$/i;

  /**
   * Scores how much a message *reads like* a job application, ignoring who sent it.
   * @param {{subject:string, body:string, attachments:string[]}} msg
   * @return {{score:number, reasons:string[]}}
   */
  function applicationSignals(msg) {
    var reasons = [];
    var score = 0;

    var attachments = msg.attachments || [];
    var cvFile = attachments.some(function (n) { return CV_FILE.test(n) && DOC_EXT.test(n); });
    var anyDoc = attachments.some(function (n) { return DOC_EXT.test(n); });
    if (cvFile) { score += 3; reasons.push('CV-named attachment'); }
    else if (anyDoc) { score += 1; reasons.push('document attachment'); }

    var subject = plainLower(msg.subject);
    var basvuruInContext = BASVURU.test(subject) && JOB_CONTEXT.test(subject);
    if (basvuruInContext || SUBJECT_STRONG.some(function (r) { return r.test(subject); })) { score += 2; reasons.push('subject: application keyword'); }
    else if (BASVURU.test(subject) || SUBJECT_WEAK.some(function (r) { return r.test(subject); })) { score += 1; reasons.push('subject: job keyword'); }

    var body = plainLower((msg.body || '').slice(0, 5000));
    var hits = BODY_PHRASES.filter(function (r) { return r.test(body); }).length;
    if (hits) { score += Math.min(hits, 2); reasons.push('body: ' + hits + ' application phrase(s)'); }

    if (NEGATIVE_SUBJECT.test(subject)) { score -= 3; reasons.push('subject: invoice/order/newsletter'); }
    if (NEGATIVE_APPLICATION.test(subject)) { score -= 3; reasons.push('subject: visa/loan/scholarship/card… application'); }
    if (NEGATIVE_BODY.some(function (r) { return r.test(body); })) { score -= 3; reasons.push('body: newsletter or personal request'); }

    return { score: score, reasons: reasons };
  }

  /**
   * Employer side: is this *incoming* message a job application?
   * @param {{subject:string, body:string, from:string, attachments:string[],
   *          isBulk?:boolean}} msg
   * @param {object} [settings]
   * @return {{isApplication:boolean, score:number, reasons:string[]}}
   */
  function classify(msg, settings) {
    settings = withDefaults(settings);
    var email = extractEmail(msg.from);

    if (!email) return result(false, 0, ['no sender address']);
    if (NOT_APPLICATION_SENDERS.test(email)) return result(false, 0, ['automated sender']);
    if (JOB_BOARD_DOMAINS.test(email)) return result(false, 0, ['job board notification (cannot reply to candidate)']);
    if (msg.isBulk) return result(false, 0, ['bulk / mailing list']);
    if (isOwnDomain(email, settings)) return result(false, 0, ['internal sender']);

    var s = applicationSignals(msg);
    return result(s.score >= settings.minScore, s.score, s.reasons);
  }

  function result(isApplication, score, reasons) {
    return { isApplication: isApplication, score: score, reasons: reasons };
  }

  function isOwnDomain(email, settings) {
    var domain = domainOf(email);
    return (settings.ownDomains || []).some(function (d) { return d && domain === String(d).toLowerCase().replace(/^@/, ''); });
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  function extractEmail(from) {
    var m = String(from || '').match(/<([^>]+)>/) || String(from || '').match(/([^\s<>"]+@[^\s<>"]+)/);
    return m ? m[1].trim().toLowerCase() : '';
  }

  function domainOf(email) {
    var e = extractEmail(email) || String(email || '').toLowerCase();
    return e.indexOf('@') >= 0 ? e.split('@')[1] : '';
  }

  function isFreeMail(email) {
    return FREE_MAIL_DOMAINS.test(domainOf(email));
  }

  // Turkish casing without relying on Intl locales (not guaranteed in Apps Script).
  function trLower(s) {
    return String(s || '').replace(/I/g, 'ı').replace(/İ/g, 'i').toLowerCase();
  }
  function trUpper(s) {
    return String(s || '').replace(/i/g, 'İ').replace(/ı/g, 'I').toUpperCase();
  }
  // Lower-casing that only maps İ → i (avoids "i̇") and leaves ASCII I as i.
  function plainLower(s) {
    return String(s || '').replace(/İ/g, 'i').toLowerCase();
  }

  var TR_LETTERS = /[ğüşıöçĞÜŞİÖÇ]/;

  /**
   * "Ayşe Yılmaz <ayse@x.com>" -> "Ayşe"; falls back to '' when unknown.
   * Turkish lower-casing (I → ı) is used only when the name itself has Turkish letters,
   * because ASCII capitals carry no dot information ("KADIR" is Kadir, not Kadır).
   * @param {string} from
   * @param {string} [lang] 'tr' makes a lower-case initial i become İ
   */
  function extractFirstName(from, lang) {
    var raw = String(from || '');
    var display = raw.indexOf('<') > 0 ? raw.slice(0, raw.indexOf('<')) : '';
    display = display.replace(/["']/g, '').trim();
    if (!display || display.indexOf('@') >= 0) return '';
    if (display.indexOf(',') > 0) display = display.split(',')[1].trim(); // "Yılmaz, Ayşe"
    var first = display.split(/\s+/)[0];
    if (!first || first.length < 2) return '';
    if (/^(hr|ik|team|careers?|jobs?|recruiting|recruitment|talent|insan)$/i.test(plainLower(first))) return ''; // role mailbox, not a person
    var turkish = TR_LETTERS.test(first);
    var head = turkish || lang === 'tr' ? trUpper(first.charAt(0)) : first.charAt(0).toUpperCase();
    var tail = turkish ? trLower(first.slice(1)) : plainLower(first.slice(1));
    return head + tail;
  }

  /** Best-effort position title from the subject line. */
  function extractPosition(subject) {
    var s = String(subject || '').replace(/^\s*((re|fw|fwd|ynt|ilt)\s*:\s*)+/i, '').trim();
    var patterns = [
      /application for (?:the )?(.+?)(?: position| role)?(?: at .+)?$/i,
      /applying for (?:the )?(.+?)(?: position| role)?(?: at .+)?$/i,
      /^(.+?) (?:position|role) application$/i,
      /^(.+?) pozisyonu(?: için| icin)? başvuru/i,
      /^(.+?) pozisyonu(?: için| icin)? basvuru/i,
      /başvuru(?:su)?\s*[-–:]\s*(.+)$/i,
      /application\s*[-–:]\s*(.+)$/i,
    ];
    for (var i = 0; i < patterns.length; i++) {
      var m = s.match(patterns[i]);
      if (m && m[1] && m[1].length <= 80) return m[1].replace(/\s*[-–]\s*$/, '').trim();
    }
    return '';
  }

  // Second-level domains under which the company name sits one label further left.
  var SLD = /^(com|co|org|net|gov|edu|ac|gen|biz|info|k12|bel|av|web)$/;

  /**
   * Best-effort company name for an application.
   * Prefers the recipient's company domain, then " at Acme" / "@ Acme" in the subject.
   * @param {{to:string, subject?:string}} msg
   */
  function extractCompany(msg) {
    var email = extractEmail(msg.to);
    if (email && !isFreeMail(email) && !JOB_BOARD_DOMAINS.test(email)) {
      var parts = domainOf(email).split('.');
      var i = parts.length - 2;
      if (i > 0 && SLD.test(parts[i]) && parts[i + 1].length === 2) i--;
      var name = parts[i] || '';
      if (name.length >= 2) return name.charAt(0).toUpperCase() + name.slice(1);
    }
    var m = String(msg.subject || '').match(/\s(?:at|@)\s+([^\-–|,]{2,40})\s*$/i);
    return m ? m[1].trim() : '';
  }

  var TR_CHARS = /[ğüşıöçĞÜŞİÖÇ]/g;
  var TR_WORDS = /\b(merhaba|başvuru|basvuru|özgeçmiş|ozgecmis|pozisyon|saygılarımla|saygilarimla|ekte|teşekkür|tesekkur|ve|için|icin|ile)\b/gi;
  var EN_WORDS = /\b(dear|application|position|regards|attached|the|and|for|with|sincerely)\b/gi;

  function detectLanguage(text, fallback) {
    var t = String(text || '');
    var tr = (t.match(TR_CHARS) || []).length * 0.5 + (t.match(TR_WORDS) || []).length;
    var en = (t.match(EN_WORDS) || []).length;
    if (tr === 0 && en === 0) return fallback || 'en';
    return tr >= en ? 'tr' : 'en';
  }

  function daysBetween(a, b) {
    return Math.floor((b.getTime() - a.getTime()) / 86400000);
  }

  function withDefaults(settings) {
    var out = {};
    var k;
    for (k in DEFAULT_SETTINGS) out[k] = DEFAULT_SETTINGS[k];
    for (k in (settings || {})) if (settings[k] !== undefined && settings[k] !== null && settings[k] !== '') out[k] = settings[k];
    if (out.role !== ROLE.CANDIDATE) out.role = ROLE.EMPLOYER;
    out.maxFollowUps = Math.max(0, Math.min(MAX_FOLLOW_UPS, Number(out.maxFollowUps) || 0));
    out.privacyNoticeUrl = /^https?:\/\/\S+$/i.test(String(out.privacyNoticeUrl)) ? String(out.privacyNoticeUrl) : '';
    return out;
  }

  // ---------------------------------------------------------------------------
  // Employer decision engine
  // ---------------------------------------------------------------------------
  /**
   * Decides what to do with one received application thread.
   *
   * @param {{
   *   receivedAt: Date,          // first candidate message
   *   lastCandidateAt?: Date,    // most recent message from the candidate
   *   lastOwnReplyAt?: Date|null,// most recent message sent by us (any, manual or auto)
   *   statuses: string[],        // status labels currently on the thread
   *   notifiedStatuses: string[],// statuses whose message was actually sent
   *   draftedStatuses?: string[],// statuses with a draft still waiting to be sent
   *   skip: boolean
   * }} thread
   * @param {Date} now
   * @param {object} [settings]
   * @return {{action:'none'|'reply', status?:string, reason:string}}
   */
  function decide(thread, now, settings) {
    settings = withDefaults(settings);
    if (thread.skip) return none('marked Skip');

    var notified = thread.notifiedStatuses || [];
    var drafted = thread.draftedStatuses || [];

    // 1) A status HR set manually always wins — once, however old the thread is.
    var order = [STATUS.FILLED, STATUS.REJECTED, STATUS.POOL, STATUS.IN_REVIEW];
    for (var i = 0; i < order.length; i++) {
      var st = order[i];
      if ((thread.statuses || []).indexOf(st) >= 0) {
        if (notified.indexOf(st) >= 0) return none('status ' + st + ' already sent');
        if (drafted.indexOf(st) >= 0) return none('draft for ' + st + ' is waiting to be sent');
        return { action: 'reply', status: st, reason: 'status label ' + st };
      }
    }

    // 2) Automatic "we received it" notice after silence — only within lookbackDays.
    var age = daysBetween(thread.receivedAt, now);
    if (age > settings.lookbackDays) return none('older than lookback window');
    if (notified.length) return none('candidate already informed');
    if (drafted.indexOf(STATUS.RECEIVED) >= 0) return none('draft for Received is waiting to be sent');
    if (thread.lastOwnReplyAt && (!thread.lastCandidateAt || thread.lastOwnReplyAt >= thread.lastCandidateAt)) {
      return none('a human already replied');
    }
    if (age < settings.waitDays) return none('waiting (' + age + '/' + settings.waitDays + ' days)');
    return { action: 'reply', status: STATUS.RECEIVED, reason: 'no answer after ' + age + ' days' };
  }

  function none(reason) { return { action: 'none', reason: reason }; }

  /**
   * What happened to a draft we prepared earlier?
   * @param {{draftedAt:Date|null, lastCandidateAt?:Date|null, draftExists:boolean, ownSentDates:Date[]}} d
   *        draftedAt = when we created it (null if unknown: then anything sent after the
   *        candidate's last message counts); ownSentDates = our *sent* (non-draft) messages
   * @return {'sent'|'pending'|'deleted'}
   */
  function resolveDraft(d) {
    var since = d.draftedAt || d.lastCandidateAt || null;
    var sent = (d.ownSentDates || []).some(function (t) { return !since || t >= since; });
    if (sent) return 'sent';
    return d.draftExists ? 'pending' : 'deleted';
  }

  // ---------------------------------------------------------------------------
  // Texts
  // ---------------------------------------------------------------------------
  function languages() {
    var all = i18n();
    return Object.keys(all).map(function (code) {
      return { code: code, name: all[code].meta.name, dir: all[code].meta.dir, complete: all[code].meta.complete };
    });
  }

  function normalizeLanguage(lang) {
    return i18n()[lang] ? lang : 'en';
  }

  /**
   * Looks up a text: custom override → requested language → English.
   * @param {string} lang
   * @param {string} path e.g. 'employer.Received'
   * @param {object} [overrides] same shape as the language files, keyed by language
   */
  function text(lang, path, overrides) {
    var all = i18n();
    var sources = [overrides && overrides[lang], all[lang], overrides && overrides.en, all.en];
    var keys = path.split('.');
    for (var i = 0; i < sources.length; i++) {
      var v = sources[i];
      for (var j = 0; j < keys.length && v !== undefined && v !== null; j++) v = v[keys[j]];
      if (v !== undefined && v !== null) return v;
    }
    return '';
  }

  /** Fills {{key}}, {{#key}}…{{/key}} (only if set) and {{^key}}…{{/key}} (only if empty). */
  function fill(str, vars) {
    var present = function (k) { return vars[k] !== undefined && vars[k] !== null && vars[k] !== ''; };
    return String(str)
      .replace(/\{\{([#^])(\w+)\}\}([\s\S]*?)\{\{\/\2\}\}/g, function (_, kind, k, inner) {
        return (kind === '#') === present(k) ? inner : '';
      })
      .replace(/\{\{(\w+)\}\}/g, function (_, k) { return present(k) ? String(vars[k]) : ''; });
  }

  function capitalizeFirst(s, lang) {
    return s ? (lang === 'tr' ? trUpper(s.charAt(0)) : s.charAt(0).toUpperCase()) + s.slice(1) : s;
  }

  /** "12 Ekim" / "October 12" in the requested language (English fallback). */
  function formatDate(date, lang) {
    var months = text(lang, 'months');
    var fmt = text(lang, 'dateFormat');
    if (!months || !fmt) { months = text('en', 'months'); fmt = text('en', 'dateFormat'); }
    return fill(fmt, { day: date.getDate(), month: months[date.getMonth()] });
  }

  /**
   * Builds a full message: greeting, body, optional privacy note, sign-off.
   * @param {'employer'|'candidate'} side
   * @param {string} key template key inside that side
   * @param {object} vars placeholder values; `name` drives the greeting
   * @param {{lang:string, privacy?:boolean, signature:string[], overrides?:object}} opts
   */
  function compose(side, key, vars, opts) {
    var lang = opts.lang;
    var t = function (k) { return text(lang, side + '.' + k, opts.overrides); };
    var body = fill(t(key), vars).replace(/^\s+/, '');
    var parts = [
      vars.name ? fill(t('greeting'), vars) : t('greetingNoName'),
      capitalizeFirst(body, lang),
    ];
    if (opts.privacy) parts.push(fill(t('privacy'), vars));
    parts.push(t('signoff') + '\n' + opts.signature.filter(Boolean).join('\n'));
    return parts.join('\n\n').trim() + '\n';
  }

  /**
   * Builds the employer's reply to a candidate.
   * @param {string} status one of STATUS values
   * @param {{name?:string, position?:string, language?:string}} ctx
   * @param {object} [settings]
   * @param {object} [overrides] custom texts shaped like the language files, e.g. {en:{employer:{Received:'…'}}}
   * @return {string}
   */
  function render(status, ctx, settings, overrides) {
    settings = withDefaults(settings);
    var lang = normalizeLanguage(ctx.language);
    var key = text('en', 'employer.' + status) ? status : STATUS.RECEIVED;
    return compose('employer', key, {
      name: ctx.name || '',
      position: ctx.position || '',
      company: settings.companyName || (lang === 'tr' ? 'şirketimiz' : 'our company'),
      retentionMonths: settings.retentionMonths,
      privacyNoticeUrl: settings.privacyNoticeUrl,
    }, {
      lang: lang,
      privacy: settings.includePrivacyNote,
      signature: [settings.senderName, settings.companyName],
      overrides: overrides,
    });
  }

  return {
    ROLE: ROLE,
    STATUS: STATUS,
    CONTROL: CONTROL,
    MAX_FOLLOW_UPS: MAX_FOLLOW_UPS,
    DEFAULT_SETTINGS: DEFAULT_SETTINGS,
    JOB_BOARD_DOMAINS: JOB_BOARD_DOMAINS,
    NOT_APPLICATION_SENDERS: NOT_APPLICATION_SENDERS,
    PREFILTER_WORDS: PREFILTER_WORDS,
    applicationSignals: applicationSignals,
    prefilter: prefilter,
    classify: classify,
    decide: decide,
    resolveDraft: resolveDraft,
    deliveryMode: deliveryMode,
    render: render,
    compose: compose,
    text: text,
    fill: fill,
    formatDate: formatDate,
    languages: languages,
    normalizeLanguage: normalizeLanguage,
    detectLanguage: detectLanguage,
    extractEmail: extractEmail,
    extractFirstName: extractFirstName,
    trLower: trLower,
    extractPosition: extractPosition,
    extractCompany: extractCompany,
    domainOf: domainOf,
    isFreeMail: isFreeMail,
    isOwnDomain: isOwnDomain,
    withDefaults: withDefaults,
    daysBetween: daysBetween,
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = JLMK;
