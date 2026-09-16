-- Sistema de notificaciones inteligentes. Ver src/domain/notifications.ts.
--
-- Ninguna de estas 3 tablas vive en `save_app_data`/AppData: `notifications`
-- crece sin límite superior (mismo criterio que `focus_sessions`, ver
-- 0009_focus_sessions.sql) y las otras dos son configuración/infra propia,
-- no datos de progreso. El motor de reglas corre en el cliente
-- (src/domain/notificationEngine.ts) e inserta acá directo, por eso
-- `user_id default auth.uid()` en vez de pasar por una función security
-- definer.

create table public.notification_preferences (
  user_id            uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  enabled            boolean not null default true,
  achievements       boolean not null default true,
  streaks            boolean not null default true,
  motivation         boolean not null default true,
  reminders          boolean not null default true,
  push_enabled       boolean not null default false,
  quiet_hours_start  smallint not null default 22 check (quiet_hours_start between 0 and 23),
  quiet_hours_end    smallint not null default 8 check (quiet_hours_end between 0 and 23),
  updated_at         timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

create policy "notification_preferences: owner rw" on public.notification_preferences
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.notifications (
  id           text not null,
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type         text not null,
  category     text not null check (category in ('achievements', 'streaks', 'motivation', 'reminders')),
  priority     smallint not null default 5,
  title        text not null,
  body         text not null,
  action_path  text,
  dedup_key    text not null,
  ai_phrased   boolean not null default false,
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  read_at      timestamptz,
  primary key (user_id, id)
);
create index notifications_user_id_idx on public.notifications (user_id);
create index notifications_created_at_idx on public.notifications (user_id, created_at desc);
-- Sostiene el chequeo de deduplicación del motor (`wasNotified`), que corre
-- una vez por sesión/día por usuario: buscar por dedup_key tiene que ser barato.
create index notifications_dedup_key_idx on public.notifications (user_id, dedup_key);

alter table public.notifications enable row level security;

create policy "notifications: owner rw" on public.notifications
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth_key    text not null,
  user_agent  text,
  created_at  timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions: owner rw" on public.push_subscriptions
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Actualizar clear_app_data para incluir las 3 tablas nuevas ("Borrar todos
-- los datos" en Ajustes debe llevarse puesto también notificaciones y sus
-- preferencias/suscripciones push). Parte de la versión más reciente
-- (0020_drop_life_wheel.sql) y sólo agrega las tablas nuevas — no toca el gap
-- preexistente de `focus_sessions` (no forma parte de esta tarea).
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
  delete from reflections where user_id = uid;
  delete from notes where user_id = uid;
  delete from project_tasks where user_id = uid;
  delete from projects where user_id = uid;
  delete from notifications where user_id = uid;
  delete from notification_preferences where user_id = uid;
  delete from push_subscriptions where user_id = uid;
  delete from goals where user_id = uid;
  delete from categories where user_id = uid;
  update user_settings set
    app_name = 'Mi Progreso',
    streak_threshold = 70,
    allow_editing_past_days = false,
    birth_date = null,
    life_expectancy_years = null,
    nav_order = null,
    updated_at = now()
  where user_id = uid;
end;
$$;

revoke all on function public.clear_app_data() from public;
grant execute on function public.clear_app_data() to authenticated;
