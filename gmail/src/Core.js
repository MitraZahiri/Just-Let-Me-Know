// GENERATED from core/ by `npm run build:gmail` — do not edit here.

// ===== core/i18n/en.js =====
/**
 * English texts. This file is the reference: every other language has the same keys.
 *
 * Placeholders: {{key}}. Sections: {{#key}}…{{/key}} renders only when `key` has a
 * value, {{^key}}…{{/key}} only when it is empty. Tone: warm, short, never blaming.
 */
var JLMK_I18N = typeof JLMK_I18N !== 'undefined' ? JLMK_I18N : {};

JLMK_I18N.en = {
  meta: { name: 'English', dir: 'ltr', complete: true },
  months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  dateFormat: '{{month}} {{day}}',

  // Employer → candidate.
  employer: {
    greeting: 'Dear {{name}},',
    greetingNoName: 'Hello,',
    signoff: 'Kind regards,',
    privacy: 'Your data is stored only for recruitment purposes for up to {{retentionMonths}} months. You can ask us to delete it at any time by replying to this email.',
    Received:
      'Thank you for your application{{#position}} for the {{position}} position{{/position}}. We want to let you know that it reached us and has been seen by our team.\n\n' +
      'We are not able to move forward with it right now, but we would like to keep your CV in our talent pool and will reach out to you if a suitable opportunity opens up.\n\n' +
      'We appreciate your interest in {{company}} and wish you the best in your search.',
    InReview:
      'Thank you for your application{{#position}} for the {{position}} position{{/position}}. Your application is currently being reviewed by our team. ' +
      'We will get back to you as soon as we have an update — we did not want to leave you without news in the meantime.',
    Pool:
      'Thank you for your application{{#position}} for the {{position}} position{{/position}}. We have no matching opening at the moment, ' +
      'but we were glad to read your CV and have added it to our talent pool. We will contact you if a suitable role comes up.',
    Rejected:
      'Thank you for your application{{#position}} for the {{position}} position{{/position}} and for the time you invested. After careful consideration, we have decided to move forward with other candidates for this role.\n\n' +
      'This was not an easy decision, and we sincerely wish you success in your search.',
    PositionFilled:
      'Thank you for your application{{#position}} for the {{position}} position{{/position}}. We want to let you know that this position has now been filled.\n\n' +
      'We appreciate your interest in {{company}} and would be happy to see your application again for future openings.',
  },

  // Candidate → employer (always prepared as drafts).
  candidate: {
    greeting: 'Hello {{name}},',
    greetingNoName: 'Hello,',
    signoff: 'Best regards,',
    followUp1:
      'I hope you are doing well. I applied {{#position}}for the {{position}} role {{/position}}{{#company}}at {{company}} {{/company}}on {{appliedDate}} and wanted to briefly check in.\n\n' +
      'I am still very interested, and any update on where things stand would be much appreciated — even a short note helps me plan.\n\n' +
      'Thank you for your time.',
    followUp2:
      'I am following up one last time on my application{{#position}} for the {{position}} role{{/position}} from {{appliedDate}}.\n\n' +
      'If the position has been filled or you have decided to go with other candidates, a one-line reply would be completely fine and would really help me. ' +
      'If it is still open, I would be glad to share anything else you need.\n\n' +
      'Thank you, and all the best.',
  },
};

if (typeof module !== 'undefined' && module.exports) module.exports = JLMK_I18N.en;

// ===== core/i18n/tr.js =====
/**
 * Türkçe metinler. Anahtarlar en.js ile birebir aynı olmalı.
 * Ton: sıcak, kısa, suçlamasız.
 */
var JLMK_I18N = typeof JLMK_I18N !== 'undefined' ? JLMK_I18N : {};

