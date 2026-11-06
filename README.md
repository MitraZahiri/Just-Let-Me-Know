# Just Let Me Know 📬

> *"Did you get my CV? Just let me know."*

**No application should go unanswered.** Just Let Me Know works on both sides of a job application, inside the mailbox you already use:

| | **Candidate mode** | **Employer mode** |
|---|---|---|
| For | People applying for jobs | HR / anyone receiving CVs |
| What it does | Finds the applications you sent, tracks what happened to each one, prepares a polite follow-up **draft** when nobody answers | Finds incoming applications and answers them — automatically after N days of silence, or with the status HR picks |
| Sends on its own? | **Never.** You review and send every follow-up yourself | Only if you explicitly switch on *send* mode; drafts by default |
| Status | ✅ Gmail add-on (sidebar summary, follow-up drafts, Google Sheets export) | ✅ Gmail add-on and Outlook script available |

🔒 **Your mail never leaves your account.** No server, no analytics, no tracking. Everything runs inside your own Google account (Apps Script) or on your own computer (Outlook script).

---

## Candidate mode

*Available in the Gmail add-on: pick **Candidate** under Settings → "I use this as". Outlook support is on the [Roadmap](#roadmap).*

1. **Detects applications in your Sent mail** — CV attachments, "application / başvuru / özgeçmiş" wording, cover-letter phrases — and **job-board confirmations** ("Your application was sent to Acme" from LinkedIn, Kariyer.net, Indeed).
2. Keeps a record per application: **company, position, date, status**.

   | Status | Meaning |
   |---|---|
   | `Sent` | Application sent |
   | `Acknowledged` | They confirmed receipt (or replied with a question) |
   | `NoResponse` | No answer after `waitDays` (default 7) |
   | `Rejected` | A no — including the polite "kept in our talent pool" kind |
   | `Interview` | Interview / call invitation |

3. **Matches answers to the right application** — same thread first, otherwise by the sender's company domain, then by the company named in the mail (e.g. ATS mails from Greenhouse). Out-of-office replies and words quoted from your own email don't count.
4. **Follow-up drafts**: after `waitDays` of silence a short, warm reminder is prepared as a **draft**; a second one after another `followUpGapDays`. **Never more than 2**, never after a rejection or interview invite, never when they wrote last (then it's your turn), never while another draft is waiting in the conversation, never for job-board applications (no address to write to) or bounced emails.
   - If a person at the company already wrote in the thread (e.g. a recruiter), the draft **answers that person** in the thread and greets them by name.
   - Otherwise it is a new draft to the address you applied to, with a `Re:` subject.
5. Answers from **another address** (an ATS no-reply, a recruiter) only change a status when they clearly say what happened (received / rejected / interview). Newsletters, invoices, job alerts and personal mail that mention the company are ignored.
6. **Gmail sidebar**: a summary per status, a preview of the follow-ups that are due, and — with an email open — the application's status and next step, plus *Track as application* / *Not an application — ignore*.
7. **Export to Google Sheets**: one spreadsheet in **your own Drive** (company, position, date, where it was sent, status, last answer, follow-ups, next step). Column names follow your language setting. Running it again updates the same sheet.

| Label (Gmail, candidate mode) | Meaning |
|---|---|
| `JLMK/Applied` | Tracked application (add it yourself to track any sent email) |
| `JLMK/Applied/<status>` | Current status: `Sent`, `Acknowledged`, `NoResponse`, `Rejected`, `Interview` — kept up to date by the tool |
| `JLMK/Skip` | Not an application — never touch this thread |

Example (TR):

> Merhaba,
>
> 12 Ekim tarihinde Yazılım Mühendisi pozisyonu için Aselsan şirketine başvuruda bulunmuştum; süreç hakkında kısaca bilgi almak istedim. …

## Employer mode

1. **Detects job applications** automatically (CV attachments, subject lines, typical phrases — English & Turkish). Newsletters, invoices, no-reply senders, job-board notifications, internal and personal mail are ignored. A bare "başvuru" in the subject only counts together with a job word (pozisyon, iş, CV, staj, ilan…); visa, loan, scholarship, card, membership, licence, patent and tender applications are ignored.
2. If nobody has answered after **7 days** (configurable), it replies in the same thread with a **neutral** notice:
   *"Your application has reached us and is being reviewed. We will let you know the outcome."*
   It never implies a result on its own — "can't move forward" / "talent pool" wording is only used when HR picks *Talent pool*, *Rejected* or *Position filled*.
3. HR can put a **status** on any application — *In review*, *Talent pool*, *Rejected*, *Position filled* — and the matching polite message goes out on the next run, **however old the application is** (`lookbackDays` only limits the automatic notice).
4. Replies in the **candidate's language** (TR / EN), using their first name (with correct Turkish casing: IŞIK → Işık) and the position from the subject.
5. **Safe by default**: *draft mode* (it only prepares replies; you click send), daily limit, never touches threads a human already answered. Unsent drafts don't count as an answer, and a draft you delete is prepared again on the next run.
6. Optional **KVKK / GDPR** note about data retention, with an optional link to your full privacy notice (`privacyNoticeUrl`).

```
New mail ──► Is it a job application? ──no──► ignored
                     │yes
                     ▼
            label  JLMK/Application
                     │
     ┌───────────────┼──────────────────────────────┐
     │ HR set a status label?                       │ nobody replied for N days?
     ▼                                              ▼
 prepare matching template once           prepare "your application reached us"
 (Rejected / Pool / InReview / Filled)    (Received) once
     │                                              │
     └──────────┬───────────────────────────────────┘
                ▼
   draft mode: JLMK/Drafted/<status> ──you send it──► JLMK/Notified/<status>
                │ you delete it
                └──► prepared again on the next run
   send mode:  JLMK/Notified/<status> right away
```

| Label (Gmail) / Category (Outlook) | Meaning |
|---|---|
| `JLMK/Application` | Detected as an application (added automatically; add it yourself if one was missed) |
| `JLMK/InReview` | Send "your application is being reviewed" |
| `JLMK/Pool` | Send "no opening now, kept in our talent pool" |
| `JLMK/Rejected` | Send a respectful rejection |
| `JLMK/PositionFilled` | Send "the position has been filled" |
| `JLMK/Skip` | Never touch this thread |
| `JLMK/Drafted/<status>` | Set by the tool — a draft is waiting for you to send it |
| `JLMK/Notified/<status>` | Set by the tool once a **sent** message from you is seen in the thread |

A status message is sent even if the "Received" notice already went out (e.g. *Received* on day 7, *Position filled* on day 30), but each status is sent only once.

Large mailboxes: the Gmail add-on pages through all matching threads and stops before Apps Script's 6-minute limit; it saves where it stopped and continues automatically a minute later.

---

## Install — Gmail / Google Workspace (both modes)

Runs entirely in your Google account as an Apps Script add-on — no server, free.

**Quick install (no tools needed)**

1. Go to <https://script.google.com> → **New project**, name it *Just Let Me Know*.
2. **Project Settings** → tick *Show "appsscript.json" manifest file*.
3. Create the files `Core.gs`, `Engine.gs`, `Candidate.gs`, `AddOn.gs` and paste in the contents of
   [`gmail/src/Core.js`](gmail/src/Core.js), [`gmail/src/Engine.js`](gmail/src/Engine.js), [`gmail/src/Candidate.js`](gmail/src/Candidate.js), [`gmail/src/AddOn.js`](gmail/src/AddOn.js).
   Replace `appsscript.json` with [`gmail/src/appsscript.json`](gmail/src/appsscript.json).
4. **Deploy → Test deployments → Gmail → Install**.
5. Open Gmail, click the ✉️✔ icon in the right sidebar, authorise, choose **Employer** or **Candidate** under *I use this as*, fill in **Settings**, press **Preview**, then **Turn on**.

   The add-on asks for Gmail access, for running a daily trigger and, for the candidate *Export to Google Sheets* button, for Google Sheets. The spreadsheet is created in your own Drive; nothing is sent anywhere else.

**With clasp (developers)**

```bash
npm install -g @google/clasp && clasp login
cp gmail/.clasp.example.json gmail/.clasp.json   # put your scriptId in it
npm run push:gmail
```

> Gmail sending quota: ~100 recipients/day on free Gmail, ~1500 on Workspace. Keep *Max replies per day* below that.

## Install — Outlook / Microsoft 365 (employer mode)

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

In Outlook, use **categories** named `JLMK: Rejected`, `JLMK: Pool`, `JLMK: InReview`, `JLMK: PositionFilled`, `JLMK: Skip` on any message of the conversation. The tool adds `JLMK: Drafted <status>` / `JLMK: Notified <status>` the same way as the Gmail labels.

Only **Inbox (with all its subfolders)** and **Sent Items** are read — Junk and Deleted Items are never touched.

---

## Settings

| Setting | Default | |
|---|---|---|
| `role` | `employer` | `candidate` or `employer` |
| `waitDays` | `7` | Days of silence before acting (employer notice / first follow-up) |
| `followUpGapDays` | `7` | Candidate: days between the first and second follow-up |
| `maxFollowUps` | `2` | Candidate: 0–2, cannot be set higher |
| `mode` | `draft` | Employer only: `draft` = prepare replies, `send` = send automatically. **Candidate mode always drafts.** |
| `dailyLimit` | `50` | Max replies per day |
| `lookbackDays` | `60` | Ignore applications older than this |
| `companyName`, `senderName` | – | Used in the text and signature |
| `ownDomains` | `[]` | Your own domains — internal mail is never treated as an application |
| `defaultLanguage` | `en` | When the language can't be detected |
| `includePrivacyNote` | `true` | Employer: adds the KVKK/GDPR retention sentence |
| `retentionMonths` | `12` | Used in that sentence |
| `privacyNoticeUrl` | – | Optional `http(s)://` link to your full KVKK/GDPR notice, appended to that sentence |

### Texts and languages

All wording lives in [`core/i18n/`](core/i18n/): `en.js` (reference), `tr.js`, and skeletons for `de.js` and `ar.js` — every `null` there falls back to English until someone translates it. Tone rule: **warm, short, never blaming.**

Placeholders: `{{name}}`, `{{position}}`, `{{company}}`, `{{appliedDate}}`, `{{retentionMonths}}`, `{{privacyNoticeUrl}}`.
Sections: `{{#position}}for the {{position}} role{{/position}}` is only rendered when the position is known.

To change the wording for your own account, pass an override with the same shape (only the keys you want):

```json
{ "en": { "employer": { "Received": "Thanks for applying to {{company}}! ..." } },
  "tr": { "candidate": { "signoff": "Sevgiler," } } }
```

Outlook: put it in `customTemplates` in `config.json`. Gmail: run once in the script editor:
`PropertiesService.getUserProperties().setProperty('JLMK_TEMPLATES', JSON.stringify({...}))`.

---

## Project layout

```
core/
  jlmk-core.js     shared helpers, application signals, employer decisions, text rendering
  candidate.js     candidate side: sent-mail detection, reply classification, matching, follow-ups
  i18n/            texts per language (en, tr, de*, ar*)   *skeleton
  *.test.js        tests
gmail/src/         Google Apps Script add-on: Engine.js (employer), Candidate.js (candidate), AddOn.js (sidebar)
                   Core.js is generated — run npm run build:gmail
outlook/           Microsoft Graph runner
```

```bash
npm test    # core + candidate tests, Gmail engine and Outlook runner against fake mailboxes, Core.js freshness check
```

Platform code stays a thin layer: it converts Gmail/Graph messages into plain objects and applies what `core/` decides.

## Roadmap

- [x] **Stage 1 — Core:** candidate/employer role, sent-mail detection, status tracking, reply matching, follow-up rules, language files
- [x] **Stage 2 — Candidate mode in Gmail:** scan Sent mail, follow-up drafts, sidebar summary card, export to Google Sheets
- [ ] **Stage 3 — Employer upgrades:** KVKK disclosure / GDPR Art. 13 notice in the default template, weekly HR summary ("you answered X candidates this week, average response time Y days")
- [ ] Candidate mode for Outlook
- [ ] Outlook add-in pane with one-click status buttons
- [ ] German and Arabic translations (skeletons ready in `core/i18n/`)

## Contributing

PRs welcome — especially translations and better detection patterns. Every new rule needs a test in `core/`, **including a false-positive test** (newsletter, invoice, job-board notification, personal mail).

## License

[MIT](LICENSE)

---

## 🇹🇷 Türkçe

**Hiçbir başvuru cevapsız kalmasın.** Just Let Me Know iş başvurusunun iki tarafında da, zaten kullandığınız e-posta kutusunun içinde çalışır.

🔒 **Mailleriniz hesabınızdan dışarı çıkmaz.** Sunucu, analitik ya da takip yok. Her şey kendi Google hesabınızda (Apps Script) ya da kendi bilgisayarınızda (Outlook betiği) çalışır.

### Aday modu

*Gmail eklentisinde kullanılabilir: Ayarlar → "I use this as" altında **Candidate** seçin. Outlook desteği yol haritasında.*

- **Gönderilmiş kutunuzdaki başvuruları bulur.** CV ekine, "başvuru / özgeçmiş" gibi ifadelere ve kariyer sitesi onaylarına bakar (LinkedIn, Kariyer.net, Indeed).
- Her başvuru için **şirket, pozisyon, tarih ve durum** kaydı tutar. Durumlar: *Gönderildi*, *Alındı onayı geldi*, *Cevap yok*, *Olumsuz* ve *Mülakat*.
- **Gelen cevabı doğru başvuruyla eşleştirir.** Önce aynı yazışmaya, sonra gönderenin şirket alan adına, en son da mailde geçen şirket adına bakar. Otomatik "ofis dışındayım" cevapları ve sizin alıntılanmış mailiniz sayılmaz.
- 7 gün sessizlik olursa kısa ve kibar bir **hatırlatma taslağı** hazırlar. **En fazla 2 hatırlatma** olur ve **hiçbiri otomatik gönderilmez**. Şu durumlarda hatırlatma hazırlanmaz: olumsuz cevap ya da mülakat daveti geldiyse, son yazan karşı tarafsa (yani sıra sizdeyse), yazışmada bekleyen başka bir taslak varsa, başvuru kariyer sitesi üzerinden yapıldıysa ya da mail adrese ulaşmadıysa.
- Şirketten biri (örneğin bir işe alım uzmanı) yazışmada size daha önce yazdıysa, taslak **o kişiye**, aynı yazışmanın içinden ve adıyla hitap ederek hazırlanır. Kimse yazmadıysa başvurduğunuz adrese `Re:` konulu yeni bir taslak hazırlanır.
- **Başka bir adresten** gelen cevaplar (ATS no-reply adresleri, işe alım uzmanları) yalnızca ne olduğunu açıkça söylüyorsa durumu değiştirir: başvurunuz alındı, olumsuz ya da mülakat. Şirketin adı geçen bülten, fatura, iş ilanı bildirimi ve kişisel mailler dikkate alınmaz.
- **Gmail kenar çubuğu** her durumdan kaç başvuru olduğunu ve zamanı gelen hatırlatmaların önizlemesini gösterir. Bir mail açıkken o başvurunun durumunu ve sıradaki adımı da gösterir. Oradan bir maili *başvuru olarak takip edebilir* ya da *başvuru değil* diyerek yok sayabilirsiniz.
- **Google Sheets'e aktarma** başvurularınızı **kendi Drive'ınızdaki** bir tabloya yazar: şirket, pozisyon, tarih, gönderilen adres ya da site, durum, son yanıt, hatırlatma sayısı ve sıradaki adım. Sütun adları dil ayarınıza göre gelir. Tekrar çalıştırdığınızda aynı tablo güncellenir.
- Gmail etiketleri: `JLMK/Applied` takip edilen başvuruyu, `JLMK/Applied/<durum>` güncel durumu gösterir. `JLMK/Skip` olan yazışmalara hiç dokunulmaz.

### İşveren modu

- Gelen başvuruları tanır. Konuda tek başına "başvuru" kelimesi yetmez; yanında pozisyon, iş, CV, staj, ilan gibi iş bağlamında bir kelime de olmalıdır. Vize, kredi, burs, kart, abonelik, üyelik, ruhsat, patent ve ihale başvuruları dikkate alınmaz.
- **7 gün** içinde kimse cevap vermezse adaya aynı yazışmanın içinden **nötr** bir mesaj gider: *"Başvurunuz bize ulaştı, değerlendirme süreci devam ediyor; sonucu size bildireceğiz."* Bu mesaj tek başına bir sonuç ima etmez. "İlerleyemiyoruz / havuz" ifadeleri yalnızca İK *Havuz*, *Olumsuz* ya da *Pozisyon doldu* seçtiğinde kullanılır.
- İK bir başvuruya **Değerlendiriliyor / Havuz / Olumsuz / Pozisyon doldu** etiketini koyarsa, o duruma uygun mesaj bir sonraki çalışmada gider. Başvuru ne kadar eski olursa olsun bu geçerlidir; `lookbackDays` yalnızca otomatik bildirimi sınırlar.
- Adayın diline göre (TR/EN) yazar ve adıyla, Türkçe büyük/küçük harf kurallarına uygun şekilde hitap eder (IŞIK → Işık). İsterseniz KVKK notunu da ekler. `privacyNoticeUrl` ayarı doluysa nota aydınlatma metninin linki de eklenir.
- Varsayılan olarak **taslak modunda** çalışır. Taslak hazırlanınca yazışmaya `JLMK/Drafted/<durum>` etiketi konur. `JLMK/Notified/<durum>` etiketi ancak sizden giden, gönderilmiş bir mesaj görüldüğünde eklenir. Taslağı silerseniz bir sonraki çalışmada yeniden hazırlanır, gönderilmemiş taslaklar da cevap sayılmaz.
- Otomatik gönderim ancak ayarlardan açıkça açılırsa çalışır ve o durumda da günlük sınır vardır. Birinin daha önce cevap verdiği yazışmalara asla dokunmaz.
- Outlook'ta yalnızca Gelen Kutusu (alt klasörleriyle birlikte) ve Gönderilmiş Öğeler okunur; Gereksiz ve Silinmiş Öğeler klasörlerine dokunulmaz. Gmail'de çok büyük kutular sayfa sayfa taranır. Süre sınırı yaklaşınca tarama kaldığı yeri kaydeder ve bir dakika sonra kendiliğinden devam eder.

### Ayarlar ve diller

- `role`: `candidate` (aday) ya da `employer` (işveren). Gmail'de kenar çubuğundaki ayarlardan seçilir. Aday modunda `waitDays` (ilk hatırlatmadan önceki sessizlik), `followUpGapDays` (ikinci hatırlatmaya kadar geçen gün) ve `maxFollowUps` (0–2) kullanılır.
- Metinler [`core/i18n/`](core/i18n/) klasöründe: Türkçe ve İngilizce tam, Almanca ve Arapça iskelet halinde (çevrilene kadar İngilizce gösterilir). Ton kuralı: **sıcak, kısa, suçlamasız.**

Kurulum adımları yukarıda: Gmail için *Install — Gmail*, Outlook için *Install — Outlook* bölümüne bakın.
