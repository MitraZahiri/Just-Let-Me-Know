/**
 * Gmail sidebar UI (CardService).
 *  - Homepage: settings, schedule on/off, preview, run now, recent activity.
 *  - When an email is open: shows whether it is an application and lets HR
 *    pick a status (Rejected / Pool / In review / Position filled / Skip).
 */

// ---------------------------------------------------------------------------
// Homepage
// ---------------------------------------------------------------------------
function onHomepage() {
  return buildHomeCard();
}

function buildHomeCard(notice) {
  var s = getSettings();
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
    .addWidget(CardService.newSelectionInput()
      .setType(CardService.SelectionInputType.DROPDOWN)
      .setFieldName('defaultLanguage').setTitle('Fallback language')
      .addItem('English', 'en', s.defaultLanguage !== 'tr')
      .addItem('Türkçe', 'tr', s.defaultLanguage === 'tr'))
    .addWidget(CardService.newSelectionInput()
      .setType(CardService.SelectionInputType.CHECK_BOX)
      .setFieldName('includePrivacyNote')
      .addItem('Add privacy / KVKK / GDPR note', 'yes', !!s.includePrivacyNote))
    .addWidget(CardService.newTextButton()
      .setText('Save settings')
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
      .setOnClickAction(action('handleSaveSettings')));

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

  var log = getLog();
  if (log.length) {
    var logSection = CardService.newCardSection().setHeader('Recent runs').setCollapsible(true);
    log.slice(0, 5).forEach(function (l) {
      logSection.addWidget(CardService.newDecoratedText()
        .setTopLabel(l.at.replace('T', ' ').slice(0, 16))
        .setText(l.applications + ' applications · ' + l.replies + ' replies'));
    });
    card.addSection(logSection);
  }
  return card.build();
}

function handleSaveSettings(e) {
  var f = formValues(e);
  var current = getSettings();
  current.companyName = f.companyName || '';
  current.senderName = f.senderName || '';
  current.waitDays = clampInt(f.waitDays, 1, 60, 7);
  current.dailyLimit = clampInt(f.dailyLimit, 1, 500, 50);
  current.ownDomains = (f.ownDomains || '').split(',').map(function (d) { return d.trim().replace(/^@/, ''); }).filter(Boolean);
  current.mode = f.mode === 'send' ? 'send' : 'draft';
  current.defaultLanguage = f.defaultLanguage === 'tr' ? 'tr' : 'en';
  current.includePrivacyNote = f.includePrivacyNote === 'yes';
  current.privacyNoticeUrl = (f.privacyNoticeUrl || '').trim();
  saveSettings(current);
  var linkRejected = current.privacyNoticeUrl && !JLMK.withDefaults(current).privacyNoticeUrl;
  return refreshHome(linkRejected ? 'Saved, but the privacy link must start with http:// or https://' : 'Settings saved.');
}

function handleEnable() { enableSchedule(); return refreshHome('Daily run turned on.'); }
function handleDisable() { disableSchedule(); return refreshHome('Daily run turned off.'); }

function handleRunNow() {
  var r = run({ dryRun: false });
  var verb = JLMK.deliveryMode(getSettings()) === 'send' ? 'sent' : 'drafted';
  return refreshHome(r.note || (r.applications + ' applications found, ' + r.actions.length + ' replies ' + verb + '.'));
}

function handlePreview() {
  var r = run({ dryRun: true });
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
  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle('Preview').setSubtitle('Nothing has been changed'))
    .addSection(section)
    .build();
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
