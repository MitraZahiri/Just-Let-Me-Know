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
