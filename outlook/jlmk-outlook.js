#!/usr/bin/env node
/**
 * Just Let Me Know — Outlook / Microsoft 365 runner (Microsoft Graph).
 *
 * Outlook add-ins cannot run in the background, so this is a small script you
 * schedule once a day (Windows Task Scheduler, cron, GitHub Actions…).
 * Labels from the Gmail version are Outlook *categories* here: "JLMK: Rejected" etc.
 *
 *   node outlook/jlmk-outlook.js --preview   # show what would happen, change nothing
 *   node outlook/jlmk-outlook.js --run       # draft or send replies (see JLMK.deliveryMode)
 *   node outlook/jlmk-outlook.js --login     # sign in only
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const JLMK = require('../core/jlmk-core');

const DIR = __dirname;
const CONFIG_PATH = process.env.JLMK_CONFIG || path.join(DIR, 'config.json');
const CACHE_PATH = path.join(DIR, '.token-cache.json');
const STATE_PATH = path.join(DIR, '.state.json');
const GRAPH = 'https://graph.microsoft.com/v1.0';
const SCOPES = ['User.Read', 'Mail.ReadWrite', 'Mail.Send', 'MailboxSettings.ReadWrite'];

const CATEGORY_PREFIX = 'JLMK: ';
const cat = {
  application: CATEGORY_PREFIX + 'Application',
  skip: CATEGORY_PREFIX + 'Skip',
  status: (s) => CATEGORY_PREFIX + s,
  drafted: (s) => CATEGORY_PREFIX + 'Drafted ' + s,   // draft prepared, not sent yet
  notified: (s) => CATEGORY_PREFIX + 'Notified ' + s, // a sent message was seen
};
const ALL_STATUSES = Object.values(JLMK.STATUS);
const MANUAL_STATUSES = [JLMK.STATUS.IN_REVIEW, JLMK.STATUS.POOL, JLMK.STATUS.REJECTED, JLMK.STATUS.FILLED];

// ---------------------------------------------------------------------------
// Auth (device code flow, token cached on disk)
// ---------------------------------------------------------------------------
function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error(`Config not found: ${CONFIG_PATH}\nCopy outlook/config.example.json to outlook/config.json and fill in clientId.`);
    process.exit(1);
  }
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  if (!config.clientId) {
    console.error('config.json: "clientId" is missing (see README → Outlook setup).');
    process.exit(1);
  }
  return config;
}

async function getToken(config) {
  const cachePlugin = {
    beforeCacheAccess: async (ctx) => {
      if (fs.existsSync(CACHE_PATH)) ctx.tokenCache.deserialize(fs.readFileSync(CACHE_PATH, 'utf8'));
    },
    afterCacheAccess: async (ctx) => {
      if (ctx.cacheHasChanged) fs.writeFileSync(CACHE_PATH, ctx.tokenCache.serialize(), { mode: 0o600 });
    },
  };
  // Loaded here, not at the top: the runner logic (and its tests) must work without npm install.
  const msal = require('@azure/msal-node');
  const app = new msal.PublicClientApplication({
    auth: { clientId: config.clientId, authority: `https://login.microsoftonline.com/${config.tenantId || 'common'}` },
    cache: { cachePlugin },
  });

  const accounts = await app.getTokenCache().getAllAccounts();
  if (accounts.length) {
    try {
      return (await app.acquireTokenSilent({ account: accounts[0], scopes: SCOPES })).accessToken;
    } catch {
      // fall through to interactive sign-in
    }
  }
  if (!process.stdout.isTTY && !process.env.JLMK_ALLOW_DEVICE_LOGIN) {
    throw new Error('Not signed in. Run once interactively: node outlook/jlmk-outlook.js --login');
  }
  const res = await app.acquireTokenByDeviceCode({
    scopes: SCOPES,
    deviceCodeCallback: (r) => console.log('\n' + r.message + '\n'),
  });
  return res.accessToken;
}

// ---------------------------------------------------------------------------
// Graph helpers
// ---------------------------------------------------------------------------
function graphClient(token) {
  async function call(method, url, body, extraHeaders) {
    const full = url.startsWith('http') ? url : GRAPH + url;
    for (let attempt = 0; attempt < 4; attempt++) {
      const res = await fetch(full, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Prefer: 'outlook.body-content-type="text"',
          ...extraHeaders,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (res.status === 429 || res.status === 503) {
        const wait = Number(res.headers.get('Retry-After') || 2 ** attempt) * 1000;
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      if (!res.ok) throw new Error(`Graph ${method} ${url} → ${res.status}: ${await res.text()}`);
      return res.status === 202 || res.status === 204 ? null : res.json();
    }
    throw new Error(`Graph ${method} ${url}: too many retries`);
  }
  async function all(url) {
    const out = [];
    let next = url;
    while (next) {
      const page = await call('GET', next);
      out.push(...page.value);
      next = page['@odata.nextLink'];
    }
    return out;
  }
  return { call, all };
}

// ---------------------------------------------------------------------------
// Mailbox → conversations
// ---------------------------------------------------------------------------
/** Inbox, every folder below it, and Sent Items. Junk and Deleted Items are never read. */
async function listFolderIds(graph) {
  const inbox = await graph.call('GET', '/me/mailFolders/inbox?$select=id');
  const ids = [];
  const walk = async (id, hasChildren) => {
    ids.push(id);
    if (!hasChildren) return;
    const kids = await graph.all(`/me/mailFolders/${id}/childFolders?$select=id,childFolderCount&$top=100`);
    for (const k of kids) await walk(k.id, k.childFolderCount > 0);
  };
  await walk(inbox.id, true);
  ids.push('sentitems');
  return ids;
}

