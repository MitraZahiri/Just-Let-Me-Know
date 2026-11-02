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
const msal = require('@azure/msal-node');
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
  notified: (s) => CATEGORY_PREFIX + 'Notified ' + s,
};
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
async function loadConversations(graph, settings, me) {
  const since = new Date(Date.now() - settings.lookbackDays * 86400000).toISOString();
  const select = 'id,subject,from,receivedDateTime,conversationId,hasAttachments,categories,bodyPreview,isDraft';
  // All folders incl. Sent Items, so we can see our own replies in the same conversation.
  const messages = await graph.all(
    `/me/messages?$filter=receivedDateTime ge ${since}&$select=${select}&$orderby=receivedDateTime asc&$top=100`
  );

  const byConv = new Map();
  for (const m of messages) {
    if (m.isDraft) continue;
    if (!byConv.has(m.conversationId)) byConv.set(m.conversationId, []);
    byConv.get(m.conversationId).push(m);
  }

  const conversations = [];
  for (const msgs of byConv.values()) {
    const fromOf = (m) => (m.from && m.from.emailAddress && m.from.emailAddress.address || '').toLowerCase();
    const candidateMsgs = msgs.filter((m) => !me.includes(fromOf(m)));
    const ownMsgs = msgs.filter((m) => me.includes(fromOf(m)));
    if (!candidateMsgs.length) continue;
    const categories = new Set(msgs.flatMap((m) => m.categories || []));
    conversations.push({ msgs, candidateMsgs, ownMsgs, categories, first: candidateMsgs[0], last: candidateMsgs[candidateMsgs.length - 1] });
  }
  return conversations;
}

async function classifyMessage(graph, m, settings) {
  const full = await graph.call('GET', `/me/messages/${m.id}?$select=body,internetMessageHeaders`);
  const headers = full.internetMessageHeaders || [];
  const header = (n) => (headers.find((h) => h.name.toLowerCase() === n) || {}).value || '';
  let attachments = [];
  if (m.hasAttachments) {
    const list = await graph.call('GET', `/me/messages/${m.id}/attachments?$select=name`);
    attachments = list.value.map((a) => a.name);
  }
  const fromAddr = m.from && m.from.emailAddress;
  return JLMK.classify({
    from: fromAddr ? `${fromAddr.name || ''} <${fromAddr.address}>` : '',
    subject: m.subject || '',
    body: (full.body && full.body.content) || m.bodyPreview || '',
    attachments,
    isBulk: !!header('list-unsubscribe') || /bulk|list/i.test(header('precedence')),
  }, settings);
}

function describe(conv) {
  const { first, last, ownMsgs, categories } = conv;
  const fromAddr = first.from.emailAddress;
  const fromHeader = `${fromAddr.name || ''} <${fromAddr.address}>`;
  const lastOwn = ownMsgs.length ? new Date(ownMsgs[ownMsgs.length - 1].receivedDateTime) : null;
  return {
    subject: first.subject || '',
    candidateEmail: fromAddr.address.toLowerCase(),
    name: JLMK.extractFirstName(fromHeader),
    position: JLMK.extractPosition(first.subject),
    receivedAt: new Date(first.receivedDateTime),
    lastCandidateAt: new Date(last.receivedDateTime),
    lastOwnReplyAt: lastOwn,
    statuses: MANUAL_STATUSES.filter((s) => categories.has(cat.status(s))),
    notifiedStatuses: Object.values(JLMK.STATUS).filter((s) => categories.has(cat.notified(s))),
    skip: categories.has(cat.skip),
  };
}

async function addCategories(graph, message, names) {
  const next = Array.from(new Set([...(message.categories || []), ...names]));
  await graph.call('PATCH', `/me/messages/${message.id}`, { categories: next });
  message.categories = next;
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
const today = () => new Date().toISOString().slice(0, 10);

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function toHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
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
  let used = state.day === today() ? state.count : 0;
  const now = new Date();
  let applications = 0;
  let replies = 0;

  const conversations = await loadConversations(graph, settings, me);
  for (const conv of conversations) {
    const tracked = conv.categories.has(cat.application);
    const info = describe(conv);
    if (!tracked && !info.statuses.length) {
      if (!conv.first.hasAttachments && !/cv|resume|application|applying|ba[sş]vuru|[oö]zge[cç]mi[sş]|pozisyon|position/i.test(conv.first.subject || '')) continue;
      const verdict = await classifyMessage(graph, conv.first, settings);
      if (!verdict.isApplication) continue;
      if (!dryRun) await addCategories(graph, conv.first, [cat.application]);
    }
    applications++;

    const decision = JLMK.decide(info, now, settings);
    if (decision.action !== 'reply') continue;

    const language = JLMK.detectLanguage(`${info.subject}\n${conv.first.bodyPreview || ''}`, settings.defaultLanguage);
    const line = `${decision.status.padEnd(15)} ${language.toUpperCase()}  ${info.candidateEmail}  "${info.subject}"  (${decision.reason})`;

    if (used >= settings.dailyLimit) { console.log('LIMIT    ' + line); continue; }
    if (dryRun) { console.log('PREVIEW  ' + line); replies++; continue; }

    const body = toHtml(JLMK.render(decision.status, { ...info, language }, settings, config.customTemplates));
    if (JLMK.deliveryMode(settings) === 'send') {
      await graph.call('POST', `/me/messages/${conv.last.id}/reply`, { comment: body });
    } else {
      await graph.call('POST', `/me/messages/${conv.last.id}/createReply`, { comment: body });
    }
    await addCategories(graph, conv.first, [cat.application, cat.notified(decision.status)]);
    used++;
    replies++;
    writeState({ day: today(), count: used });
    console.log((JLMK.deliveryMode(settings) === 'send' ? 'SENT     ' : 'DRAFTED  ') + line);
  }

  console.log(`\n${applications} applications, ${replies} ${dryRun ? 'would get a reply (preview — nothing changed)' : 'handled'}.`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
