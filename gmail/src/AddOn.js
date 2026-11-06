/**
 * Gmail sidebar UI (CardService).
 *  - Homepage: settings, schedule on/off, preview, run now, recent activity.
 *  - Employer mode, email open: shows whether it is an application and lets HR
 *    pick a status (Rejected / Pool / In review / Position filled / Skip).
 *  - Candidate mode: summary of your applications, Sheets export, and for an
 *    open email its status plus "track" / "not an application" buttons.
 */

// ---------------------------------------------------------------------------
// Homepage
// ---------------------------------------------------------------------------
function onHomepage() {
  return buildHomeCard();
}

function buildHomeCard(notice) {
  var s = getSettings();
  if (s.role === JLMK.ROLE.CANDIDATE) return buildCandidateHomeCard(s, notice);
  var scheduled = isScheduled();

  var status = CardService.newCardSection()
    .addWidget(CardService.newDecoratedText()
      .setTopLabel('Automatic daily run')
      .setText(scheduled ? '✅ On (every day ~09:00)' : '⏸ Off')
      .setWrapText(true))
    .addWidget(CardService.newDecoratedText()
      .setTopLabel('Mode')
      .setText(JLMK.deliveryMode(s) === 'send' ? '📤 Sends replies' : '📝 Creates drafts only (safe)')
      .setWrapText(true))
    .addWidget(CardService.newButtonSet()
      .addButton(CardService.newTextButton()
        .setText(scheduled ? 'Turn off' : 'Turn on')
        .setOnClickAction(action(scheduled ? 'handleDisable' : 'handleEnable')))
      .addButton(CardService.newTextButton()
        .setText('Preview')
        .setOnClickAction(action('handlePreview')))
      .addButton(CardService.newTextButton()
        .setText('Run now')
        .setOnClickAction(action('handleRunNow'))));

  if (notice) status.addWidget(CardService.newTextParagraph().setText('<b>' + notice + '</b>'));

  var form = CardService.newCardSection()
    .setHeader('Settings')
    .addWidget(roleInput(s))
    .addWidget(textInput('companyName', 'Company name', s.companyName))
    .addWidget(textInput('senderName', 'Signature (e.g. HR Team)', s.senderName))
    .addWidget(textInput('waitDays', 'Days of silence before notifying', String(s.waitDays)))
    .addWidget(textInput('dailyLimit', 'Max replies per day', String(s.dailyLimit)))
    .addWidget(textInput('ownDomains', 'Your own domains (comma separated)', (s.ownDomains || []).join(', ')))
    .addWidget(textInput('privacyNoticeUrl', 'Privacy notice link (KVKK/GDPR, optional)', s.privacyNoticeUrl))
    .addWidget(CardService.newSelectionInput()
      .setType(CardService.SelectionInputType.DROPDOWN)
      .setFieldName('mode').setTitle('Mode')
      .addItem('Create drafts (I send them myself)', 'draft', s.mode !== 'send')
      .addItem('Send automatically', 'send', s.mode === 'send'))
    .addWidget(languageInput(s))
    .addWidget(CardService.newSelectionInput()
      .setType(CardService.SelectionInputType.CHECK_BOX)
      .setFieldName('includePrivacyNote')
      .addItem('Add privacy / KVKK / GDPR note', 'yes', !!s.includePrivacyNote))
    .addWidget(CardService.newTextButton()
      .setText('Save settings')
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
      .setOnClickAction(action('handleSaveSettings', { form: 'employer' })));

  var help = CardService.newCardSection()
    .setHeader('How it works')
    .setCollapsible(true)
    .addWidget(CardService.newTextParagraph().setText(
      '1. Applications are detected and labelled <b>JLMK/Application</b>.<br>' +
      '2. If nobody replies within the wait period, the candidate gets a polite "we saw your application" message.<br>' +
      '3. Put a label like <b>JLMK/Rejected</b>, <b>JLMK/Pool</b>, <b>JLMK/InReview</b> or <b>JLMK/PositionFilled</b> on a thread ' +
      '(or use the buttons when an email is open) and the matching message goes out on the next run.<br>' +
      '4. <b>JLMK/Skip</b> = never touch this thread.'));

  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle('Just Let Me Know').setSubtitle('Every applicant deserves an answer'))
    .addSection(status)
    .addSection(form)
    .addSection(help);

  addLogSection(card, 'replies');
  return card.build();
}