async function loadConversations(graph, settings, me, now) {
  const since = new Date(now.getTime() - settings.lookbackDays * 86400000).toISOString();
  const select = 'id,subject,from,receivedDateTime,sentDateTime,conversationId,hasAttachments,categories,bodyPreview,isDraft';
  const filters = [
    `receivedDateTime ge ${since}`,
    // Manual statuses are honoured however old the conversation is.
    ...MANUAL_STATUSES.map((s) => `categories/any(c:c eq '${cat.status(s)}')`),
  ];

  const byId = new Map();
  for (const folder of await listFolderIds(graph)) {
    for (const filter of filters) {
      for (const m of await graph.all(`/me/mailFolders/${folder}/messages?$filter=${filter}&$select=${select}&$top=100`)) {
        if (!m.isDraft) byId.set(m.id, m);
      }
    }
  }

  const byConv = new Map();
  const time = (m) => new Date(m.sentDateTime || m.receivedDateTime).getTime();
  for (const m of [...byId.values()].sort((a, b) => time(a) - time(b))) {
    if (!byConv.has(m.conversationId)) byConv.set(m.conversationId, []);
    byConv.get(m.conversationId).push(m);
  }

  const conversations = [];
  for (const [id, msgs] of byConv) {
    const fromOf = (m) => (m.from && m.from.emailAddress && m.from.emailAddress.address || '').toLowerCase();
    const candidateMsgs = msgs.filter((m) => !me.includes(fromOf(m)));
    const ownMsgs = msgs.filter((m) => me.includes(fromOf(m)));
    if (!candidateMsgs.length) continue;
    const categories = new Set(msgs.flatMap((m) => m.categories || []));
    conversations.push({ id, msgs, candidateMsgs, ownMsgs, categories, first: candidateMsgs[0], last: candidateMsgs[candidateMsgs.length - 1] });
  }
  return conversations;
}

async function fetchBody(graph, m) {
  if (m.fullBody === undefined) {
    const full = await graph.call('GET', `/me/messages/${m.id}?$select=body,internetMessageHeaders`);
    m.fullBody = (full.body && full.body.content) || m.bodyPreview || '';
    m.headers = full.internetMessageHeaders || [];
  }
  return m.fullBody;
}

async function classifyMessage(graph, m, settings) {
  const body = await fetchBody(graph, m);
  const header = (n) => (m.headers.find((h) => h.name.toLowerCase() === n) || {}).value || '';
  let attachments = [];
  if (m.hasAttachments) {
    const list = await graph.call('GET', `/me/messages/${m.id}/attachments?$select=name`);
    attachments = list.value.map((a) => a.name);
  }
  return JLMK.classify({
    from: fromHeaderOf(m),
    subject: m.subject || '',
    body,
    attachments,
    isBulk: !!header('list-unsubscribe') || /bulk|list/i.test(header('precedence')),
  }, settings);
}

