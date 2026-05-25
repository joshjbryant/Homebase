-- ============================================================
-- Homebase — Supabase Migration 001
-- Run in Supabase SQL editor or via supabase db push
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── households ────────────────────────────────────────────
create table public.households (
  id                      uuid primary key default uuid_generate_v4(),
  created_by              uuid references auth.users not null,
  stripe_customer_id      text,
  stripe_subscription_id  text,
  subscription_status     text not null default 'trialing'
                          check (subscription_status in ('trialing','active','past_due','canceled','incomplete')),
  trial_ends_at           timestamptz default (now() + interval '14 days'),
  created_at              timestamptz not null default now()
);

-- ─── household_members ─────────────────────────────────────
create table public.household_members (
  id             uuid primary key default uuid_generate_v4(),
  household_id   uuid references public.households on delete cascade not null,
  user_id        uuid references auth.users not null,
  display_name   text not null,
  color          text not null default '#4a7c59',
  role           text not null default 'member'
                 check (role in ('owner','member')),
  joined_at      timestamptz not null default now(),
  unique (household_id, user_id)
);

-- ─── custody_days ──────────────────────────────────────────
create table public.custody_days (
  id             uuid primary key default uuid_generate_v4(),
  household_id   uuid references public.households on delete cascade not null,
  date           date not null,
  assigned_to    uuid references public.household_members on delete cascade not null,
  created_by     uuid references public.household_members on delete cascade not null,
  updated_at     timestamptz not null default now(),
  unique (household_id, date)
);

-- ─── calendar_feeds ────────────────────────────────────────
create table public.calendar_feeds (
  id             uuid primary key default uuid_generate_v4(),
  household_id   uuid references public.households on delete cascade not null,
  name           text not null,
  url            text not null,
  color          text not null default '#2a7fba',
  enabled        boolean not null default true,
  last_synced_at timestamptz,
  created_by     uuid references public.household_members on delete cascade not null,
  created_at     timestamptz not null default now()
);

-- ─── calendar_feed_events (cached from iCal fetches) ───────
create table public.calendar_feed_events (
  id           uuid primary key default uuid_generate_v4(),
  feed_id      uuid references public.calendar_feeds on delete cascade not null,
  household_id uuid references public.households on delete cascade not null,
  title        text not null,
  event_date   date not null,
  start_time   time,
  end_time     time,
  all_day      boolean not null default true,
  uid          text,  -- iCal UID for dedup
  unique (feed_id, uid)
);

create index on public.calendar_feed_events (household_id, event_date);