function addLogSection(card, what) {
  var log = getLog();
  if (!log.length) return;
  var logSection = CardService.newCardSection().setHeader('Recent runs').setCollapsible(true);
  log.slice(0, 5).forEach(function (l) {
    logSection.addWidget(CardService.newDecoratedText()
      .setTopLabel(l.at.replace('T', ' ').slice(0, 16))
      .setText(l.applications + ' applications · ' + l.replies + ' ' + what));
  });
  card.addSection(logSection);
}

// ---------------------------------------------------------------------------
// Candidate homepage
// ---------------------------------------------------------------------------
function buildCandidateHomeCard(s, notice) {
  var scheduled = isScheduled();
  var status = CardService.newCardSection()
    .addWidget(CardService.newDecoratedText()
      .setTopLabel('Automatic daily run')
      .setText(scheduled ? '✅ On (every day ~09:00)' : '⏸ Off')
      .setWrapText(true))
    .addWidget(CardService.newDecoratedText()
      .setTopLabel('Follow-ups')
      .setText('📝 Always drafts — you read and send them yourself')
      .setWrapText(true))
    .addWidget(CardService.newButtonSet()
      .addButton(CardService.newTextButton()
        .setText(scheduled ? 'Turn off' : 'Turn on')
        .setOnClickAction(action(scheduled ? 'handleDisable' : 'handleEnable')))
      .addButton(CardService.newTextButton()
        .setText('Preview')
        .setOnClickAction(action('handlePreview')))
      .addButton(CardService.newTextButton()
        .setText('Run now')
        .setOnClickAction(action('handleRunNow'))))
    .addWidget(CardService.newTextButton()
      .setText('Export to Google Sheets')
      .setOnClickAction(action('handleExport')));
  if (notice) status.addWidget(CardService.newTextParagraph().setText('<b>' + notice + '</b>'));

  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle('Just Let Me Know').setSubtitle('No application left unanswered'))
    .addSection(status);

  var last = lastCandidateSummary();
  if (last) {
    var summary = CardService.newCardSection()
      .setHeader(last.summary.total + ' applications · ' + last.at.replace('T', ' ').slice(0, 16));
    Object.keys(last.summary.byStatus).forEach(function (st) {
      summary.addWidget(CardService.newDecoratedText()
        .setTopLabel(statusName(st))
        .setText(String(last.summary.byStatus[st])));
    });
    card.addSection(summary);
  }

  card.addSection(CardService.newCardSection()
    .setHeader('Settings')
    .addWidget(roleInput(s))
    .addWidget(textInput('senderName', 'Your name (signature)', s.senderName))
    .addWidget(textInput('waitDays', 'Days of silence before the first follow-up', String(s.waitDays)))
    .addWidget(textInput('followUpGapDays', 'Days before the second follow-up', String(s.followUpGapDays)))
    .addWidget(CardService.newSelectionInput()
      .setType(CardService.SelectionInputType.DROPDOWN)
      .setFieldName('maxFollowUps').setTitle('Follow-ups per application')
      .addItem('None (only track)', '0', s.maxFollowUps === 0)
      .addItem('One', '1', s.maxFollowUps === 1)
      .addItem('Two (maximum)', '2', s.maxFollowUps === 2))
    .addWidget(textInput('ownDomains', 'Your work domains, if any (comma separated)', (s.ownDomains || []).join(', ')))
    .addWidget(languageInput(s))
    .addWidget(CardService.newTextButton()
      .setText('Save settings')
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
      .setOnClickAction(action('handleSaveSettings', { form: 'candidate' }))));

  card.addSection(CardService.newCardSection()
    .setHeader('How it works')
    .setCollapsible(true)
    .addWidget(CardService.newTextParagraph().setText(
      '1. Applications you sent (and job-site confirmations) get the label <b>JLMK/Applied</b> plus a status: ' +
      '<b>Sent</b>, <b>Acknowledged</b>, <b>NoResponse</b>, <b>Rejected</b> or <b>Interview</b>.<br>' +
      '2. After the silence period a polite follow-up <b>draft</b> is prepared — at most two per application. Nothing is ever sent for you.<br>' +
      '3. Open a sent email to track it by hand, or mark it as not an application.<br>' +
      '4. Export creates a spreadsheet in your own Drive. Nothing leaves your Google account.')));

  addLogSection(card, 'follow-up drafts');
  return card.build();
}

