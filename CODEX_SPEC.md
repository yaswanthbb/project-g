# Freelance Gigs App — Codex-Ready Build Spec, v1

**Hand this whole file to Codex. Do not guess the locked decisions below — they are already decided.**

## 1. Who this is for, and what success looks like

- **One user only:** escnaor, a beginner freelancer in India building simple business websites with AI help.
- **His history:** exactly one real hosted client site so far, a very basic site charged ₹5,000 including domain.
- **Goal:** steady side income of **₹10,000–15,000/month**, not lakhs at the start. No rush.
- **How he works:** one step at a time, confirms before moving on. He wants the app to tell him exactly what to do next, not to figure out a dashboard.
- **Core promise of the app:** Muse does the research and preparation. The app sends him a ready gig with a ready approach. He just does it, ticking steps off.
- **Cost rule for v1:** free / low-cost hosting and tools only. He does NOT want to buy paid subscriptions (ChatGPT Plus, Muse, etc.) before he has earned capital to afford them.

## 2. Locked decisions — do not change these without asking him

| Decision | Locked choice |
|---|---|
| Platforms | **Both, like Daily Drop:** a website he opens on his laptop AND a native Android app on his phone. Both read and write the **same gigs from one shared backend**. A status change on the phone must show on the laptop, and vice versa. |
| Login | **Simple login — password to open it.** One user only. No public sign-up, no multi-user accounts, no teams. |
| Features | **Nice features are the priority.** v1 is NOT a bare, ugly minimum. The full feature list in Section 4 is must-have for v1, but the screen stays simple — one gig at a time, not an overwhelming CRM dashboard. |
| Notifications | **Phone push notifications, via Firebase.** This is proven, not risky: after the Daily Drop rebuild on 2026-10-16, the test push was confirmed "working perfectly." Push for: (a) a new gig from Muse, (b) a follow-up due. |
| Outreach safety | **No bulk sending, no auto-sending.** Every message goes out only after his manual approval, and only by him tapping send in WhatsApp / email himself. The app only prepares and copies the message. |
| Money rule | **50% advance is built into the Won step.** See Section 5. |

## 3. The core loop — build everything around this, in this order

1. **Muse finds / researches a gig and posts it to the app** (via a secure backend API, see Section 8 — Muse is NOT a user logging into the app UI to type it in).
2. **The app shows the gig:** what the gig is, which business, what problem was noticed, why it fits him, the demo link if any, the price range, and the exact step-by-step approach.
3. **He approves / edits / skips it**, then does the outreach and work step by step, ticking steps off.
4. **He updates status in one tap**, and the app tells him the next action and the follow-up date.
5. **Follow-ups:** Day 3 and Day 7 after Sent, then stop (see Section 4.5). No endless nagging.

If a feature does not serve this loop, it does not belong in v1.

## 4. Must-have features for v1 (nice features = priority)

All of these are in v1. None of them is "later" unless Section 9 says so.

### 4.1 Today view (the home screen, on both web and phone)
- Shows **one gig at a time** — the current / most urgent gig first. Not a wall of cards.
- Sections, in this order, and nothing else noisy:
  1. **Do today:** the next unchecked step for the current gig, with its exact instruction.
  2. **Follow-ups due:** follow-ups due today or overdue, each with a one-tap action.
  3. **New gigs waiting:** gigs in `New` status that need Approve / Edit / Skip.
- If there is nothing to do, say so plainly ("Nothing due today") — do not invent filler work.
- A clear way to go from Today to "All gigs" and to Earnings (see below), but Today is home.

### 4.2 Gig card / Gig detail
Every gig must show, on one screen, without hunting through menus:
- Business name, business type / niche, city / area
- Contact name, WhatsApp number, email (if known)
- Source of the lead (e.g. local Google Maps search)
- **Problem noticed** — in plain words, what is wrong or missing today (no website, outdated site, no Google Business Profile, no WhatsApp button, etc.)
- **Why it fits** — why this business fits escnaor (simple site, local, in his price range, etc.)
- **Demo link** if one exists — opens in the browser, one tap
- **Suggested price range** for this gig (Muse sets it per gig; he can edit it)
- **Outreach message, ready to copy** — separate WhatsApp version and email version, each with a **Copy button** that shows "Copied" feedback. Copying must NOT mark the gig as Sent by itself.
- **Call script** — one tap away from the gig (button / sheet, not buried in settings)
- **Pricing sheet** — one tap away from the gig (the price range, 50% advance, balance on delivery, 2 revisions included, 5–7 day delivery for a basic site)
- **Approach checklist** — exact steps in order (see 4.3)
- **Notes field** — one simple free-text notes field per gig, editable by him
- **Status** — one-tap status change (see 4.4)
- **Portfolio / demo links section** for this gig, if relevant