-- ─── expenses ──────────────────────────────────────────────
create table public.expenses (
  id             uuid primary key default uuid_generate_v4(),
  household_id   uuid references public.households on delete cascade not null,
  description    text not null,
  amount         numeric(10,2) not null check (amount > 0),
  category       text not null default 'other'
                 check (category in ('medical','school','sports','clothing','food','other')),
  expense_date   date not null,
  paid_by        uuid references public.household_members on delete cascade not null,
  split_pct      integer not null default 50
                 check (split_pct between 0 and 100),
  receipt_url    text,
  status         text not null default 'pending'
                 check (status in ('pending','paid')),
  created_by     uuid references public.household_members on delete cascade not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index on public.expenses (household_id, expense_date desc);
create index on public.expenses (household_id, status);

-- ─── messages ──────────────────────────────────────────────
create table public.messages (
  id             uuid primary key default uuid_generate_v4(),
  household_id   uuid references public.households on delete cascade not null,
  sender_id      uuid references public.household_members on delete cascade not null,
  body           text not null,
  created_at     timestamptz not null default now()
);

create index on public.messages (household_id, created_at asc);

-- ─── documents ─────────────────────────────────────────────
create table public.documents (
  id             uuid primary key default uuid_generate_v4(),
  household_id   uuid references public.households on delete cascade not null,
  name           text not null,
  category       text not null default 'other'
                 check (category in ('medical','school','legal','other')),
  file_url       text not null,
  uploaded_by    uuid references public.household_members on delete cascade not null,
  created_at     timestamptz not null default now()
);

-- ─── invite_tokens ─────────────────────────────────────────
create table public.invite_tokens (
  id             uuid primary key default uuid_generate_v4(),
  household_id   uuid references public.households on delete cascade not null,
  token          text not null unique default encode(gen_random_bytes(24), 'hex'),
  created_by     uuid references auth.users not null,
  used_at        timestamptz,
  expires_at     timestamptz not null default (now() + interval '7 days'),
  created_at     timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.households           enable row level security;
alter table public.household_members    enable row level security;
alter table public.custody_days         enable row level security;
alter table public.calendar_feeds       enable row level security;
alter table public.calendar_feed_events enable row level security;
alter table public.expenses             enable row level security;
alter table public.messages             enable row level security;
alter table public.documents            enable row level security;
alter table public.invite_tokens        enable row level security;

-- Helper function: get current user's household_id
create or replace function public.my_household_id()
returns uuid language sql security definer as $$
  select household_id from public.household_members
  where user_id = auth.uid()
  limit 1;
$$;

-- Helper function: check if household subscription is active
create or replace function public.household_is_active(hid uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.households
    where id = hid
    and subscription_status in ('trialing','active')
  );
$$;

-- ── households ──
create policy "members can read own household"
  on public.households for select
  using (id = public.my_household_id());

create policy "owner can update household"
  on public.households for update
  using (created_by = auth.uid());

-- ── household_members ──
create policy "members can read their household members"
  on public.household_members for select
  using (household_id = public.my_household_id());

create policy "members can update their own record"
  on public.household_members for update
  using (user_id = auth.uid());

-- ── custody_days ──
create policy "household members can read custody days"
  on public.custody_days for select
  using (household_id = public.my_household_id());

create policy "household members can insert custody days"
  on public.custody_days for insert
  with check (household_id = public.my_household_id()
    and public.household_is_active(household_id));

create policy "household members can update custody days"
  on public.custody_days for update
  using (household_id = public.my_household_id()
    and public.household_is_active(household_id));

create policy "household members can delete custody days"
  on public.custody_days for delete
  using (household_id = public.my_household_id());

-- ── calendar_feeds ──
create policy "household members can manage feeds"
  on public.calendar_feeds for all
  using (household_id = public.my_household_id());

-- ── calendar_feed_events ──
create policy "household members can read feed events"
  on public.calendar_feed_events for select
  using (household_id = public.my_household_id());

-- ── expenses ──
create policy "household members can manage expenses"
  on public.expenses for all
  using (household_id = public.my_household_id());

-- ── messages ──
create policy "household members can read messages"
  on public.messages for select
  using (household_id = public.my_household_id());

create policy "household members can send messages"
  on public.messages for insert
  with check (household_id = public.my_household_id()
    and public.household_is_active(household_id));

-- ── documents ──
create policy "household members can read documents"
  on public.documents for select
  using (household_id = public.my_household_id());

create policy "household members can upload documents"
  on public.documents for insert
  with check (household_id = public.my_household_id()
    and public.household_is_active(household_id));

create policy "uploader can delete own documents"
  on public.documents for delete
  using (uploaded_by in (
    select id from public.household_members where user_id = auth.uid()
  ));

-- ── invite_tokens ──
create policy "creator can read own invite"
  on public.invite_tokens for select
  using (created_by = auth.uid());

-- ============================================================
-- STORAGE BUCKETS (run in Supabase dashboard or via API)
-- ============================================================
-- insert into storage.buckets (id, name, public) values ('receipts', 'receipts', false);
-- insert into storage.buckets (id, name, public) values ('documents', 'documents', false);
-- Storage policies: scope to household_id path prefix

-- ============================================================
-- REALTIME (enable for messages)
-- ============================================================
-- In Supabase dashboard: enable realtime on public.messages table