function fromHeaderOf(m) {
  const a = m.from && m.from.emailAddress;
  return a ? `${a.name || ''} <${a.address}>` : '';
}

async function draftStillExists(graph, draftId) {
  if (!draftId) return false;
  try {
    return !!(await graph.call('GET', `/me/messages/${draftId}?$select=isDraft`)).isDraft;
  } catch (err) {
    if (/→ 404/.test(err.message)) return false;
    throw err;
  }
}

/** Builds the input for JLMK.decide(); draft outcomes are returned, not applied. */
async function describe(graph, conv, state) {
  const { first, last, ownMsgs, categories } = conv;
  const sentAt = (m) => new Date(m.sentDateTime || m.receivedDateTime);
  const ownSentDates = ownMsgs.map(sentAt);
  const notified = ALL_STATUSES.filter((s) => categories.has(cat.notified(s)));
  const drafted = [];
  const resolutions = [];
  const stored = state.drafts[conv.id] || {};
  for (const s of ALL_STATUSES) {
    if (!categories.has(cat.drafted(s)) || notified.includes(s)) continue;
    const record = stored[s] || {};
    const outcome = JLMK.resolveDraft({
      draftedAt: record.at ? new Date(record.at) : null,
      lastCandidateAt: new Date(last.receivedDateTime),
      draftExists: await draftStillExists(graph, record.draftId),
      ownSentDates,
    });
    if (outcome === 'pending') drafted.push(s);
    else resolutions.push({ status: s, outcome });
    if (outcome === 'sent') notified.push(s);
  }
  return {
    subject: first.subject || '',
    candidateEmail: first.from.emailAddress.address.toLowerCase(),
    position: JLMK.extractPosition(first.subject),
    receivedAt: new Date(first.receivedDateTime),
    lastCandidateAt: new Date(last.receivedDateTime),
    lastOwnReplyAt: ownSentDates.length ? ownSentDates[ownSentDates.length - 1] : null,
    statuses: MANUAL_STATUSES.filter((s) => categories.has(cat.status(s))),
    notifiedStatuses: notified,
    draftedStatuses: drafted,
    draftResolutions: resolutions,
    skip: categories.has(cat.skip),
  };
}

async function setCategories(graph, message, add, remove = []) {
  const next = Array.from(new Set([...(message.categories || []), ...add])).filter((c) => !remove.includes(c));
  await graph.call('PATCH', `/me/messages/${message.id}`, { categories: next });
  message.categories = next;
}

/**
 * Categories go on every candidate message of the conversation, so they are still
 * seen when only some of its messages are loaded (e.g. old ones via a status category).
 */
async function markConversation(graph, conv, add, remove = []) {
  for (const m of conv.candidateMsgs) await setCategories(graph, m, add, remove);
  add.forEach((c) => conv.categories.add(c));
  remove.forEach((c) => conv.categories.delete(c));
}

async function ensureMasterCategories(graph) {
  try {
    const existing = new Set((await graph.call('GET', '/me/outlook/masterCategories')).value.map((c) => c.displayName));
    const wanted = [cat.application, cat.skip, ...MANUAL_STATUSES.map(cat.status)];
    for (const name of wanted) {
      if (!existing.has(name)) await graph.call('POST', '/me/outlook/masterCategories', { displayName: name, color: 'preset7' });
    }
  } catch (err) {
    console.warn('Could not create Outlook categories (they still work, just uncoloured):', err.message);
  }
}

// ---------------------------------------------------------------------------
// Daily budget
// ---------------------------------------------------------------------------
function readState() {
  try { return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8')); } catch { return {}; }
}
function writeState(s) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(s, null, 2));
}
const dayKey = (now) => now.toISOString().slice(0, 10);

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
/** Plain text → HTML for Graph's `comment`; bare http(s) URLs become links. */
function toHtml(text) {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/https?:\/\/[^\s<]*[^\s<.,;:!?)]/g, (url) => `<a href="${url}">${url}</a>`)
    .replace(/\n/g, '<br>');
}

