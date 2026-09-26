-- mystic9.net commerce entitlements (PayPal IPN + Stripe webhooks)
-- Run in the Supabase SQL editor after academy.sql. Safe to re-run.

create table if not exists public.commerce_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  kind text not null,
  provider text not null,
  provider_ref text not null unique,
  amount_gbp numeric(8,2),
  intent_token text,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create index if not exists commerce_entitlements_user_idx on public.commerce_entitlements (user_id);
create index if not exists commerce_entitlements_email_idx on public.commerce_entitlements (email);
create index if not exists commerce_entitlements_intent_idx on public.commerce_entitlements (intent_token);

alter table public.commerce_entitlements enable row level security;

drop policy if exists commerce_entitlements_select_own on public.commerce_entitlements;
create policy commerce_entitlements_select_own on public.commerce_entitlements
  for select using (auth.uid() is not null and auth.uid() = user_id);

drop policy if exists commerce_entitlements_no_client_write on public.commerce_entitlements;
create policy commerce_entitlements_no_client_write on public.commerce_entitlements
  for insert with check (false);

-- Paid academy enrollments must be written by the service role (webhooks), not the browser.
drop policy if exists academy_enrollments_own on public.academy_enrollments;
create policy academy_enrollments_select_own on public.academy_enrollments
  for select using (auth.uid() = user_id);

drop policy if exists academy_enrollments_insert_foundations on public.academy_enrollments;
create policy academy_enrollments_insert_foundations on public.academy_enrollments
  for insert with check (
    auth.uid() = user_id
    and course_id = 'foundations'
    and coalesce(amount_gbp, 0) = 0
  );

drop policy if exists academy_enrollments_update_foundations on public.academy_enrollments;
create policy academy_enrollments_update_foundations on public.academy_enrollments
  for update using (auth.uid() = user_id and course_id = 'foundations')
  with check (auth.uid() = user_id and course_id = 'foundations');