### 4.3 Approach checklist
- Steps are ordered, numbered, and written as actions, not vague advice. Example shape (Muse writes the real steps per gig):
  1. Approve this gig and read the problem + demo
  2. Send the WhatsApp message (copy, paste, send yourself)
  3. Wait for reply / follow up on Day 3
  4. Book the call, use the call script, ask scope first (business goal, pages, logo/photos/text ready?, timeline)
  5. Send the written quote after the call — give a range on the call, exact quote in writing after scope is known
  6. Collect 50% advance before building
  7. Build, deliver, collect balance
- Each step has a checkbox. Ticking it saves immediately and shows progress (e.g. "3 of 7 done").
- The next unchecked step is what Today shows as "Do today."

### 4.4 Status pipeline — one tap, in this exact order
```
New → Approved → Sent → Replied → Call booked → Won → Paid advance → Delivered → Lost
```
- Status is changed with one tap / one picker — no multi-screen form to change status.
- Rules:
  - A gig starts as `New`. Outreach is only actionable after he taps **Approve** (or **Edit** then Approve). **Skip** moves it out of Today (keep it listed under All gigs, do not delete it silently).
  - Marking `Sent` records the sent date. That date starts the follow-up clock (Section 5).
  - `Lost` stops all follow-ups for that gig.
  - He can move a gig backwards too (e.g. Replied → Sent) if he tapped wrong — do not lock him in.
- Filter "All gigs" by status.

### 4.5 Follow-up reminders
- When a gig becomes `Sent`, set:
  - **Follow-up 1: Sent date + 3 days**
  - **Follow-up 2: Sent date + 7 days**
  - **Then stop.** No third auto-reminder.
- On each follow-up date, show it in Today AND send a phone push notification.
- Each follow-up item has one-tap actions: "Sent follow-up" (resets nothing automatically — he records what he did in notes), "Replied" (moves status to Replied), "Mark Lost".
- If he marks Replied / Call booked / Won / Lost before a follow-up date, that follow-up disappears — do not remind him about a gig that already moved on.

### 4.6 Earnings tracker — toward ₹10,000–15,000/month
- Monthly goal display: **₹10,000–15,000/month**, with a progress bar for the current month.
- For each gig, track separately (do not mix them up):
  - Quoted price
  - Advance amount (default 50% of quoted price, editable) and advance paid date
  - Balance amount and balance paid date
  - Total received so far for that gig
- Monthly totals: advances received + balances received + maintenance received, shown separately and as a combined "Received this month."
- **Maintenance retainers:** a list of active retainers with client/business name, monthly amount, and next due date. Retainer amounts are in the ₹1,000–2,500/month range from his plan, but the actual amount is per client.
- Earnings screen must answer in one glance: "How much have I received this month, how much is still pending, and how far am I from ₹10,000?"
- **No payment gateway in v1.** Payments happen outside the app; the app only records them. Do not build UPI, cards, invoicing, or GST in v1.

### 4.7 Portfolio / demo links
- A simple list, separate from gigs, with: title, niche, link, and a clear label.
- Labels must be honest and visible: **"Real client"** vs **"Demo"**. Never present a demo as a real client site.
- He can add a portfolio item and link it to a gig, or add it standalone.
- This list is what he can show a prospect on a call — one tap to open a link.

### 4.8 Daily digest
- Today IS the daily digest. No separate newsletter, feed, or noisy notifications screen.
- Digest = Do today + Follow-ups due + New gigs waiting. Nothing else.

