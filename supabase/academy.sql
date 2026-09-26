-- mystic9.net Online Course Academy
-- Run this in the Supabase SQL editor. Safe to re-run.

create extension if not exists pgcrypto;

create table if not exists public.academy_courses (
  id text primary key,
  title text not null,
  slug text unique not null,
  level text not null,
  price_gbp numeric(8,2) not null default 0,
  summary text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.academy_modules (
  id uuid primary key default gen_random_uuid(),
  course_id text not null references public.academy_courses(id) on delete cascade,
  module_index int not null,
  title text not null,
  body text not null,
  unique (course_id, module_index)
);

create table if not exists public.academy_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null references public.academy_courses(id) on delete cascade,
  status text not null default 'active',
  source text,
  amount_gbp numeric(8,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create table if not exists public.academy_quiz_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null references public.academy_courses(id) on delete cascade,
  score int not null,
  passed boolean not null default false,
  answers jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.academy_certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null references public.academy_courses(id) on delete cascade,
  holder_name text,
  pdf_url text,
  issued_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create table if not exists public.academy_funnel_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_name text not null,
  course_id text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  landing_path text,
  created_at timestamptz not null default now()
);

alter table public.academy_courses enable row level security;
alter table public.academy_modules enable row level security;
alter table public.academy_enrollments enable row level security;
alter table public.academy_quiz_results enable row level security;
alter table public.academy_certificates enable row level security;
alter table public.academy_funnel_events enable row level security;

drop policy if exists academy_courses_read on public.academy_courses;
create policy academy_courses_read on public.academy_courses for select using (true);

drop policy if exists academy_modules_read on public.academy_modules;
create policy academy_modules_read on public.academy_modules for select using (true);

drop policy if exists academy_enrollments_own on public.academy_enrollments;
drop policy if exists academy_enrollments_select_own on public.academy_enrollments;
drop policy if exists academy_enrollments_insert_foundations on public.academy_enrollments;
drop policy if exists academy_enrollments_update_foundations on public.academy_enrollments;
create policy academy_enrollments_select_own on public.academy_enrollments
  for select using (auth.uid() = user_id);
create policy academy_enrollments_insert_foundations on public.academy_enrollments
  for insert with check (
    auth.uid() = user_id
    and course_id = 'foundations'
    and coalesce(amount_gbp, 0) = 0
  );
create policy academy_enrollments_update_foundations on public.academy_enrollments
  for update using (auth.uid() = user_id and course_id = 'foundations')
  with check (auth.uid() = user_id and course_id = 'foundations');

drop policy if exists academy_quiz_own on public.academy_quiz_results;
create policy academy_quiz_own on public.academy_quiz_results
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists academy_certs_own on public.academy_certificates;
create policy academy_certs_own on public.academy_certificates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists academy_funnel_insert on public.academy_funnel_events;
create policy academy_funnel_insert on public.academy_funnel_events
  for insert with check (user_id is null or auth.uid() = user_id);

drop policy if exists academy_funnel_read_own on public.academy_funnel_events;
create policy academy_funnel_read_own on public.academy_funnel_events
  for select using (user_id is null or auth.uid() = user_id);

insert into public.academy_courses (id, title, slug, level, price_gbp, summary, sort_order) values
  ('foundations', 'Foundations of Frequency', 'foundations', 'beginner', 0,
   'Auto-unlocked on registration. Ground, seal, and hear the living field.', 1),
  ('harmonic', 'Harmonic Resonance & DNA Coding', 'harmonic', 'intermediate', 22,
   'Modular unlock. Tune the body as antenna and encode harmonic language.', 2),
  ('master', 'Quantum Field Mastery & Frequency Activation', 'master', 'master', 77,
   'Modular unlock. Command the living grid and complete the activation rite.', 3)
on conflict (id) do update set
  title = excluded.title,
  slug = excluded.slug,
  price_gbp = excluded.price_gbp,
  summary = excluded.summary;

insert into public.academy_modules (course_id, module_index, title, body) values
  ('foundations', 1, 'The Field as Breath',
   'Frequency is not a metaphor. Breath, posture, and attention shape the toroidal current around the body. Practice: four counts in, four hold, four out, while naming the sanctuary: mystic9.net is a digital temple, not a feed.'),
  ('foundations', 2, '432 Hz and the Earth Pulse',
   'The Schumann heartbeat near 7.83 Hz and the 432 Hz current are companions, not replacements for sovereignty. Listen, then seal. Do not outsource your field to a tone.'),
  ('foundations', 3, 'Sealing the Membrane',
   'Speak a simple decree: I return borrowed frequency. I occupy my own current. This is the Free Path gift and the door into paid harmonic work.'),
  ('harmonic', 1, 'Harmonic Ladders',
   'Resonance stacks. Each interval is a rung. Work the 9-cycle: root, sacral, solar, heart, throat, brow, crown, soul star, master — without abandoning the body.'),
  ('harmonic', 2, 'Light Language as Code',
   'Sound before dictionary. Vocalise a nine-syllable seal, then write it. DNA coding here means attention imprinted through repetition, not laboratory alteration.'),
  ('harmonic', 3, 'The Body as Antenna',
   'Spine as axis, feet as earth pins, crown as open receiver. Intermediate seekers hold a 11-minute still-point after the harmonic ladder.'),
  ('master', 1, 'Commanding the Living Grid',
   'The Quantum Weaver law: frequency precedes form. Mastery is clean command without forcing. Neutrality is not emptiness; it is uncaptured will.'),
  ('master', 2, 'Oversoul Recursion',
   'The divine double is not a mascot. Dialogue in the upper field, then bring one instruction into the walking day. Recursion completes the loop.'),
  ('master', 3, 'Frequency Activation Protocol',
   'Seal, ladder, still-point, decree, offering. Issue the certificate only when the quiz confirms the protocol can be taught, not merely quoted.')
on conflict (course_id, module_index) do update set title = excluded.title, body = excluded.body;