function handleExport() {
  var r = exportToSheet();
  var text = r.rows + ' applications exported' + (r.partial ? ' (incomplete: mailbox too large for one run)' : '') + '.';
  return CardService.newActionResponseBuilder()
    .setOpenLink(CardService.newOpenLink().setUrl(r.url))
    .setNavigation(CardService.newNavigation().updateCard(buildHomeCard(text)))
    .build();
}

function statusName(status) {
  return JLMK.text('en', 'candidate.export.status.' + status) || status;
}

function handleSaveSettings(e) {
  var f = formValues(e);
  var current = getSettings();
  var form = (e.commonEventObject.parameters || {}).form;
  current.role = f.role === JLMK.ROLE.CANDIDATE ? JLMK.ROLE.CANDIDATE : JLMK.ROLE.EMPLOYER;
  current.senderName = f.senderName || '';
  current.waitDays = clampInt(f.waitDays, 1, 60, 7);
  current.ownDomains = (f.ownDomains || '').split(',').map(function (d) { return d.trim().replace(/^@/, ''); }).filter(Boolean);
  current.defaultLanguage = f.defaultLanguage === 'tr' ? 'tr' : 'en';
  if (form === 'candidate') {
    current.followUpGapDays = clampInt(f.followUpGapDays, 1, 60, 7);
    current.maxFollowUps = clampInt(f.maxFollowUps, 0, JLMK.MAX_FOLLOW_UPS, JLMK.MAX_FOLLOW_UPS);
    saveSettings(current);
    return refreshHome('Settings saved.');
  }
  current.companyName = f.companyName || '';
  current.dailyLimit = clampInt(f.dailyLimit, 1, 500, 50);
  current.mode = f.mode === 'send' ? 'send' : 'draft';
  current.includePrivacyNote = f.includePrivacyNote === 'yes';
  current.privacyNoticeUrl = (f.privacyNoticeUrl || '').trim();
  saveSettings(current);
  var linkRejected = current.privacyNoticeUrl && !JLMK.withDefaults(current).privacyNoticeUrl;
  return refreshHome(linkRejected ? 'Saved, but the privacy link must start with http:// or https://' : 'Settings saved.');
}

function handleEnable() { enableSchedule(); return refreshHome('Daily run turned on.'); }
function handleDisable() { disableSchedule(); return refreshHome('Daily run turned off.'); }

function handleRunNow() {
  var settings = getSettings();
  var r = run({ dryRun: false });
  if (settings.role === JLMK.ROLE.CANDIDATE) {
    var drafted = r.actions.filter(function (a) { return a.mode === 'draft'; }).length;
    return refreshHome((r.note ? r.note + ' ' : '') + r.applications + ' applications tracked, ' + drafted + ' follow-up drafts prepared.');
  }
  var verb = JLMK.deliveryMode(settings) === 'send' ? 'sent' : 'drafted';
  return refreshHome(r.note || (r.applications + ' applications found, ' + r.actions.length + ' replies ' + verb + '.'));
}

function handlePreview() {
  var r = run({ dryRun: true });
  if (r.apps) return pushCard(buildCandidatePreviewCard(r));
  var section = CardService.newCardSection()
    .setHeader(r.applications + ' applications · ' + r.actions.length + ' would get a reply');
  if (r.note) section.addWidget(CardService.newTextParagraph().setText('<b>' + r.note + '</b>'));
  if (!r.actions.length) {
    section.addWidget(CardService.newTextParagraph().setText('Nothing to send right now.'));
  }
  r.actions.slice(0, 40).forEach(function (a) {
    section.addWidget(CardService.newDecoratedText()
      .setTopLabel(a.status + ' · ' + a.language.toUpperCase() + ' · ' + a.to)
      .setText(escapeHtml(a.subject || '(no subject)'))
      .setBottomLabel(a.reason)
      .setWrapText(true));
  });
  return pushCard(CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle('Preview').setSubtitle('Nothing has been changed'))
    .addSection(section)
    .build());
}

