-- Fase 3 (Enfoque) — historial de sesiones de temporizador.
-- Ver src/domain/types.ts (`FocusSession`).
--
-- A diferencia de todas las tablas anteriores, esta NO se escribe desde
-- save_app_data: el historial de sesiones crece sin límite superior (varias
-- por día), así que cada sesión se inserta directo desde el cliente al
-- terminar (ver src/storage/supabaseRepository.ts: loadFocusSessions/
-- saveFocusSession), no como parte del blob con debounce. Por eso user_id
-- tiene `default auth.uid()`: es la primera tabla con un insert directo del
-- cliente en vez de pasar por una función security definer.

create table public.focus_sessions (
  id                     text not null,
  user_id                uuid not null default auth.uid() references auth.users(id) on delete cascade,
  started_at             timestamptz not null,
  completed_at           timestamptz not null,
  planned_minutes        int not null,
  type                   text not null default 'focus' check (type in ('focus', 'break')),
  status                 text not null default 'completed' check (status in ('completed', 'stopped')),
  linked_planner_item_id text,
  created_at             timestamptz not null default now(),
  primary key (user_id, id)
);
create index focus_sessions_user_id_idx on public.focus_sessions (user_id);
create index focus_sessions_started_at_idx on public.focus_sessions (user_id, started_at desc);

alter table public.focus_sessions enable row level security;

create policy "focus_sessions: owner rw" on public.focus_sessions
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Actualizar clear_app_data para incluir focus_sessions ("Borrar todos los
-- datos" en Ajustes debe llevarse puesto también el historial de enfoque).
create or replace function public.clear_app_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  delete from day_records where user_id = uid;
  delete from period_records where user_id = uid;
  delete from life_goals where user_id = uid;
  delete from planner_items where user_id = uid;
  delete from routine_runs where user_id = uid;
  delete from routines where user_id = uid;
  delete from focus_sessions where user_id = uid;
  delete from goals where user_id = uid;
  delete from categories where user_id = uid;
  update user_settings set
    app_name = 'Mi Progreso',
    streak_threshold = 70,
    allow_editing_past_days = false,
    updated_at = now()
  where user_id = uid;
end;
$$;

revoke all on function public.clear_app_data() from public;
grant execute on function public.clear_app_data() to authenticated;
