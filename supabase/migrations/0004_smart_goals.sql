-- Fase 3b — Objetivos inteligentes (cuantitativos, temporales, repetitivos precisos)

-- Agregar columnas a goals para soportar objetivos no-booleanos
alter table goals add column kind text default 'boolean' check (kind in ('boolean', 'quantitative', 'timed'));
alter table goals add column target_value numeric(10,2);
alter table goals add column unit text;
alter table goals add column days_of_week jsonb; -- array de días en inglés: ['monday', 'friday']

-- Renombrar columna en day_records: completed_goal_ids → goal_progress
-- (de array booleano a record flexible de número/booleano)
alter table day_records rename column completed_goal_ids to goal_progress;

-- Renombrar columna en period_records: completed_goal_ids → goal_progress
alter table period_records rename column completed_goal_ids to goal_progress;

-- Actualizar RPC save_app_data para manejar nuevos campos en goals y nuevo nombre de columna
create or replace function public.save_app_data(payload jsonb)
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

  insert into user_settings (user_id, app_name, streak_threshold, allow_editing_past_days, updated_at)
  values (
    uid,
    coalesce(payload->'settings'->>'appName', 'Mi Progreso'),
    coalesce((payload->'settings'->>'streakThreshold')::int, 70),
    coalesce((payload->'settings'->>'allowEditingPastDays')::boolean, false),
    now()
  )
  on conflict (user_id) do update set
    app_name = excluded.app_name,
    streak_threshold = excluded.streak_threshold,
    allow_editing_past_days = excluded.allow_editing_past_days,
    updated_at = now();

  insert into categories (id, user_id, name, order_index)
  select c->>'id', uid, c->>'name', coalesce((c->>'order')::int, 0)
  from jsonb_array_elements(coalesce(payload->'categories', '[]'::jsonb)) c
  on conflict (user_id, id) do update set
    name = excluded.name,
    order_index = excluded.order_index;

  delete from categories
  where user_id = uid
    and id not in (
      select c->>'id' from jsonb_array_elements(coalesce(payload->'categories', '[]'::jsonb)) c
    );

  insert into goals (id, user_id, category_id, name, weight, active, period, kind, target_value, unit, days_of_week, order_index, created_at)
  select
    g->>'id', uid, g->>'categoryId', g->>'name',
    coalesce((g->>'weight')::int, 1),
    coalesce((g->>'active')::boolean, true),
    coalesce(g->>'period', 'daily'),
    coalesce(g->>'kind', 'boolean'),
    coalesce((g->>'targetValue')::numeric, null),
    g->>'unit',
    g->'daysOfWeek',
    coalesce((g->>'order')::int, 0),
    coalesce((g->>'createdAt')::timestamptz, now())
  from jsonb_array_elements(coalesce(payload->'goals', '[]'::jsonb)) g
  on conflict (user_id, id) do update set
    category_id = excluded.category_id,
    name = excluded.name,
    weight = excluded.weight,
    active = excluded.active,
    period = excluded.period,
    kind = excluded.kind,
    target_value = excluded.target_value,
    unit = excluded.unit,
    days_of_week = excluded.days_of_week,
    order_index = excluded.order_index;

  delete from goals
  where user_id = uid
    and id not in (
      select g->>'id' from jsonb_array_elements(coalesce(payload->'goals', '[]'::jsonb)) g
    );

  insert into day_records (user_id, date, goals, goal_progress, closed, updated_at)
  select uid, d.key, d.value->'goals', d.value->'goalProgress',
         coalesce((d.value->>'closed')::boolean, false), now()
  from jsonb_each(coalesce(payload->'days', '{}'::jsonb)) d
  on conflict (user_id, date) do update set
    goals = excluded.goals,
    goal_progress = excluded.goal_progress,
    closed = excluded.closed,
    updated_at = now();

  delete from day_records
  where user_id = uid
    and date not in (
      select key from jsonb_each(coalesce(payload->'days', '{}'::jsonb))
    );

  insert into period_records (user_id, key, period, period_start, goals, goal_progress, closed, updated_at)
  select uid, p.key, p.value->>'period', p.value->>'periodStart',
         p.value->'goals', p.value->'goalProgress',
         coalesce((p.value->>'closed')::boolean, false), now()
  from jsonb_each(coalesce(payload->'periods', '{}'::jsonb)) p
  on conflict (user_id, key) do update set
    period = excluded.period,
    period_start = excluded.period_start,
    goals = excluded.goals,
    goal_progress = excluded.goal_progress,
    closed = excluded.closed,
    updated_at = now();

  delete from period_records
  where user_id = uid
    and key not in (
      select key from jsonb_each(coalesce(payload->'periods', '{}'::jsonb))
    );
end;
$$;

revoke all on function public.save_app_data(jsonb) from public;
grant execute on function public.save_app_data(jsonb) to authenticated;

-- Actualizar clear_app_data para referir a goal_progress en lugar de completed_goal_ids
-- (la función en sí no cambia, solo borra datos; la columna se maneja automáticamente)
