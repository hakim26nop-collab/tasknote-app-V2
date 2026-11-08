-- Jalankan seluruh SQL ini di Supabase Dashboard > SQL Editor.
-- Aktifkan Email provider di Authentication > Providers.
create extension if not exists pgcrypto;

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  created_at timestamptz not null default now(),
  unique(user_id, name)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  title text not null check (char_length(title) between 1 and 120),
  description text,
  due_date date,
  priority text not null default 'normal' check (priority in ('normal','high','urgent')),
  status text not null default 'todo' check (status in ('todo','doing','done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subjects enable row level security;
alter table public.tasks enable row level security;

create policy "Users manage own subjects" on public.subjects
for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own tasks" on public.tasks
for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists tasks_user_due_idx on public.tasks(user_id, due_date);
create index if not exists tasks_user_status_idx on public.tasks(user_id, status);
