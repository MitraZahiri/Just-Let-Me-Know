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
    privacy: 'Your data is stored only for recruitment purposes for up to {{retentionMonths}} months. You can ask us to delete it at any time by replying to this email.' +
      '{{#privacyNoticeUrl}} Full privacy notice: {{privacyNoticeUrl}}{{/privacyNoticeUrl}}',
    // Neutral on purpose: no outcome is implied before HR picks a status.
    Received:
      'Thank you for your application{{#position}} for the {{position}} position{{/position}}. We want to let you know that it has reached us and our team is reviewing it.\n\n' +
      'The evaluation is still in progress, and we will let you know the outcome.\n\n' +
      'We appreciate your interest in {{company}}.',
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

    // Spreadsheet export (column titles, status names, next step).
    export: {
      sheetTitle: 'Just Let Me Know — My applications',
      columns: {
        company: 'Company', position: 'Position', appliedOn: 'Applied on', via: 'Sent to / via',
        status: 'Status', lastAnswer: 'Last answer', followUps: 'Follow-ups', nextStep: 'Next step', subject: 'Subject',
      },
      status: {
        Sent: 'Sent', Acknowledged: 'Received by them', NoResponse: 'No answer yet',
        Rejected: 'Not selected', Interview: 'Interview',
      },
      next: {
        due: 'Follow-up draft due', draftPending: 'A draft is waiting in Gmail', waiting: 'Waiting',
        theirTurn: 'They answered — your turn', rejected: 'Closed', interview: 'Interview — good luck!',
        maxed: 'Followed up enough', old: 'Older than the tracking window',
        noAddress: 'Applied on a job site — no follow-up', bounced: 'Email bounced — check the address',
      },
    },
  },
};

if (typeof module !== 'undefined' && module.exports) module.exports = JLMK_I18N.en;
