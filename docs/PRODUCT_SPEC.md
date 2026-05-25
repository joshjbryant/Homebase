# Homebase — Product Specification
**Version:** 1.0 MVP  
**Owner:** JB 42 Capital Partners  
**Target launch:** PWA (web + mobile installable)  
**Monetization:** Flat monthly subscription $9–12/mo via Stripe

---

## 1. Problem

Co-parents have no single, clean tool for managing shared custody schedules, kid expenses, and communication. Existing tools (OurFamilyWizard, TalkingParents) are expensive, clunky, and designed for conflict — not modern co-parenting. Homebase is designed for functional co-parents who want simplicity and clarity.

---

## 2. Target User

- Two co-parents (exactly two users per household)
- At least one kid in shared custody
- Both parents are functional and cooperative (not litigation-focused)
- Likely: athletic/active kid schedule with multiple sports leagues
- Price-sensitive but willing to pay for something that actually works

---

## 3. Core Features (MVP)

### 3.1 Auth & Accounts
- Email/password auth via Supabase Auth
- Exactly two users per "household" — one parent creates, one joins via invite link
- Stripe subscription tied to the creating parent (one subscription per household)
- Free 14-day trial, no credit card required

### 3.2 Custody Calendar
- Month view with color-coded custody days (Parent A / Parent B)
- Both parents can add, edit, or delete custody days
- Change proposals with accept/decline flow (optional — Phase 2)
- Day detail panel showing all events for that day

### 3.3 Sports & Activity Feed Subscriptions
- Add external calendars by iCal URL (webcal:// or .ics)
- Each feed gets a custom name and color
- Feed events appear as colored dots on calendar days
- Toggle feeds on/off
- Auto-refresh every 6 hours via server-side cron

### 3.4 Calendar Export & Subscribe
- Generate a live iCal feed URL for the custody calendar
- Subscribe link works with Fantastical, Outlook, Apple Calendar, Google Calendar
- Download one-time .ics snapshot

### 3.5 Shared Expenses
- Log expenses with: description, amount, category, date, who paid, split %
- Categories: Medical, School, Sports, Clothing, Food, Other
- Receipt upload (image or PDF) stored in Supabase Storage
- Running balance per parent (who owes whom)
- Mark individual expenses as paid/unpaid
- Monthly summary + YTD totals
- Export expenses as CSV (useful for taxes)

### 3.6 Messaging
- In-app direct message thread between the two parents
- Push notifications via PWA (web push)
- System notifications: new expense added, custody day changed
- All messages timestamped and permanently logged

### 3.7 Document Vault
- Shared file storage for kid-related documents
- Categories: Medical, School, Legal, Other
- Upload PDF or image
- Both parents can view; only uploader can delete

---

## 4. Phase 2 Features (post-MVP)

- Schedule change request + approval flow
- Kid info hub (allergies, doctors, medications, emergency contacts)
- Annual expense report (PDF, formatted for tax use)
- Multiple kids per household
- In-app notifications (expense reminders, overdue reimbursements)
- Mobile native app (React Native)

---

## 5. Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Framework | Next.js 14 (App Router) | SSR, API routes, PWA support |
| Language | TypeScript | Type safety across full stack |
| Database | Supabase (Postgres) | Auth + DB + Storage in one |
| Auth | Supabase Auth | Email/password + invite links |
| File Storage | Supabase Storage | Receipts, documents |
| Payments | Stripe | Subscriptions + billing portal |
| iCal parsing | ical.js | Parse external feed URLs |
| iCal generation | ical-generator | Generate custody calendar feeds |
| Styling | Tailwind CSS | Fast, consistent, PWA-friendly |
| Hosting | Vercel | Next.js-native, free tier |
| Cron jobs | Vercel Cron | Refresh iCal feeds every 6 hrs |

---

## 6. Database Schema (Supabase/Postgres)

### households
```sql
id uuid PK
created_by uuid FK users
stripe_customer_id text
stripe_subscription_id text
subscription_status text -- trialing, active, past_due, canceled
trial_ends_at timestamptz
created_at timestamptz
```

### household_members
```sql
id uuid PK
household_id uuid FK households
user_id uuid FK auth.users
display_name text
color text -- hex, used on calendar
role text -- owner | member
joined_at timestamptz
```

### custody_days
```sql
id uuid PK
household_id uuid FK households
date date
assigned_to uuid FK household_members
created_by uuid FK household_members
updated_at timestamptz
```

### calendar_feeds
```sql
id uuid PK
household_id uuid FK households
name text
url text
color text
enabled boolean DEFAULT true
last_synced_at timestamptz
created_by uuid FK household_members
created_at timestamptz
```

### expenses
```sql
id uuid PK
household_id uuid FK households
description text
amount numeric(10,2)
category text
expense_date date
paid_by uuid FK household_members
split_pct integer -- % paid_by owes (rest owed by other parent)
receipt_url text
status text -- pending | paid
created_by uuid FK household_members
created_at timestamptz
updated_at timestamptz
```

### messages
```sql
id uuid PK
household_id uuid FK households
sender_id uuid FK household_members
body text
created_at timestamptz
```

### documents
```sql
id uuid PK
household_id uuid FK households
name text
category text
file_url text
uploaded_by uuid FK household_members
created_at timestamptz
```

---

## 7. Stripe Billing

- Product: "Homebase" — $9.99/mo (or $99/yr — Phase 2)
- 14-day free trial on signup, no card required
- Card collected at trial end via Stripe Checkout
- Billing portal link for self-serve cancellation/update
- Webhook events handled: `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
- Household access gated on `subscription_status IN ('trialing', 'active')`

---

## 8. PWA Configuration

- `manifest.json`: name, icons, theme_color, display: standalone
- Service worker via `next-pwa`
- Offline fallback page
- Web push notifications (VAPID keys)
- "Add to Home Screen" prompt on mobile

---

## 9. Security

- Row Level Security (RLS) on all Supabase tables — users can only read/write their own household's data
- Supabase Storage bucket policies — receipts/docs scoped to household
- iCal feed URLs signed with household token (not guessable)
- All API routes validate session server-side
- Stripe webhooks verified with webhook secret

---

## 10. Pricing & Business Model

| Plan | Price | Notes |
|------|-------|-------|
| Trial | Free 14 days | Full access, no card |
| Monthly | $9.99/mo | Per household, not per user |
| Annual | $99/yr (Phase 2) | ~17% discount |

**Unit economics (rough):**
- 100 households = ~$1,000 MRR
- 500 households = ~$5,000 MRR
- CAC target: <$20 (SEO + word of mouth primary)
- Churn risk: low (sticky data — calendar history, expense records)
