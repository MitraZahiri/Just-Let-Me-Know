// Runs the Outlook runner against a fake Microsoft Graph mailbox.
const test = require('node:test');
const assert = require('node:assert/strict');
const O = require('./jlmk-outlook');

const ME = 'hr@acme.com';
const NOW = new Date('2026-11-02T09:00:00Z');
const daysAgo = (n) => new Date(NOW.getTime() - n * 86400000).toISOString();

let seq = 0;
function msg(folder, extra = {}) {
  const id = 'm' + ++seq;
  return {
    id,
    folder,
    conversationId: extra.conversationId || 'c' + id,
    subject: 'Muhasebe Uzmanı pozisyonu için başvuru',
    from: { emailAddress: { name: 'Ayşe Yılmaz', address: 'ayse@gmail.com' } },
    receivedDateTime: daysAgo(8),
    sentDateTime: daysAgo(8),
    hasAttachments: true,
    attachments: ['Ayse_CV.pdf'],
    categories: [],
    bodyPreview: 'Merhaba, pozisyonunuza başvurmak istiyorum.',
    body: 'Merhaba, pozisyonunuza başvurmak istiyorum. Özgeçmişim ektedir. Saygılarımla',
    isDraft: false,
    ...extra,
  };
}

function fakeGraph(messages, children = {}) {
  const store = messages.slice();
  const requests = [];
  const find = (id) => store.find((m) => m.id === id);
  const notFound = (url) => { throw new Error(`Graph GET ${url} → 404: not found`); };

  async function call(method, url, body) {
    requests.push(`${method} ${url}`);
    let m;
    if (method === 'GET' && url.startsWith('/me/mailFolders/inbox?')) return { id: 'inbox' };
    if (method === 'GET' && (m = url.match(/^\/me\/mailFolders\/([^/?]+)\/childFolders/))) {
      return { value: (children[m[1]] || []).map((id) => ({ id, childFolderCount: (children[id] || []).length })) };
    }
    if (method === 'GET' && (m = url.match(/^\/me\/mailFolders\/([^/?]+)\/messages\?(.*)$/))) {
      const folder = m[1];
      const since = (m[2].match(/receivedDateTime ge (\S+?)(?:&| and |$)/) || [])[1];
      const category = (m[2].match(/categories\/any\(c:c eq '([^']+)'\)/) || [])[1];
      return {
        value: store.filter((x) => x.folder === folder
          && (!since || x.receivedDateTime >= since)
          && (!category || x.categories.includes(category))),
      };
    }
    if (method === 'GET' && (m = url.match(/^\/me\/messages\/([^/?]+)\/attachments/))) {
      return { value: (find(m[1]) || notFound(url)).attachments.map((name) => ({ name })) };
    }
    if (method === 'GET' && (m = url.match(/^\/me\/messages\/([^/?]+)/))) {
      const x = find(m[1]) || notFound(url);
      return { ...x, body: { content: x.body }, internetMessageHeaders: [] };
    }
    if (method === 'PATCH' && (m = url.match(/^\/me\/messages\/([^/?]+)$/))) {
      Object.assign(find(m[1]), body);
      return null;
    }
    if (method === 'POST' && (m = url.match(/^\/me\/messages\/([^/?]+)\/(createReply|reply)$/))) {
      const original = find(m[1]);
      const created = msg(m[2] === 'reply' ? 'sentitems' : 'drafts', {
        conversationId: original.conversationId,
        subject: 'RE: ' + original.subject,
        from: { emailAddress: { name: 'HR', address: ME } },
        receivedDateTime: NOW.toISOString(),
        sentDateTime: NOW.toISOString(),
        hasAttachments: false,
        attachments: [],
        bodyPreview: '',
        body: body.comment,
        isDraft: m[2] === 'createReply',
      });
      store.push(created);
      return m[2] === 'reply' ? null : created;
    }
    if (url.startsWith('/me/outlook/masterCategories')) return { value: [] };
    throw new Error('fake graph: unhandled ' + method + ' ' + url);
  }
  return { store, requests, call, all: async (url) => (await call('GET', url)).value };
}

const run = (graph, settings = {}, state = {}) =>
  O.runOnce({ graph, me: [ME], settings, state, dryRun: false, now: NOW, log: () => {} });
const replies = (graph, kind = 'createReply') => graph.requests.filter((r) => r.startsWith('POST') && r.endsWith('/' + kind));

// --- fix 4: only Inbox (+ subfolders) and Sent Items -------------------------------

test('fix4: scans Inbox and its subfolders, skips Junk and Deleted Items', async () => {
  const graph = fakeGraph([
    msg('inbox'),
    msg('inbox-jobs'),
    msg('junkemail'),
    msg('deleteditems'),
  ], { inbox: ['inbox-jobs'] });
  await run(graph);
  const answered = replies(graph).map((r) => r.split('/')[3]);
  assert.deepEqual(answered.sort(), ['m1', 'm2'].map((id) => graph.store.find((x) => x.id === id).id).sort());
  assert.ok(!graph.requests.some((r) => r.startsWith('GET /me/messages?')), 'no mailbox-wide query');
});

test('fix4: our reply in Sent Items is seen, so nothing is sent twice', async () => {
  const app = msg('inbox');
  const sent = msg('sentitems', { conversationId: app.conversationId, from: { emailAddress: { address: ME } }, receivedDateTime: daysAgo(7) });
  const graph = fakeGraph([app, sent]);
  await run(graph);
  assert.equal(replies(graph).length, 0);
});

// --- fix 3: Drafted vs Notified ------------------------------------------------------------

test('fix3: draft mode sets the Drafted category, not Notified', async () => {
  const app = msg('inbox');
  const graph = fakeGraph([app]);
  const state = {};
  await run(graph, {}, state);
  assert.ok(app.categories.includes('JLMK: Drafted Received'));
  assert.ok(!app.categories.includes('JLMK: Notified Received'));
  assert.ok(state.drafts[app.conversationId]);
});

test('fix3: no second draft while the first one still exists; Notified once it is sent', async () => {
  const app = msg('inbox');
  const graph = fakeGraph([app]);
  const state = {};
  await run(graph, {}, state);
  await run(graph, {}, state);
  assert.equal(replies(graph).length, 1);

  const draft = graph.store.find((x) => x.isDraft);
  graph.store.splice(graph.store.indexOf(draft), 1); // sending moves it to Sent Items as a new message
  graph.store.push({ ...draft, id: 'sent-1', folder: 'sentitems', isDraft: false, receivedDateTime: new Date(NOW.getTime() + 3600000).toISOString() });
  await run(graph, {}, state);
  assert.ok(app.categories.includes('JLMK: Notified Received'));
  assert.ok(!app.categories.includes('JLMK: Drafted Received'));
  assert.equal(replies(graph).length, 1);
  assert.equal(state.drafts[app.conversationId], undefined);
});

test('fix3: a deleted draft is prepared again', async () => {
  const app = msg('inbox');
  const graph = fakeGraph([app]);
  const state = {};
  await run(graph, {}, state);
  graph.store.splice(graph.store.findIndex((x) => x.isDraft), 1);
  await run(graph, {}, state);
  assert.equal(replies(graph).length, 2);
  assert.ok(app.categories.includes('JLMK: Drafted Received'));
});

// --- fix 5: manual statuses ignore lookbackDays -------------------------------------------

test('fix5: a status category on a message older than lookbackDays is handled', async () => {
  const old = msg('inbox', { receivedDateTime: daysAgo(120), categories: ['JLMK: Application', 'JLMK: Rejected'] });
  const graph = fakeGraph([old]);
  await run(graph, { mode: 'send' });
  assert.equal(replies(graph, 'reply').length, 1);
});

// --- fix 7: language from the full body ------------------------------------------------------

test('fix7: language is detected from the full body, not the preview', async () => {
  const app = msg('inbox', {
    subject: 'CV',
    bodyPreview: 'Hello',
    body: 'Hello,\n\nİlanınızdaki pozisyona başvurmak istiyorum. Özgeçmişim ektedir. Saygılarımla',
    categories: ['JLMK: Application'],
  });
  const graph = fakeGraph([app]);
  await run(graph);
  const draft = graph.store.find((x) => x.isDraft);
  assert.match(draft.body, /^Merhaba/);
});

// --- fix 9: privacy notice link ----------------------------------------------------------------

test('fix9: URLs become links in the HTML body', () => {
  const html = O.toHtml('KVKK: https://acme.com/kvkk?a=1&b=2.');
  assert.match(html, /<a href="https:\/\/acme\.com\/kvkk\?a=1&amp;b=2">https:\/\/acme\.com\/kvkk\?a=1&amp;b=2<\/a>\./);
});
