# Homebase

**Co-parenting made simple.** Shared custody calendar, expense tracking, messaging, and document storage — all in one clean PWA.

**Stack:** Next.js 14 · TypeScript · Supabase · Stripe · Tailwind CSS · Vercel

---

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/your-org/homebase.git
cd homebase
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run the migration in **Supabase SQL Editor:**
   ```
   supabase/migrations/001_initial_schema.sql
   ```
3. Create storage buckets in **Supabase Dashboard → Storage:**
   - `receipts` (private)
   - `documents` (private)
4. Enable **Realtime** on the `messages` table
5. Copy your project URL and keys

### 3. Set up Stripe

1. Create a product in **Stripe Dashboard:** "Homebase Monthly" at $9.99/mo
2. Copy the **Price ID**
3. Set up a webhook endpoint pointing to `https://your-domain.com/api/webhooks/stripe`
4. Select events: `customer.subscription.*`, `invoice.payment_failed`, `invoice.payment_succeeded`, `checkout.session.completed`
5. Copy the webhook signing secret

### 4. Configure environment

```bash
cp .env.example .env.local
# Fill in all values
```

### 5. Run locally

```bash
npm run dev
# App runs at http://localhost:3000

# In a separate terminal, forward Stripe webhooks:
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

---

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Login, signup, invite pages
│   ├── (dashboard)/        # Protected app pages
│   │   ├── dashboard/      # Main calendar view
│   │   ├── expenses/       # Expense tracker
│   │   ├── messages/       # Messaging
│   │   └── docs/           # Document vault
│   ├── api/
│   │   ├── webhooks/stripe/ # Stripe webhook handler
│   │   ├── calendar/       # iCal feed generation
│   │   └── cron/           # Feed sync cron jobs
│   └── layout.tsx
├── components/
│   ├── calendar/           # Calendar UI components
│   ├── expenses/           # Expense UI components
│   ├── messages/           # Message UI components
│   ├── docs/               # Document vault components
│   └── ui/                 # Shared UI (Button, Input, Modal, etc.)
├── lib/
│   ├── supabase/           # Supabase clients (browser + server)
│   ├── stripe.ts           # Stripe helpers
│   └── ical.ts             # iCal parsing + generation
├── types/
│   └── index.ts            # All TypeScript types
└── middleware.ts            # Auth + subscription gating
```

---

## Deployment (Vercel)

1. Push to GitHub
2. Import repo in [Vercel Dashboard](https://vercel.com)
3. Add all environment variables from `.env.example`
4. Deploy — Vercel auto-detects Next.js
5. The cron job (`vercel.json`) runs automatically every 6 hours

### Custom domain

Point `homebase.app` (or your domain) to Vercel in DNS settings.  
Update `NEXT_PUBLIC_APP_URL` in Vercel environment variables.

---

## Key Features

| Feature | Implementation |
|---------|---------------|
| Auth | Supabase Auth (email/password) |
| Two-user households | Invite link → `invite_tokens` table |
| Custody calendar | `custody_days` table, both parents can edit |
| Sports feeds | External iCal URLs, cached in `calendar_feed_events` |
| Feed sync | Vercel Cron → `/api/cron/sync-feeds` every 6 hrs |
| Calendar export | `/api/calendar/[id]/feed.ics` — subscribe in Fantastical/Outlook |
| Expenses | `expenses` table, receipt files in Supabase Storage |
| Messaging | `messages` table with Supabase Realtime |
| Documents | `documents` table, files in Supabase Storage |
| Billing | Stripe Checkout + billing portal |
| Subscription gating | Next.js middleware checks `subscription_status` |
| Security | Row Level Security on all tables |
| PWA | `next-pwa` + `manifest.json` — installable on iOS/Android |

---

## Roadmap

- [ ] **v1.0** — Calendar, expenses, messaging, docs, Stripe billing
- [ ] **v1.1** — Schedule change request + approval flow
- [ ] **v1.2** — Kid info hub (allergies, doctors, emergency contacts)
- [ ] **v1.3** — Annual expense report PDF (tax export)
- [ ] **v2.0** — Multiple kids per household
- [ ] **v2.1** — Annual billing plan ($99/yr)
- [ ] **v3.0** — Native iOS/Android (React Native)

---

## Business

- **Entity:** JB 42 Capital Partners / Stealing Home Capital
- **Pricing:** $9.99/mo per household, 14-day free trial
- **Target MRR milestones:** $1k (100 HH) → $5k (500 HH) → $10k (1,000 HH)
- **Primary CAC channel:** SEO + co-parenting communities