function buildCandidatePreviewCard(r) {
  var due = CardService.newCardSection()
    .setHeader(r.actions.length + ' follow-up draft(s) would be prepared');
  if (r.note) due.addWidget(CardService.newTextParagraph().setText('<b>' + r.note + '</b>'));
  if (!r.actions.length) due.addWidget(CardService.newTextParagraph().setText('No follow-up is due right now.'));
  r.actions.slice(0, 40).forEach(function (a) {
    due.addWidget(CardService.newDecoratedText()
      .setTopLabel((a.status === 'followUp1' ? '1st' : '2nd') + ' follow-up · ' + a.language.toUpperCase() + ' · ' + a.to)
      .setText(escapeHtml(a.subject || '(no subject)'))
      .setBottomLabel(a.reason + (a.mode.indexOf('skipped') === 0 ? ' — ' + a.mode : ''))
      .setWrapText(true));
  });

  var all = CardService.newCardSection().setHeader(r.applications + ' applications').setCollapsible(true);
  r.apps.slice().sort(function (a, b) { return b.appliedAt - a.appliedAt; }).slice(0, 60).forEach(function (a) {
    all.addWidget(CardService.newDecoratedText()
      .setTopLabel(statusName(a.status) + ' · ' + JLMK.formatDate(a.appliedAt, 'en'))
      .setText(escapeHtml((a.company || a.recipient || a.source) + (a.position ? ' · ' + a.position : '')))
      .setBottomLabel(JLMK.text('en', 'candidate.export.next.' + a.decision.code))
      .setWrapText(true));
  });
  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle('Preview').setSubtitle('Nothing has been changed'))
    .addSection(due).addSection(all)
    .build();
}

function pushCard(card) {
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(card))
    .build();
}

function refreshHome(notice) {
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(buildHomeCard(notice)))
    .build();
}

// ---------------------------------------------------------------------------
// Contextual card (an email is open)
// ---------------------------------------------------------------------------
function onGmailMessage(e) {
  GmailApp.setCurrentMessageAccessToken(e.gmail.accessToken);
  return buildMessageCard(e.gmail.messageId);
}

function buildMessageCard(messageId, notice) {
  var settings = getSettings();
  var message = GmailApp.getMessageById(messageId);
  var thread = message.getThread();
  if (settings.role === JLMK.ROLE.CANDIDATE) return buildCandidateMessageCard(messageId, thread, settings, notice);
  var info = describeThread(thread, ownAddresses(), settings);

  var section = CardService.newCardSection();
  if (notice) section.addWidget(CardService.newTextParagraph().setText('<b>' + notice + '</b>'));

  if (!info) {
    section.addWidget(CardService.newTextParagraph().setText('This does not look like a job application.'));
    section.addWidget(CardService.newTextButton()
      .setText('Treat as application')
      .setOnClickAction(action('handleSetStatus', { messageId: messageId, status: 'Application' })));
  } else {
    var decision = JLMK.decide(info, new Date(), settings);
    section
      .addWidget(CardService.newDecoratedText().setTopLabel('Candidate')
        .setText(escapeHtml((info.name || info.candidateEmail) + (info.position ? ' · ' + info.position : ''))).setWrapText(true))
      .addWidget(CardService.newDecoratedText().setTopLabel('Status')
        .setText(info.statuses.join(', ') || 'Waiting').setBottomLabel(decision.reason).setWrapText(true))
      .addWidget(CardService.newDecoratedText().setTopLabel('Already informed')
        .setText(info.notifiedStatuses.join(', ') || 'Not yet'));
    if (info.draftedStatuses.length) {
      section.addWidget(CardService.newDecoratedText().setTopLabel('Draft waiting to be sent')
        .setText(info.draftedStatuses.join(', ')));
    }

    var buttons = CardService.newCardSection().setHeader('Set a status — the reply goes out on the next run');
    [['In review', JLMK.STATUS.IN_REVIEW], ['Talent pool', JLMK.STATUS.POOL],
     ['Rejected', JLMK.STATUS.REJECTED], ['Position filled', JLMK.STATUS.FILLED], ['Skip', 'Skip']]
      .forEach(function (b) {
        buttons.addWidget(CardService.newTextButton().setText(b[0])
          .setOnClickAction(action('handleSetStatus', { messageId: messageId, status: b[1] })));
      });

    var preview = CardService.newCardSection().setHeader('Message preview').setCollapsible(true)
      .addWidget(CardService.newTextParagraph().setText(escapeHtml(
        JLMK.render(decision.status || info.statuses[0] || JLMK.STATUS.RECEIVED, info, settings, getCustomTemplates())
      ).replace(/\n/g, '<br>')));

    return CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader().setTitle('Just Let Me Know'))
      .addSection(section).addSection(buttons).addSection(preview).build();
  }
  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle('Just Let Me Know'))
    .addSection(section).build();
}

