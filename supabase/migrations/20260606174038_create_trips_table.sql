create table if not exists public.trips (
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null,
  plan jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, plan_id)
);

alter table public.trips enable row level security;

grant select, insert, update, delete on table public.trips to authenticated;

create policy "Users can read their own trips"
on public.trips
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert their own trips"
on public.trips
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own trips"
on public.trips
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own trips"
on public.trips
for delete
to authenticated
using ((select auth.uid()) = user_id);

notify pgrst, 'reload schema';
