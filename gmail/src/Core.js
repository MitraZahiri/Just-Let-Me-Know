// GENERATED from core/jlmk-core.js by `npm run build:gmail` — do not edit here.
/**
 * Just Let Me Know — platform-independent core.
 *
 * Pure functions only (no Gmail / Graph calls) so the exact same file runs
 * inside Google Apps Script (as a global) and in Node.js (as a CommonJS module).
 */
var JLMK = (function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Statuses. In Gmail these are labels ("JLMK/Rejected"), in Outlook categories.
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

  var DEFAULT_SETTINGS = {
    waitDays: 7,             // days of silence before the automatic "Received" notice
    lookbackDays: 60,        // ignore applications older than this
    mode: 'draft',           // 'draft' (safe default) | 'send'
    dailyLimit: 50,          // max replies per run/day
    minScore: 3,             // classifier threshold
    companyName: '',
    senderName: '',
    defaultLanguage: 'en',   // used when language cannot be detected
    ownDomains: [],          // e.g. ['acme.com'] — internal mail is never an application
    includePrivacyNote: true,
    retentionMonths: 12,
  };

  // ---------------------------------------------------------------------------
  // Classifier
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
  var NOT_APPLICATION_SENDERS = /(no-?reply|do-?not-?reply|mailer-daemon|postmaster|notifications?@|newsletter|bounce)/i;
  var JOB_BOARD_DOMAINS = /@(.*\.)?(linkedin\.com|kariyer\.net|indeed\.com|glassdoor\.com|secretcv\.com|yenibiris\.com|eleman\.net|xing\.com)/i;

  /**
   * @param {{subject:string, body:string, from:string, attachments:string[],
   *          isBulk?:boolean}} msg
   * @param {object} [settings]
   * @return {{isApplication:boolean, score:number, reasons:string[]}}
   */
  function classify(msg, settings) {
    settings = withDefaults(settings);
    var reasons = [];
    var score = 0;
    var from = (msg.from || '').toLowerCase();
    var email = extractEmail(from);

    if (!email) return result(false, 0, ['no sender address']);
    if (NOT_APPLICATION_SENDERS.test(email)) return result(false, 0, ['automated sender']);
    if (JOB_BOARD_DOMAINS.test(email)) return result(false, 0, ['job board notification (cannot reply to candidate)']);
    if (msg.isBulk) return result(false, 0, ['bulk / mailing list']);
    var domain = email.split('@')[1];
    if ((settings.ownDomains || []).some(function (d) { return d && domain === d.toLowerCase(); })) {
      return result(false, 0, ['internal sender']);
    }

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

    return result(score >= settings.minScore, score, reasons);
  }

  function result(isApplication, score, reasons) {
    return { isApplication: isApplication, score: score, reasons: reasons };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  function extractEmail(from) {
    var m = String(from || '').match(/<([^>]+)>/) || String(from || '').match(/([^\s<>"]+@[^\s<>"]+)/);
    return m ? m[1].trim().toLowerCase() : '';
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
    return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
  }

  /** Best-effort position title from the subject line. */
  function extractPosition(subject) {
    var s = String(subject || '').replace(/^\s*((re|fw|fwd|ynt|ilt)\s*:\s*)+/i, '').trim();
    var patterns = [
      /application for (?:the )?(.+?)(?: position| role)?$/i,
      /applying for (?:the )?(.+?)(?: position| role)?$/i,
      /^(.+?) (?:position|role) application$/i,
      /^(.+?) pozisyonu(?: için)? başvuru/i,
      /^(.+?) pozisyonu(?: icin)? basvuru/i,
      /başvuru\s*[-–:]\s*(.+)$/i,
      /application\s*[-–:]\s*(.+)$/i,
    ];
    for (var i = 0; i < patterns.length; i++) {
      var m = s.match(patterns[i]);
      if (m && m[1] && m[1].length <= 80) return m[1].replace(/\s*[-–]\s*$/, '').trim();
    }
    return '';
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
    return out;
  }

  // ---------------------------------------------------------------------------
  // Decision engine
  // ---------------------------------------------------------------------------
  /**
   * Decides what to do with one application thread.
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
  // Templates
  // ---------------------------------------------------------------------------
  var TEMPLATES = {
    en: {
      greeting: 'Dear {{name}},',
      greetingNoName: 'Hello,',
      Received:
        'Thank you for your application{{forPosition}}. We want to let you know that it reached us and has been seen by our team.\n\n' +
        'We are not able to move forward with it right now, but we would like to keep your CV in our talent pool and will reach out to you if a suitable opportunity opens up.\n\n' +
        'We appreciate your interest in {{company}} and wish you the best in your search.',
      InReview:
        'Thank you for your application{{forPosition}}. Your application is currently being reviewed by our team. ' +
        'We will get back to you as soon as we have an update — we did not want to leave you without news in the meantime.',
      Pool:
        'Thank you for your application{{forPosition}}. We have no matching opening at the moment, ' +
        'but we were glad to read your CV and have added it to our talent pool. We will contact you if a suitable role comes up.',
      Rejected:
        'Thank you for your application{{forPosition}} and for the time you invested. After careful consideration, we have decided to move forward with other candidates for this role.\n\n' +
        'This was not an easy decision, and we sincerely wish you success in your search.',
      PositionFilled:
        'Thank you for your application{{forPosition}}. We want to let you know that this position has now been filled.\n\n' +
        'We appreciate your interest in {{company}} and would be happy to see your application again for future openings.',
      privacy: 'Your data is stored only for recruitment purposes for up to {{retentionMonths}} months. You can ask us to delete it at any time by replying to this email.',
      signoff: 'Kind regards,',
      forPosition: ' for the {{position}} position',
    },
    tr: {
      greeting: 'Merhaba {{name}},',
      greetingNoName: 'Merhaba,',
      Received:
        '{{forPosition}}başvurunuz için teşekkür ederiz. Başvurunuzun bize ulaştığını ve ekibimiz tarafından görüldüğünü bildirmek isteriz.\n\n' +
        'Şu an için süreci ilerletemiyoruz; ancak özgeçmişinizi aday havuzumuzda tutmak isteriz. Uygun bir pozisyon açıldığında sizinle iletişime geçeceğiz.\n\n' +
        '{{company}} ile ilgilendiğiniz için teşekkür eder, kariyerinizde başarılar dileriz.',
      InReview:
        '{{forPosition}}başvurunuz için teşekkür ederiz. Başvurunuz şu anda ekibimiz tarafından değerlendirilmektedir. ' +
        'Bir gelişme olduğunda en kısa sürede size dönüş yapacağız; bu süreçte sizi habersiz bırakmak istemedik.',
      Pool:
        '{{forPosition}}başvurunuz için teşekkür ederiz. Şu an için uygun açık pozisyonumuz bulunmuyor; ancak özgeçmişinizi ' +
        'memnuniyetle aday havuzumuza ekledik. Uygun bir pozisyon açıldığında sizinle iletişime geçeceğiz.',
      Rejected:
        '{{forPosition}}başvurunuz ve ayırdığınız zaman için teşekkür ederiz. Yaptığımız değerlendirme sonucunda bu pozisyon için başka adaylarla ilerlemeye karar verdik.\n\n' +
        'Kolay bir karar olmadı; kariyerinizde başarılar diliyoruz.',
      PositionFilled:
        '{{forPosition}}başvurunuz için teşekkür ederiz. Bu pozisyonun dolduğunu bildirmek isteriz.\n\n' +
        '{{company}} ile ilgilendiğiniz için teşekkür ederiz; gelecekteki ilanlarımızda başvurunuzu yeniden görmekten memnuniyet duyarız.',
      privacy: 'Kişisel verileriniz yalnızca işe alım amacıyla en fazla {{retentionMonths}} ay süreyle saklanır (KVKK). Bu e-postayı yanıtlayarak verilerinizin silinmesini istediğiniz zaman talep edebilirsiniz.',
      signoff: 'Saygılarımızla,',
      forPosition: '{{position}} pozisyonu için ',
    },
  };

  function fill(str, vars) {
    return String(str).replace(/\{\{(\w+)\}\}/g, function (_, k) {
      return vars[k] !== undefined && vars[k] !== null ? String(vars[k]) : '';
    });
  }

  function capitalizeFirst(s) {
    return s ? s.charAt(0).toLocaleUpperCase('tr') + s.slice(1) : s;
  }

  /**
   * Builds the reply body.
   * @param {string} status one of STATUS values
   * @param {{name?:string, position?:string, language?:string}} ctx
   * @param {object} [settings]
   * @param {object} [overrides] custom templates in the same shape as TEMPLATES
   * @return {string}
   */
  function render(status, ctx, settings, overrides) {
    settings = withDefaults(settings);
    var lang = ctx.language === 'tr' ? 'tr' : 'en';
    var t = merge(TEMPLATES[lang], overrides && overrides[lang]);
    var company = settings.companyName || (lang === 'tr' ? 'şirketimiz' : 'our company');
    var vars = {
      name: ctx.name || '',
      position: ctx.position || '',
      company: company,
      retentionMonths: settings.retentionMonths,
    };
    vars.forPosition = ctx.position ? fill(t.forPosition, vars) : '';

    var body = fill(t[status] || t[STATUS.RECEIVED], vars).replace(/^\s+/, '');
    var parts = [
      ctx.name ? fill(t.greeting, vars) : t.greetingNoName,
      capitalizeFirst(body),
    ];
    if (settings.includePrivacyNote) parts.push(fill(t.privacy, vars));
    parts.push(t.signoff + '\n' + [settings.senderName, settings.companyName].filter(Boolean).join('\n'));
    return parts.join('\n\n').trim() + '\n';
  }

  function merge(base, extra) {
    var out = {};
    var k;
    for (k in base) out[k] = base[k];
    for (k in (extra || {})) out[k] = extra[k];
    return out;
  }

  return {
    STATUS: STATUS,
    CONTROL: CONTROL,
    DEFAULT_SETTINGS: DEFAULT_SETTINGS,
    TEMPLATES: TEMPLATES,
    classify: classify,
    decide: decide,
    render: render,
    detectLanguage: detectLanguage,
    extractEmail: extractEmail,
    extractFirstName: extractFirstName,
    extractPosition: extractPosition,
    withDefaults: withDefaults,
    daysBetween: daysBetween,
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = JLMK;
