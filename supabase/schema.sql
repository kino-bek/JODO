create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null check (length(title) between 1 and 200),
  due timestamptz not null,
  project text not null default 'Личное',
  done boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz default now()
);
alter table public.tasks enable row level security;
-- каждый пользователь видит и меняет только свои задачи
create policy "own tasks" on public.tasks for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
