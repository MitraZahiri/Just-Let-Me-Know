# Just Let Me Know 📬

> *"Did you get my CV? Just let me know."*

Candidates send applications and then hear **nothing** — not a yes, not a no.
**Just Let Me Know** fixes that from the employer's side, inside the mailbox the CVs already arrive in:

- 🔎 **Detects job applications** automatically (CV attachments, subject lines, typical phrases — English & Turkish).
- ⏳ If nobody has answered after **7 days** (configurable), it replies in the same thread:
  *"We received and saw your application. We can't move forward right now, but we've kept your CV in our talent pool."*
- 🏷️ HR can put a **status** on any application — *In review*, *Talent pool*, *Rejected*, *Position filled* — and the matching polite message goes out on the next run.
- 🌍 Replies in the **candidate's language** (TR / EN), using their first name and the position from the subject.
- 🛡️ **Safe by default**: starts in *draft mode* (it only prepares replies; you click send), has a daily limit, never touches threads a human already answered, and skips newsletters, no-reply senders, job-board notifications and internal mail.
- ⚖️ Optional **KVKK / GDPR** note about data retention.

Works with **Gmail / Google Workspace** (add-on, no server) and **Outlook / Microsoft 365** (small scheduled script).

---

## How it works

```
New mail ──► Is it a job application? ──no──► ignored
                     │yes
                     ▼
            label  JLMK/Application
                     │
     ┌───────────────┼──────────────────────────────┐
     │ HR set a status label?                       │ nobody replied for N days?
     ▼                                              ▼
 send matching template once              send "we saw your application"
 (Rejected / Pool / InReview / Filled)    (Received) once
     │                                              │
     └──────────► label  JLMK/Notified/<status> ◄───┘
```

| Label (Gmail) / Category (Outlook) | Meaning |
|---|---|
| `JLMK/Application` | Detected as an application (added automatically; add it yourself if one was missed) |
| `JLMK/InReview` | Send "your application is being reviewed" |
| `JLMK/Pool` | Send "no opening now, kept in our talent pool" |
| `JLMK/Rejected` | Send a respectful rejection |
| `JLMK/PositionFilled` | Send "the position has been filled" |
| `JLMK/Skip` | Never touch this thread |
| `JLMK/Notified/<status>` | Set by the tool — that message was already sent/drafted |

A status message is sent even if the "Received" notice already went out (e.g. *Received* on day 7, *Position filled* on day 30), but each status is sent only once.

---

## Gmail / Google Workspace

Runs entirely in your Google account as an Apps Script add-on — no server, free.

**Quick install (no tools needed)**

1. Go to <https://script.google.com> → **New project**, name it *Just Let Me Know*.
2. **Project Settings** → tick *Show "appsscript.json" manifest file*.
3. Create the files `Core.gs`, `Engine.gs`, `AddOn.gs` and paste in the contents of
   [`gmail/src/Core.js`](gmail/src/Core.js), [`gmail/src/Engine.js`](gmail/src/Engine.js), [`gmail/src/AddOn.js`](gmail/src/AddOn.js).
   Replace `appsscript.json` with [`gmail/src/appsscript.json`](gmail/src/appsscript.json).
4. **Deploy → Test deployments → Gmail → Install**.
5. Open Gmail, click the ✉️✔ icon in the right sidebar, authorise, fill in **Settings**, press **Preview**, then **Turn on**.

**With clasp (developers)**

```bash
npm install -g @google/clasp && clasp login
cp gmail/.clasp.example.json gmail/.clasp.json   # put your scriptId in it
npm run push:gmail
```

> Gmail sending quota: ~100 recipients/day on free Gmail, ~1500 on Workspace. Keep *Max replies per day* below that.

## Outlook / Microsoft 365

Outlook add-ins can't run in the background, so this is a small Node.js script (Node 18+) using Microsoft Graph that you schedule once a day.

1. **Register an app** at <https://entra.microsoft.com> → *App registrations* → *New registration*
   - Supported account types: *Accounts in any organizational directory and personal Microsoft accounts* (or your org only)
   - *Authentication* → *Allow public client flows* = **Yes**
   - *API permissions* → Microsoft Graph → Delegated: `User.Read`, `Mail.ReadWrite`, `Mail.Send`, `MailboxSettings.ReadWrite`
2. Configure and sign in:
   ```bash
   npm install
   cp outlook/config.example.json outlook/config.json   # paste the Application (client) ID
   npm run outlook:login      # one-time device-code sign-in, token is cached locally
   npm run outlook:preview    # shows what would happen, changes nothing
   npm run outlook:run        # drafts (or sends, if mode = "send")
   ```