JLMK_I18N.tr = {
  meta: { name: 'Türkçe', dir: 'ltr', complete: true },
  months: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'],
  dateFormat: '{{day}} {{month}}',

  employer: {
    greeting: 'Merhaba {{name}},',
    greetingNoName: 'Merhaba,',
    signoff: 'Saygılarımızla,',
    privacy: 'Kişisel verileriniz yalnızca işe alım amacıyla en fazla {{retentionMonths}} ay süreyle saklanır (KVKK). Bu e-postayı yanıtlayarak verilerinizin silinmesini istediğiniz zaman talep edebilirsiniz.',
    Received:
      '{{#position}}{{position}} pozisyonu için {{/position}}başvurunuz için teşekkür ederiz. Başvurunuzun bize ulaştığını ve ekibimiz tarafından görüldüğünü bildirmek isteriz.\n\n' +
      'Şu an için süreci ilerletemiyoruz; ancak özgeçmişinizi aday havuzumuzda tutmak isteriz. Uygun bir pozisyon açıldığında sizinle iletişime geçeceğiz.\n\n' +
      '{{company}} ile ilgilendiğiniz için teşekkür eder, kariyerinizde başarılar dileriz.',
    InReview:
      '{{#position}}{{position}} pozisyonu için {{/position}}başvurunuz için teşekkür ederiz. Başvurunuz şu anda ekibimiz tarafından değerlendirilmektedir. ' +
      'Bir gelişme olduğunda en kısa sürede size dönüş yapacağız; bu süreçte sizi habersiz bırakmak istemedik.',
    Pool:
      '{{#position}}{{position}} pozisyonu için {{/position}}başvurunuz için teşekkür ederiz. Şu an için uygun açık pozisyonumuz bulunmuyor; ancak özgeçmişinizi ' +
      'memnuniyetle aday havuzumuza ekledik. Uygun bir pozisyon açıldığında sizinle iletişime geçeceğiz.',
    Rejected:
      '{{#position}}{{position}} pozisyonu için {{/position}}başvurunuz ve ayırdığınız zaman için teşekkür ederiz. Yaptığımız değerlendirme sonucunda bu pozisyon için başka adaylarla ilerlemeye karar verdik.\n\n' +
      'Kolay bir karar olmadı; kariyerinizde başarılar diliyoruz.',
    PositionFilled:
      '{{#position}}{{position}} pozisyonu için {{/position}}başvurunuz için teşekkür ederiz. Bu pozisyonun dolduğunu bildirmek isteriz.\n\n' +
      '{{company}} ile ilgilendiğiniz için teşekkür ederiz; gelecekteki ilanlarımızda başvurunuzu yeniden görmekten memnuniyet duyarız.',
  },

  candidate: {
    // İsimle hitapta Hanım/Bey seçimi tahmin edilemeyeceği için hep genel selamlama.
    greeting: 'Merhaba,',
    greetingNoName: 'Merhaba,',
    signoff: 'Saygılarımla,',
    followUp1:
      'Umarım iyisinizdir. {{appliedDate}} tarihinde {{#position}}{{position}} pozisyonu için {{/position}}{{#company}}{{company}} şirketine {{/company}}başvuruda bulunmuştum; süreç hakkında kısaca bilgi almak istedim.\n\n' +
      'Pozisyonla hâlâ çok ilgileniyorum. Kısa bir dönüş bile planlama yapmama çok yardımcı olur.\n\n' +
      'Zaman ayırdığınız için teşekkür ederim.',
    followUp2:
      '{{appliedDate}} tarihinde {{#position}}{{position}} pozisyonu için {{/position}}yaptığım başvuruyla ilgili son bir kez yazıyorum.\n\n' +
      'Pozisyon dolduysa ya da başka adaylarla ilerlemeye karar verdiyseniz, tek satırlık bir yanıt bile benim için çok değerli olur. ' +
      'Hâlâ açıksa, ihtiyaç duyacağınız her bilgiyi memnuniyetle paylaşırım.\n\n' +
      'Teşekkür eder, iyi çalışmalar dilerim.',
  },
};

if (typeof module !== 'undefined' && module.exports) module.exports = JLMK_I18N.tr;

// ===== core/i18n/de.js =====
/**
 * Deutsch — SKELETON. Every `null` falls back to English until translated.
 * Same keys as en.js; see the placeholder/section rules there.
 */
var JLMK_I18N = typeof JLMK_I18N !== 'undefined' ? JLMK_I18N : {};

JLMK_I18N.de = {
  meta: { name: 'Deutsch', dir: 'ltr', complete: false },
  months: null,
  dateFormat: null,

  employer: {
    greeting: null,
    greetingNoName: null,
    signoff: null,
    privacy: null,
    Received: null,
    InReview: null,
    Pool: null,
    Rejected: null,
    PositionFilled: null,
  },

  candidate: {
    greeting: null,
    greetingNoName: null,
    signoff: null,
    followUp1: null,
    followUp2: null,
  },
};

if (typeof module !== 'undefined' && module.exports) module.exports = JLMK_I18N.de;

// ===== core/i18n/ar.js =====
/**
 * العربية — SKELETON. Every `null` falls back to English until translated.
 * Same keys as en.js; see the placeholder/section rules there. Right-to-left.
 */
var JLMK_I18N = typeof JLMK_I18N !== 'undefined' ? JLMK_I18N : {};