function buildCandidateMessageCard(messageId, thread, settings, notice) {
  var app = describeCandidateThread(thread, settings);
  var section = CardService.newCardSection();
  if (notice) section.addWidget(CardService.newTextParagraph().setText('<b>' + notice + '</b>'));

  if (!app) {
    section.addWidget(CardService.newTextParagraph().setText('No application you sent was found in this conversation.'));
    section.addWidget(CardService.newTextButton().setText('Track as application')
      .setOnClickAction(action('handleCandidateMark', { messageId: messageId, mark: 'track' })));
  } else {
    section
      .addWidget(CardService.newDecoratedText().setTopLabel('Application')
        .setText(escapeHtml((app.company || app.recipient) + (app.position ? ' · ' + app.position : ''))).setWrapText(true))
      .addWidget(CardService.newDecoratedText().setTopLabel('Status')
        .setText(statusName(app.status)).setBottomLabel('Sent ' + JLMK.formatDate(app.appliedAt, 'en')))
      .addWidget(CardService.newDecoratedText().setTopLabel('Follow-ups prepared')
        .setText(app.followUpCount + ' of ' + settings.maxFollowUps))
      .addWidget(CardService.newDecoratedText().setTopLabel('Next step')
        .setText(JLMK.text('en', 'candidate.export.next.' + app.decision.code))
        .setBottomLabel(app.decision.reason).setWrapText(true))
      .addWidget(CardService.newTextButton().setText('Not an application — ignore')
        .setOnClickAction(action('handleCandidateMark', { messageId: messageId, mark: 'skip' })));
  }
  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle('Just Let Me Know'))
    .addSection(section).build();
}

function handleCandidateMark(e) {
  var p = e.commonEventObject.parameters;
  GmailApp.setCurrentMessageAccessToken(e.gmail.accessToken);
  var thread = GmailApp.getMessageById(p.messageId).getThread();
  if (p.mark === 'skip') {
    thread.addLabel(label(LABELS.skip));
    thread.removeLabel(label(CANDIDATE_LABELS.applied));
  } else {
    thread.removeLabel(label(LABELS.skip));
    thread.addLabel(label(CANDIDATE_LABELS.applied));
  }
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(
      buildMessageCard(p.messageId, p.mark === 'skip' ? 'Ignored from now on.' : 'Tracked as an application.')))
    .build();
}

function handleSetStatus(e) {
  var p = e.commonEventObject.parameters;
  GmailApp.setCurrentMessageAccessToken(e.gmail.accessToken);
  var thread = GmailApp.getMessageById(p.messageId).getThread();
  ensureLabels();

  if (p.status === 'Skip') {
    thread.addLabel(label(LABELS.skip));
  } else if (p.status === 'Application') {
    thread.addLabel(label(LABELS.application));
  } else {
    // A thread has one status at a time.
    MANUAL_STATUSES.forEach(function (s) { thread.removeLabel(label(LABELS.status(s))); });
    thread.addLabel(label(LABELS.application));
    thread.addLabel(label(LABELS.status(p.status)));
  }
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(buildMessageCard(p.messageId, 'Saved: ' + p.status)))
    .build();
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------
function action(fn, params) {
  var a = CardService.newAction().setFunctionName(fn);
  if (params) a.setParameters(params);
  return a;
}

function roleInput(s) {
  return CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.DROPDOWN)
    .setFieldName('role').setTitle('I use this as')
    .addItem('Employer — answer applications I receive', 'employer', s.role !== 'candidate')
    .addItem('Candidate — track applications I send', 'candidate', s.role === 'candidate');
}

function languageInput(s) {
  return CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.DROPDOWN)
    .setFieldName('defaultLanguage').setTitle('Fallback language')
    .addItem('English', 'en', s.defaultLanguage !== 'tr')
    .addItem('Türkçe', 'tr', s.defaultLanguage === 'tr');
}

function textInput(name, title, value) {
  return CardService.newTextInput().setFieldName(name).setTitle(title).setValue(value || '');
}

function formValues(e) {
  var out = {};
  var inputs = (e.commonEventObject && e.commonEventObject.formInputs) || {};
  Object.keys(inputs).forEach(function (k) {
    var v = inputs[k].stringInputs && inputs[k].stringInputs.value;
    out[k] = v && v.length ? v[0] : '';
  });
  return out;
}

function clampInt(v, min, max, fallback) {
  var n = parseInt(v, 10);
  if (isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
