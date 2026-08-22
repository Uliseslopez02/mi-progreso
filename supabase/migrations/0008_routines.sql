-- Fase 3 (Rutinas) — rituales con pasos ordenados + ejecución por día.
-- Ver src/domain/types.ts (`Routine`, `RoutineRun`).

create table public.routines (
  id          text not null,
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  category    text not null default 'custom' check (category in ('morning', 'evening', 'workout', 'work', 'custom')),
  steps       jsonb not null default '[]'::jsonb,
  active      boolean not null default true,
  order_index int not null default 0,
  created_at  timestamptz not null default now(),
  primary key (user_id, id)
);
create index routines_user_id_idx on public.routines (user_id);

alter table public.routines enable row level security;

create policy "routines: owner rw" on public.routines
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Ejecución de una rutina en un día concreto: qué pasos se completaron. FK
-- compuesta a routines(user_id, id) para que borrar una rutina se lleve
-- puestas sus ejecuciones sin necesitar un delete-diff manual aparte.
create table public.routine_runs (
  user_id            uuid not null references auth.users(id) on delete cascade,
  routine_id         text not null,
  date               text not null,
  completed_step_ids jsonb not null default '[]'::jsonb,
  updated_at         timestamptz not null default now(),
  primary key (user_id, routine_id, date),
  foreign key (user_id, routine_id) references public.routines (user_id, id) on delete cascade
);
create index routine_runs_user_id_idx on public.routine_runs (user_id);
create index routine_runs_routine_id_idx on public.routine_runs (user_id, routine_id);

alter table public.routine_runs enable row level security;

create policy "routine_runs: owner rw" on public.routine_runs
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Actualizar save_app_data / clear_app_data para incluir routines/routine_runs.
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

  insert into goals (id, user_id, category_id, name, weight, active, period, kind, target_value, unit, days_of_week, tracking_kind, frequency, order_index, created_at)
  select
    g->>'id', uid, g->>'categoryId', g->>'name',
    coalesce((g->>'weight')::int, 1),
    coalesce((g->>'active')::boolean, true),
    coalesce(g->>'period', 'daily'),
    coalesce(g->>'kind', 'boolean'),
    coalesce((g->>'targetValue')::numeric, null),
    g->>'unit',
    g->'daysOfWeek',
    coalesce(g->>'trackingKind', 'goal'),
    g->'frequency',
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
    tracking_kind = excluded.tracking_kind,
    frequency = excluded.frequency,
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

  insert into life_goals (id, user_id, name, description, category_id, scope, priority, target_date, progress, status, sub_goals, linked_habit_ids, order_index, created_at)
  select
    lg->>'id', uid, lg->>'name', lg->>'description', lg->>'categoryId',
    coalesce(lg->>'scope', 'personal'),
    coalesce(lg->>'priority', 'medium'),
    lg->>'targetDate',
    coalesce((lg->>'progress')::int, 0),
    coalesce(lg->>'status', 'active'),
    coalesce(lg->'subGoals', '[]'::jsonb),
    coalesce(lg->'linkedHabitIds', '[]'::jsonb),
    coalesce((lg->>'order')::int, 0),
    coalesce((lg->>'createdAt')::timestamptz, now())
  from jsonb_array_elements(coalesce(payload->'lifeGoals', '[]'::jsonb)) lg
  on conflict (user_id, id) do update set
    name = excluded.name,
    description = excluded.description,
    category_id = excluded.category_id,
    scope = excluded.scope,
    priority = excluded.priority,
    target_date = excluded.target_date,
    progress = excluded.progress,
    status = excluded.status,
    sub_goals = excluded.sub_goals,
    linked_habit_ids = excluded.linked_habit_ids,
    order_index = excluded.order_index;

  delete from life_goals
  where user_id = uid
    and id not in (
      select lg->>'id' from jsonb_array_elements(coalesce(payload->'lifeGoals', '[]'::jsonb)) lg
    );

  insert into planner_items (id, user_id, date, title, type, category, priority, done, order_index, created_at)
  select
    pi->>'id', uid, pi->>'date', pi->>'title',
    coalesce(pi->>'type', 'task'),
    coalesce(pi->>'category', 'personal'),
    coalesce(pi->>'priority', 'medium'),
    coalesce((pi->>'done')::boolean, false),
    coalesce((pi->>'order')::int, 0),
    coalesce((pi->>'createdAt')::timestamptz, now())
  from jsonb_array_elements(coalesce(payload->'plannerItems', '[]'::jsonb)) pi
  on conflict (user_id, id) do update set
    date = excluded.date,
    title = excluded.title,
    type = excluded.type,
    category = excluded.category,
    priority = excluded.priority,
    done = excluded.done,
    order_index = excluded.order_index;

  delete from planner_items
  where user_id = uid
    and id not in (
      select pi->>'id' from jsonb_array_elements(coalesce(payload->'plannerItems', '[]'::jsonb)) pi
    );

  insert into routines (id, user_id, name, category, steps, active, order_index, created_at)
  select
    r->>'id', uid, r->>'name',
    coalesce(r->>'category', 'custom'),
    coalesce(r->'steps', '[]'::jsonb),
    coalesce((r->>'active')::boolean, true),
    coalesce((r->>'order')::int, 0),
    coalesce((r->>'createdAt')::timestamptz, now())
  from jsonb_array_elements(coalesce(payload->'routines', '[]'::jsonb)) r
  on conflict (user_id, id) do update set
    name = excluded.name,
    category = excluded.category,
    steps = excluded.steps,
    active = excluded.active,
    order_index = excluded.order_index;

  delete from routines
  where user_id = uid
    and id not in (
      select r->>'id' from jsonb_array_elements(coalesce(payload->'routines', '[]'::jsonb)) r
    );

  insert into routine_runs (user_id, routine_id, date, completed_step_ids, updated_at)
  select uid, rr.value->>'routineId', rr.value->>'date',
         coalesce(rr.value->'completedStepIds', '[]'::jsonb), now()
  from jsonb_each(coalesce(payload->'routineRuns', '{}'::jsonb)) rr
  on conflict (user_id, routine_id, date) do update set
    completed_step_ids = excluded.completed_step_ids,
    updated_at = now();

  delete from routine_runs
  where user_id = uid
    and (routine_id, date) not in (
      select rr.value->>'routineId', rr.value->>'date'
      from jsonb_each(coalesce(payload->'routineRuns', '{}'::jsonb)) rr
    );
end;
$$;

revoke all on function public.save_app_data(jsonb) from public;
grant execute on function public.save_app_data(jsonb) to authenticated;

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