### 4.9 Polish that counts as "nice features" (do not ship a bare UI)
- Large, thumb-friendly tap targets on phone; readable on laptop without zooming.
- Copy button with visible "Copied" feedback.
- Clear empty states ("No gigs yet", "Nothing due today"), loading states, and plain-language error states ("Could not load gigs — try again", not a stack trace).
- Status shown as a clear pill / label, not a code.
- Progress on the checklist visible on the gig card.
- Search by business name, and filter by status, on All gigs.
- Demo links, WhatsApp numbers, and emails open the right app / browser when tapped (WhatsApp copy is manual — see safety rule; tapping a phone number may open WhatsApp, but sending still requires his tap in WhatsApp).

## 5. Pricing, advance, and quote rules baked into the app

These come from his existing 90-day freelance plan. Use them as defaults / templates, not as hard-coded prices for every gig — Muse sets the per-gig price, he can edit it.

- **Default price guides (for the pricing sheet template):**
  - Basic site (about 5 pages): ₹8,000–15,000
  - Landing page: ₹5,000–9,000
  - Google Business Profile + website bundle: ₹10,000–18,000
  - Maintenance: ₹1,000–2,500/month
  - His first real site was ₹5,000 including domain — that is history, NOT the anchor price for new gigs. Do not auto-fill ₹5,000.
- **On a pricing call, the app's call script must remind him:** ask scope first (business goal, page count, whether logo / photos / text are ready, timeline), give a range on the call, exact written quote after scope is known. Never mention how fast he built it, how many prompts it took, or what a previous client paid.
- **Terms template (shown on the pricing sheet):** 50% advance before building, balance on delivery, 2 revisions included, extra changes paid, 5–7 days for a basic site, yearly domain/hosting renewal separate (not bundled forever).
- **Won step enforcement:** moving a gig to `Won` must prompt for the quoted price and advance amount (default 50%). Moving to `Paid advance` requires an advance amount and a date. Do not let "Paid advance" be a free tap with no amount.

## 6. Screens — same screens on web and phone

Build the same screens for both, responsive. Do not invent a different phone app with different screens.

1. **Login** — password field, Log in button, plain error on wrong password ("Wrong password, try again"). Session stays logged in on that device until he logs out.
2. **Today** — Section 4.1. Home screen.
3. **Gig detail** — Section 4.2 + 4.3. Includes status picker, copy buttons, call script sheet, pricing sheet, notes, checklist.
4. **All gigs** — list, search by business name, filter by status. Tapping a gig opens Gig detail.
5. **Earnings** — Section 4.6, plus maintenance retainers list.
6. **Portfolio** — Section 4.7.
7. **Settings (minimal)** — Log out, change password. Nothing else in v1.

No other screens in v1. No analytics dashboard, no charts page, no settings maze.

## 7. Data model — Codex, use field names close to these

Keep this simple. One database, shared by web and phone.

### Gig
- `id` (uuid)
- `business_name` (text, required)
- `business_type` (text, e.g. salon, clinic, coaching)
- `city_area` (text)
- `contact_name` (text, nullable)
- `contact_whatsapp` (text, nullable)
- `contact_email` (text, nullable)
- `source` (text, e.g. "Google Maps")
- `problem_noticed` (text, required)
- `why_it_fits` (text, required)
- `demo_link` (text url, nullable)
- `price_min` (number, nullable), `price_max` (number, nullable)
- `outreach_whatsapp` (text, required for Approved gigs)
- `outreach_email` (text, nullable)
- `call_script` (text, nullable — default template if Muse does not supply one)
- `status` (enum, see Section 4.4, default `New`)
- `sent_at` (datetime, nullable — set when status first becomes Sent)
- `followup_1_due` (date, nullable), `followup_2_due` (date, nullable)
- `quoted_price` (number, nullable), `advance_amount` (number, nullable), `advance_paid_at` (date, nullable), `balance_amount` (number, nullable), `balance_paid_at` (date, nullable)
- `notes` (text, default empty)
- `created_by` (text, default "muse")
- `created_at`, `updated_at` (datetimes)

### GigStep
- `id`, `gig_id` (foreign key), `position` (number, order), `title` (text), `detail` (text, nullable), `done` (boolean, default false), `done_at` (datetime, nullable)

### PortfolioItem
- `id`, `title` (text), `niche` (text), `link` (text url), `kind` (enum: `real_client` | `demo`, required), `gig_id` (nullable, link if related), `created_at`

