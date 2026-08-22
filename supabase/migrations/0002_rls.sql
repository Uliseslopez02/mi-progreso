-- Row Level Security: cada usuario sólo ve/escribe sus propias filas.
-- Las policies se restringen explícitamente al rol `authenticated` (no sólo
-- se confía en que auth.uid() sea NULL para anon): cualquier request sin
-- sesión válida obtiene cero filas por default-deny de RLS.

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.categories enable row level security;
alter table public.goals enable row level security;
alter table public.day_records enable row level security;
alter table public.period_records enable row level security;

create policy "profiles: owner rw" on public.profiles
  for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "user_settings: owner rw" on public.user_settings
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "categories: owner rw" on public.categories
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "goals: owner rw" on public.goals
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "day_records: owner rw" on public.day_records
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "period_records: owner rw" on public.period_records
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