3. **Schedule it** daily, e.g. Windows Task Scheduler:
   ```powershell
   schtasks /Create /SC DAILY /ST 09:00 /TN "JustLetMeKnow" /TR "cmd /c cd /d C:\path\to\Just-Let-Me-Know && npm run outlook:run >> jlmk.log 2>&1"
   ```
   or cron: `0 9 * * * cd /path/to/Just-Let-Me-Know && npm run outlook:run >> jlmk.log 2>&1`

In Outlook, use **categories** named `JLMK: Rejected`, `JLMK: Pool`, `JLMK: InReview`, `JLMK: PositionFilled`, `JLMK: Skip` on any message of the conversation.

---

## Settings

| Setting | Default | |
|---|---|---|
| `waitDays` | `7` | Days of silence before the automatic notice |
| `mode` | `draft` | `draft` = prepare replies for you to send, `send` = send automatically |
| `dailyLimit` | `50` | Max replies per day |
| `lookbackDays` | `60` | Ignore applications older than this |
| `companyName`, `senderName` | – | Used in the text and signature |
| `ownDomains` | `[]` | Your company domains — internal mail is never treated as an application |
| `defaultLanguage` | `en` | When the language can't be detected |
| `includePrivacyNote` | `true` | Adds the KVKK/GDPR retention sentence |
| `retentionMonths` | `12` | Used in that sentence |

### Custom wording

Override any part of [the default templates](core/jlmk-core.js) (`TEMPLATES`) — same shape, only the keys you want:

```json
{ "en": { "Received": "Thanks for applying to {{company}}! ..." },
  "tr": { "signoff": "Sevgiler," } }
```

Placeholders: `{{name}}`, `{{position}}`, `{{company}}`, `{{retentionMonths}}`.
Outlook: put it in `customTemplates` in `config.json`. Gmail: *Project Settings → Script properties* is per-script, so instead run once in the editor: `PropertiesService.getUserProperties().setProperty('JLMK_TEMPLATES', JSON.stringify({...}))`.

---

## Project layout

```
core/       platform-independent logic (classifier, decision engine, templates) + tests
gmail/src/  Google Apps Script add-on (Core.js is generated from core/ — run npm run build:gmail)
outlook/    Microsoft Graph runner
```

```bash
npm test    # unit tests + Gmail engine against a fake mailbox
```

## Roadmap

- [ ] Outlook add-in pane with one-click status buttons (like the Gmail sidebar)
- [ ] More languages (DE, FR, ES, AR…)
- [ ] Shared team mailboxes (`jobs@…`) and Google Groups
- [ ] Optional "reached the interview stage" / "offer" templates
- [ ] Weekly summary to HR: how many candidates were answered
- [ ] Integrations with ATS tools (Greenhouse, Lever, Kariyer.net)
- [ ] Candidate side: a polite follow-up reminder if *you* haven't heard back

## Contributing

PRs welcome — especially new languages and better detection patterns (add a test in `core/jlmk-core.test.js`).

## License

[MIT](LICENSE)

---

## 🇹🇷 Türkçe

**Just Let Me Know**, iş başvurularına hiç dönüş yapılmaması sorununu işveren tarafında çözer.
Gmail ya da Outlook kutusuna gelen CV'leri kendisi tanır. **7 gün** içinde kimse cevap vermezse adaya aynı yazışma içinden kibar bir mesaj gönderir:
*"Başvurunuzu aldık ve inceledik, şu an ilerleyemiyoruz ama özgeçmişinizi aday havuzumuzda tutuyoruz."*

- İK bir başvuruya **Değerlendiriliyor / Havuz / Olumsuz / Pozisyon doldu** etiketini koyarsa, o duruma uygun mesaj bir sonraki çalışmada gider.
- Adayın diline göre (TR/EN) ve adıyla hitap ederek yazar. İsterseniz KVKK notu da ekler.
- Varsayılan olarak **taslak modunda** çalışır: yanıtları hazırlar, göndermeyi siz yaparsınız. Ayarlardan *otomatik gönder* moduna geçebilirsiniz.
- Daha önce birinin cevap verdiği yazışmalara, bültenlere, no-reply adreslere ve kariyer sitesi bildirimlerine dokunmaz.

Kurulum adımları yukarıda: Gmail için *Gmail / Google Workspace*, Outlook için *Outlook / Microsoft 365* bölümüne bakın.