JLMK_I18N.ar = {
  meta: { name: 'العربية', dir: 'rtl', complete: false },
  months: null,
  dateFormat: null,

  employer: {
    greeting: null,
    greetingNoName: null,
    signoff: null,
    privacy: null,
    Received: null,
    InReview: null,
    Pool: null,
    Rejected: null,
    PositionFilled: null,
  },

  candidate: {
    greeting: null,
    greetingNoName: null,
    signoff: null,
    followUp1: null,
    followUp2: null,
  },
};

if (typeof module !== 'undefined' && module.exports) module.exports = JLMK_I18N.ar;

// ===== core/jlmk-core.js =====
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
    /\b(cv|resume|résumé)\b/i, /iş başvurusu|is basvurusu/i, /başvuru|basvuru/i,
    /özgeçmiş|ozgecmis/i, /\bbewerbung\b/i, /\bcandidature\b/i,
  ];
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

    var subject = msg.subject || '';
    if (SUBJECT_STRONG.some(function (r) { return r.test(subject); })) { score += 2; reasons.push('subject: application keyword'); }
    else if (SUBJECT_WEAK.some(function (r) { return r.test(subject); })) { score += 1; reasons.push('subject: job keyword'); }

    var body = (msg.body || '').slice(0, 5000);
    var hits = BODY_PHRASES.filter(function (r) { return r.test(body); }).length;
    if (hits) { score += Math.min(hits, 2); reasons.push('body: ' + hits + ' application phrase(s)'); }

    if (NEGATIVE_SUBJECT.test(subject)) { score -= 3; reasons.push('subject: invoice/order/newsletter'); }
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

  /** "Ayşe Yılmaz <ayse@x.com>" -> "Ayşe"; falls back to '' when unknown. */
  function extractFirstName(from) {
    var raw = String(from || '');
    var display = raw.indexOf('<') > 0 ? raw.slice(0, raw.indexOf('<')) : '';
    display = display.replace(/["']/g, '').trim();
    if (!display || display.indexOf('@') >= 0) return '';
    if (display.indexOf(',') > 0) display = display.split(',')[1].trim(); // "Yılmaz, Ayşe"
    var first = display.split(/\s+/)[0];
    if (!first || first.length < 2) return '';
    if (/^(hr|ik|İK|team|careers?|jobs?|recruiting|recruitment|talent|insan)$/i.test(first)) return ''; // role mailbox, not a person
    return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
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
   *   notifiedStatuses: string[],// statuses we already sent a template for
   *   skip: boolean
   * }} thread
   * @param {Date} now
   * @param {object} [settings]
   * @return {{action:'none'|'reply', status?:string, reason:string}}
   */
  function decide(thread, now, settings) {
    settings = withDefaults(settings);
    if (thread.skip) return none('marked Skip');

    var age = daysBetween(thread.receivedAt, now);
    if (age > settings.lookbackDays) return none('older than lookback window');

    var notified = thread.notifiedStatuses || [];

    // 1) A status HR set manually always wins — send it once.
    var order = [STATUS.FILLED, STATUS.REJECTED, STATUS.POOL, STATUS.IN_REVIEW];
    for (var i = 0; i < order.length; i++) {
      var st = order[i];
      if ((thread.statuses || []).indexOf(st) >= 0) {
        if (notified.indexOf(st) >= 0) return none('status ' + st + ' already sent');
        return { action: 'reply', status: st, reason: 'status label ' + st };
      }
    }

    // 2) Automatic "we received it" notice after silence.
    if (notified.length) return none('candidate already informed');
    if (thread.lastOwnReplyAt && (!thread.lastCandidateAt || thread.lastOwnReplyAt >= thread.lastCandidateAt)) {
      return none('a human already replied');
    }
    if (age < settings.waitDays) return none('waiting (' + age + '/' + settings.waitDays + ' days)');
    return { action: 'reply', status: STATUS.RECEIVED, reason: 'no answer after ' + age + ' days' };
  }

  function none(reason) { return { action: 'none', reason: reason }; }

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
    return s ? s.charAt(0).toLocaleUpperCase(lang === 'tr' ? 'tr' : 'en') + s.slice(1) : s;
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
    applicationSignals: applicationSignals,
    classify: classify,
    decide: decide,
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

// ===== core/candidate.js =====
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

    var app = {
      source: 'email',
      company: J.extractCompany({ to: toHeader, subject: first.subject }),
      position: J.extractPosition(first.subject),
      recipient: recipient,
      recipientName: J.extractFirstName(toHeader),
      subject: first.subject || '',
      appliedAt: first.date,
      language: J.detectLanguage((first.subject || '') + '\n' + (first.body || '').slice(0, 3000), settings.defaultLanguage),
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