### MaintenanceRetainer
- `id`, `business_name` (text), `gig_id` (nullable), `monthly_amount` (number), `next_due_date` (date), `active` (boolean, default true)

### User (single user)
- `id`, `password_hash` (bcrypt, never store plain text), `created_at`
- No sign-up endpoint in v1. Seed the one user from an environment variable at first setup, then he changes the password in Settings.

Derived, not stored separately: monthly earnings = sum of advances + balances + maintenance payments whose paid date falls in that month. If Codex stores payment events instead, keep the same totals — do not double-count an advance as both advance and total.

## 8. Tech stack — free / low-cost only, proven pattern for this user

Recommended stack (Codex may swap a like-for-like free piece only if the API contract and screens stay identical):

- **Web frontend:** React + Vite + Tailwind, hosted on **Vercel free tier**. This is his personal tool, not a paying client's site, so Vercel free is fine here.
- **Android app:** **React Native + Expo**, same screens and same API as the web app. APK via EAS or a local Android build, like Daily Drop. **No Play Store listing in v1.**
- **Backend API:** one backend for both frontends. Recommended: the same pattern as his Daily Drop backend — a small API (FastAPI or Node/Express, pick one and be consistent) on **Render free tier** + **Neon Postgres free tier**. Free-tier sleep / slow first load is acceptable for v1 and must be handled with a loading state, not hidden.
- **Push (Android):** **Firebase Cloud Messaging (FCM)**, native FCM in the Expo app. This setup already worked for Daily Drop after the 2026-10-16 rebuild. Follow the Daily Drop traps: an APK built without `google-services.json` is push-dead and no JS update can fix it (rebuild required); Expo Go cannot prove push — test push on a real APK build.
- **Auth:** password login returning a session token / JWT. All gig endpoints require that token, EXCEPT the Muse ingestion endpoint below, which uses its own server token.
- **Muse ingestion (how Muse sends a gig):**
  - `POST /api/gigs` with header `X-Muse-Token: <MUSE_API_TOKEN from server env>` and a JSON body matching the Gig + GigStep fields in Section 7.
  - On successful create, the backend must trigger an FCM push: "New gig: <business_name> — <problem_noticed, short>".
  - This token is a server secret. Never put it in frontend code, never commit it, never show it in the app UI.
  - Muse does NOT log in as the user to add gigs. The user login and the Muse token are separate.
- **Secrets, never committed:** backend env vars, database URL, JWT secret, `MUSE_API_TOKEN`, Firebase service-account key, `google-services.json`. That last file lives in the mobile Firebase folder only, like Daily Drop, and must be git-ignored.

### Minimal API contract (Codex, implement at least these)
- `POST /api/auth/login` — { password } → session token. Wrong password → 401, plain message.
- `POST /api/auth/change-password` — requires session token.
- `POST /api/gigs` — requires `X-Muse-Token` (Muse only). Creates gig + steps. Triggers new-gig push.
- `GET /api/today` — requires session token. Returns: current gig + next step, follow-ups due / overdue, new gigs.
- `GET /api/gigs?status=&q=` — requires session token.
- `GET /api/gigs/:id` — requires session token.
- `PATCH /api/gigs/:id` — requires session token. Edit gig fields, notes, price, status. Status change to Sent sets `sent_at` + follow-up dates; to Lost clears pending follow-ups.
- `PATCH /api/gigs/:id/steps/:stepId` — requires session token. Toggle `done`.
- `GET /api/earnings?month=YYYY-MM` — requires session token.
- `GET/POST/PATCH /api/portfolio` and `/api/retainers` — requires session token.
- Every endpoint returns plain-language errors, not stack traces, to the app.

## 9. Explicitly OUT of v1 — do not build these, even if they look easy

- Multi-user, teams, client logins, or a public sign-up page
- Auto-sending WhatsApp / email, bulk outreach, or any message sent without him tapping send himself
- Payments inside the app, UPI / card checkout, invoicing, GST
- AI chat, AI gig generation, or lead scoring inside the app (Muse does that outside the app and posts via the API)
- A CRM dashboard with charts, funnels, or analytics pages
- Truelancer / Upwork / Freelancer.com integration (those are later side tracks in his plan, not v1)
- Play Store listing
- Web push for the laptop (web uses Today view; phone FCM is the push channel in v1)
- Client website building, hosting, or domain selling inside this app — this app manages gigs, it is not a website builder
- Any feature that needs a paid subscription to work