/**
 * One pass over the mailbox. Mutates `state` ({day, count, drafts}); call `save`
 * after each change so a crash never causes a duplicate.
 */
async function runOnce({ graph, me, settings, customTemplates, state, dryRun, now = new Date(), log = console.log, save = () => {} }) {
  settings = JLMK.withDefaults(settings);
  state.drafts = state.drafts || {};
  let used = state.day === dayKey(now) ? state.count : 0;
  let applications = 0;
  let replies = 0;
  const mode = JLMK.deliveryMode(settings);

  for (const conv of await loadConversations(graph, settings, me, now)) {
    const tracked = conv.categories.has(cat.application);
    const hasStatus = MANUAL_STATUSES.some((s) => conv.categories.has(cat.status(s)));
    if (!tracked && !hasStatus) {
      if (!JLMK.prefilter(conv.first)) continue;
      const verdict = await classifyMessage(graph, conv.first, settings);
      if (!verdict.isApplication) continue;
      if (!dryRun) await markConversation(graph, conv, [cat.application]);
    }
    applications++;

    const info = await describe(graph, conv, state);
    if (!dryRun) {
      for (const r of info.draftResolutions) {
        await markConversation(graph, conv, r.outcome === 'sent' ? [cat.notified(r.status)] : [], [cat.drafted(r.status)]);
        if (state.drafts[conv.id]) {
          delete state.drafts[conv.id][r.status];
          if (!Object.keys(state.drafts[conv.id]).length) delete state.drafts[conv.id];
        }
        save();
      }
    }

    const decision = JLMK.decide(info, now, settings);
    if (decision.action !== 'reply') continue;

    // Full body, not the 255-character preview.
    const language = JLMK.detectLanguage(`${info.subject}\n${(await fetchBody(graph, conv.first)).slice(0, 3000)}`, settings.defaultLanguage);
    const name = JLMK.extractFirstName(fromHeaderOf(conv.first), language);
    const line = `${decision.status.padEnd(15)} ${language.toUpperCase()}  ${info.candidateEmail}  "${info.subject}"  (${decision.reason})`;

    if (used >= settings.dailyLimit) { log('LIMIT    ' + line); continue; }
    if (dryRun) { log('PREVIEW  ' + line); replies++; continue; }

    const body = toHtml(JLMK.render(decision.status, { ...info, name, language }, settings, customTemplates));
    if (mode === 'send') {
      await graph.call('POST', `/me/messages/${conv.last.id}/reply`, { comment: body });
      await markConversation(graph, conv, [cat.application, cat.notified(decision.status)]);
    } else {
      const draft = await graph.call('POST', `/me/messages/${conv.last.id}/createReply`, { comment: body });
      await markConversation(graph, conv, [cat.application, cat.drafted(decision.status)]);
      state.drafts[conv.id] = { ...state.drafts[conv.id], [decision.status]: { at: now.toISOString(), draftId: draft && draft.id } };
    }
    used++;
    replies++;
    state.day = dayKey(now);
    state.count = used;
    save();
    log((mode === 'send' ? 'SENT     ' : 'DRAFTED  ') + line);
  }

  log(`\n${applications} applications, ${replies} ${dryRun ? 'would get a reply (preview — nothing changed)' : 'handled'}.`);
  return { applications, replies };
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const dryRun = !args.has('--run');
  const config = loadConfig();
  const settings = JLMK.withDefaults(config.settings);
  if (settings.role !== JLMK.ROLE.EMPLOYER) {
    console.error('Candidate mode is not available for Outlook yet. Set "role": "employer" in config.json.');
    process.exit(1);
  }
  const token = await getToken(config);
  if (args.has('--login')) { console.log('Signed in. Token cached.'); return; }

  const graph = graphClient(token);
  const meInfo = await graph.call('GET', '/me?$select=mail,userPrincipalName');
  const me = [meInfo.mail, meInfo.userPrincipalName, ...(config.aliases || [])].filter(Boolean).map((a) => a.toLowerCase());
  if (!dryRun) await ensureMasterCategories(graph);

  const state = readState();
  await runOnce({ graph, me, settings, customTemplates: config.customTemplates, state, dryRun, save: () => writeState(state) });
}

module.exports = { runOnce, listFolderIds, loadConversations, toHtml, cat };

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
}