If Codex thinks something in this list is needed to make the core loop work, stop and ask escnaor first — do not silently add it.

## 10. Build order — do it in this order, test each step before the next

1. **Repo + backend + database + login.** Seed the single user. Login works, wrong password fails. Muse `POST /api/gigs` works with the server token and fails without it. No frontend yet — test with curl / API calls.
2. **Gig CRUD + status pipeline + steps.** Create, read, edit, change status in one tap, tick steps, progress saves. Follow-up dates are calculated correctly on Sent.
3. **Web app: Login → Today → Gig detail.** Copy buttons work and show "Copied." Call script and pricing sheet open in one tap. Notes save.
4. **Earnings + Portfolio + Retainers.** Monthly totals math is correct (advance + balance + maintenance, no double-counting). Portfolio labels Real vs Demo are visible.
5. **Follow-ups + FCM push (Android).** Day 3 / Day 7 logic, stop after Day 7, no reminders after Replied / Won / Lost. Push arrives on a real APK build for a new gig and for a due follow-up.
6. **Android app (Expo): same screens, same API.** Login, Today, Gig detail, status, checklist, copy, Earnings, Portfolio all work on the phone. A change on the phone shows on the laptop web app.
7. **Polish + final test.** Empty states, loading states, plain errors, phone + laptop sizes, large tap targets. Run the acceptance checklist in Section 11, fix failures, then hand it over.

## 11. Acceptance checklist — Codex must pass all of these before handing over

- [ ] Login with the correct password works on web AND on the Android app; wrong password shows a plain error and does not log in.
- [ ] A Muse `POST /api/gigs` with the correct token creates a gig with steps, and the phone gets a push for it. Without the token, it fails.
- [ ] Today shows: Do today (next unchecked step), Follow-ups due, New gigs waiting — and "Nothing due today" when there is nothing.
- [ ] Gig detail shows business, contact, problem, why it fits, demo link, price range, both outreach messages with working Copy buttons, call script in one tap, pricing sheet in one tap, checklist, notes, and status.
- [ ] Approving a gig is required before outreach is actionable. Copying a message alone does NOT mark a gig Sent.
- [ ] Status moves in one tap through the full pipeline, including backwards, and Lost stops follow-ups.
- [ ] Marking Sent sets follow-ups at +3 and +7 days, then stops. A push + Today item appears on each due date, and neither appears after Replied / Won / Lost.
- [ ] Won prompts for quoted price + advance (default 50%); Paid advance requires amount + date; Earnings math for the month is correct with no double-counting.
- [ ] Portfolio items are clearly labelled Real client vs Demo, and links open correctly.
- [ ] A status / step / note change made on the phone appears on the laptop web app (same backend, same data), and vice versa.
- [ ] Empty, loading, and error states are plain language on both web and phone. No stack traces in the UI.
- [ ] No secrets, tokens, `google-services.json`, or passwords are committed to the repo. List the env vars Codex used, without their values, in the handover note.
- [ ] One sample gig is used for testing and then deleted / clearly marked as test data before handover, so his real Today view starts clean.

## 12. Handover note Codex must include

When Codex finishes, it must tell escnaor, in plain language, one step at a time:
1. The web URL, and how to install / update the Android APK
2. The login password setup — how it was seeded and how to change it in Settings (do NOT paste the password into a shared doc)
3. The env vars that need to be set on Render / Vercel / Firebase, by name only, no values
4. How Muse should post a new gig (endpoint + token setup, by name only)
5. Anything from the acceptance checklist that did NOT pass, and what is still needed

---

*Source decisions: escnaor's locked choices in this planning chat on 2026-10-26 — both web + Android like Daily Drop, simple password login, nice features as priority, Firebase push included (proven working 2026-10-16), 50% advance rule, Day 3 / Day 7 then stop, ₹10,000–15,000/month goal, and the pricing / terms from his 90-day freelance gigs plan.*
