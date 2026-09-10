-- Enforcement server-side de los límites del plan Free (freemium).
-- Ver `CONTEXTO_FREEMIUM.md` y `src/domain/plan.ts` (fuente de los números en el
-- frontend — mantener sincronizados con este archivo).
--
-- Regla de grandfathering, idéntica a la del frontend:
--   se rechaza el guardado SÓLO si el plan es 'free'
--   Y la cantidad entrante de la entidad supera el límite
--   Y además supera la cantidad que ya había en la base.
-- Es decir: editar / reordenar / borrar, o simplemente estar por encima del
-- límite (cuenta vieja, downgrade desde Premium), nunca falla. Sólo se bloquea
-- un aumento real por encima del tope. El frontend ya frena antes: este control
-- es la red contra requests falsificados / devtools.
--
-- Entidades controladas (contables y con incentivo de bypass): objetivos
-- diarios / semanales / mensuales, hábitos, metas activas, proyectos activos,
-- rutinas. Notas y categorías quedan sólo con gate de frontend (abuso irrelevante).

-- Helper: lanza si `incoming` rompe el límite respecto de `current_count`.
create or replace function public.plan_limit_guard(
  label text, incoming int, current_count int, lim int
)
returns void
language plpgsql
immutable
as $$
begin
  if incoming > lim and incoming > current_count then
    raise exception 'plan_limit_exceeded:%', label using errcode = 'check_violation';
  end if;
end;
$$;

-- Aplica todos los límites del plan Free sobre el payload entrante.
create or replace function public.enforce_free_plan_limits(uid uuid, payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text;
begin
  select plan into v_plan from public.profiles where id = uid;
  if v_plan is distinct from 'free' then
    return; -- Premium (o sin fila de perfil todavía): sin límites.
  end if;

  -- Objetivos que puntúan el día (no hábitos), por período.
  perform public.plan_limit_guard('dailyGoals',
    (select count(*)::int from jsonb_array_elements(coalesce(payload->'goals', '[]'::jsonb)) g
       where coalesce(g->>'trackingKind', 'goal') <> 'habit'
         and coalesce(g->>'period', 'daily') = 'daily'),
    (select count(*)::int from public.goals
       where user_id = uid and coalesce(tracking_kind, 'goal') <> 'habit' and period = 'daily'),
    5);

  perform public.plan_limit_guard('weeklyGoals',
    (select count(*)::int from jsonb_array_elements(coalesce(payload->'goals', '[]'::jsonb)) g
       where coalesce(g->>'trackingKind', 'goal') <> 'habit'
         and coalesce(g->>'period', 'daily') = 'weekly'),
    (select count(*)::int from public.goals
       where user_id = uid and coalesce(tracking_kind, 'goal') <> 'habit' and period = 'weekly'),
    2);

  perform public.plan_limit_guard('monthlyGoals',
    (select count(*)::int from jsonb_array_elements(coalesce(payload->'goals', '[]'::jsonb)) g
       where coalesce(g->>'trackingKind', 'goal') <> 'habit'
         and coalesce(g->>'period', 'daily') = 'monthly'),
    (select count(*)::int from public.goals
       where user_id = uid and coalesce(tracking_kind, 'goal') <> 'habit' and period = 'monthly'),
    2);

  -- Hábitos.
  perform public.plan_limit_guard('habits',
    (select count(*)::int from jsonb_array_elements(coalesce(payload->'goals', '[]'::jsonb)) g
       where coalesce(g->>'trackingKind', 'goal') = 'habit'),
    (select count(*)::int from public.goals
       where user_id = uid and coalesce(tracking_kind, 'goal') = 'habit'),
    5);

  -- Metas de vida activas (completadas / abandonadas no cuentan).
  perform public.plan_limit_guard('activeLifeGoals',
    (select count(*)::int from jsonb_array_elements(coalesce(payload->'lifeGoals', '[]'::jsonb)) lg
       where coalesce(lg->>'status', 'active') = 'active'),
    (select count(*)::int from public.life_goals where user_id = uid and status = 'active'),
    3);

  -- Proyectos activos (archivados / completados no cuentan).
  perform public.plan_limit_guard('activeProjects',
    (select count(*)::int from jsonb_array_elements(coalesce(payload->'projects', '[]'::jsonb)) p
       where coalesce(p->>'status', 'active') = 'active'),
    (select count(*)::int from public.projects where user_id = uid and status = 'active'),
    2);

  -- Rutinas.
  perform public.plan_limit_guard('routines',
    (select count(*)::int from jsonb_array_elements(coalesce(payload->'routines', '[]'::jsonb))),
    (select count(*)::int from public.routines where user_id = uid),
    2);
end;
$$;

revoke all on function public.enforce_free_plan_limits(uuid, jsonb) from public;

-- Redefinición de save_app_data: cuerpo idéntico al de 0017_notes.sql + una
-- línea `perform public.enforce_free_plan_limits(uid, payload)` justo después
-- del chequeo de autenticación. Nada más cambia (orden de upserts/deletes igual).
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

  perform public.enforce_free_plan_limits(uid, payload);

  insert into user_settings (user_id, app_name, streak_threshold, allow_editing_past_days, birth_date, life_expectancy_years, updated_at)
  values (
    uid,
    coalesce(payload->'settings'->>'appName', 'Mi Progreso'),
    coalesce((payload->'settings'->>'streakThreshold')::int, 70),
    coalesce((payload->'settings'->>'allowEditingPastDays')::boolean, false),
    (payload->'settings'->>'birthDate')::date,
    (payload->'settings'->>'lifeExpectancyYears')::int,
    now()
  )
  on conflict (user_id) do update set
    app_name = excluded.app_name,
    streak_threshold = excluded.streak_threshold,
    allow_editing_past_days = excluded.allow_editing_past_days,
    birth_date = excluded.birth_date,
    life_expectancy_years = excluded.life_expectancy_years,
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

  insert into life_goals (id, user_id, name, description, category_id, scope, priority, target_date, progress, status, sub_goals, linked_habit_ids, order_index, created_at, kind, current_value, target_value, unit, milestones)
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
    coalesce((lg->>'createdAt')::timestamptz, now()),
    lg->>'kind',
    (lg->>'currentValue')::numeric,
    (lg->>'targetValue')::numeric,
    lg->>'unit',
    coalesce(lg->'milestones', '[]'::jsonb)
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
    order_index = excluded.order_index,
    kind = excluded.kind,
    current_value = excluded.current_value,
    target_value = excluded.target_value,
    unit = excluded.unit,
    milestones = excluded.milestones;

  delete from life_goals
  where user_id = uid
    and id not in (
      select lg->>'id' from jsonb_array_elements(coalesce(payload->'lifeGoals', '[]'::jsonb)) lg
    );

  insert into planner_items (id, user_id, date, title, type, category, priority, done, order_index, created_at, start_time, duration_minutes, linked_habit_id, habit_completion_mode)
  select
    pi->>'id', uid, pi->>'date', pi->>'title',
    coalesce(pi->>'type', 'task'),
    coalesce(pi->>'category', 'personal'),
    coalesce(pi->>'priority', 'medium'),
    coalesce((pi->>'done')::boolean, false),
    coalesce((pi->>'order')::int, 0),
    coalesce((pi->>'createdAt')::timestamptz, now()),
    pi->>'startTime',
    (pi->>'durationMinutes')::int,
    pi->>'linkedHabitId',
    pi->>'habitCompletionMode'
  from jsonb_array_elements(coalesce(payload->'plannerItems', '[]'::jsonb)) pi
  on conflict (user_id, id) do update set
    date = excluded.date,
    title = excluded.title,
    type = excluded.type,
    category = excluded.category,
    priority = excluded.priority,
    done = excluded.done,
    order_index = excluded.order_index,
    start_time = excluded.start_time,
    duration_minutes = excluded.duration_minutes,
    linked_habit_id = excluded.linked_habit_id,
    habit_completion_mode = excluded.habit_completion_mode;

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

  insert into life_wheel_snapshots (id, user_id, date, areas, notes, created_at)
  select
    lw->>'id', uid, lw->>'date',
    coalesce(lw->'areas', '[]'::jsonb),
    lw->>'notes',
    coalesce((lw->>'createdAt')::timestamptz, now())
  from jsonb_array_elements(coalesce(payload->'lifeWheelSnapshots', '[]'::jsonb)) lw
  on conflict (user_id, id) do update set
    date = excluded.date,
    areas = excluded.areas,
    notes = excluded.notes;

  delete from life_wheel_snapshots
  where user_id = uid
    and id not in (
      select lw->>'id' from jsonb_array_elements(coalesce(payload->'lifeWheelSnapshots', '[]'::jsonb)) lw
    );

  insert into reflections (id, user_id, date, prompt, answer, created_at)
  select
    r->>'id', uid, r->>'date', r->>'prompt', r->>'answer',
    coalesce((r->>'createdAt')::timestamptz, now())
  from jsonb_array_elements(coalesce(payload->'reflections', '[]'::jsonb)) r
  on conflict (user_id, id) do update set
    date = excluded.date,
    prompt = excluded.prompt,
    answer = excluded.answer;

  delete from reflections
  where user_id = uid
    and id not in (
      select r->>'id' from jsonb_array_elements(coalesce(payload->'reflections', '[]'::jsonb)) r
    );

  insert into projects (id, user_id, name, description, status, order_index, created_at)
  select
    p->>'id', uid, p->>'name', p->>'description',
    coalesce(p->>'status', 'active'),
    coalesce((p->>'order')::int, 0),
    coalesce((p->>'createdAt')::timestamptz, now())
  from jsonb_array_elements(coalesce(payload->'projects', '[]'::jsonb)) p
  on conflict (user_id, id) do update set
    name = excluded.name,
    description = excluded.description,
    status = excluded.status,
    order_index = excluded.order_index;

  delete from projects
  where user_id = uid
    and id not in (
      select p->>'id' from jsonb_array_elements(coalesce(payload->'projects', '[]'::jsonb)) p
    );

  insert into project_tasks (id, user_id, project_id, title, status, order_index, created_at)
  select
    pt->>'id', uid, pt->>'projectId', pt->>'title',
    coalesce(pt->>'status', 'todo'),
    coalesce((pt->>'order')::int, 0),
    coalesce((pt->>'createdAt')::timestamptz, now())
  from jsonb_array_elements(coalesce(payload->'projectTasks', '[]'::jsonb)) pt
  on conflict (user_id, id) do update set
    project_id = excluded.project_id,
    title = excluded.title,
    status = excluded.status,
    order_index = excluded.order_index;

  delete from project_tasks
  where user_id = uid
    and id not in (
      select pt->>'id' from jsonb_array_elements(coalesce(payload->'projectTasks', '[]'::jsonb)) pt
    );

  insert into notes (id, user_id, date, title, body, created_at)
  select
    n->>'id', uid, (n->>'date')::date, n->>'title', n->>'body',
    coalesce((n->>'createdAt')::timestamptz, now())
  from jsonb_array_elements(coalesce(payload->'notes', '[]'::jsonb)) n
  on conflict (user_id, id) do update set
    date = excluded.date,
    title = excluded.title,
    body = excluded.body;

  delete from notes
  where user_id = uid
    and id not in (
      select n->>'id' from jsonb_array_elements(coalesce(payload->'notes', '[]'::jsonb)) n
    );
end;
$$;

revoke all on function public.save_app_data(jsonb) from public;
grant execute on function public.save_app_data(jsonb) to authenticated;

-- Verificación manual tras aplicar (SQL Editor, con una cuenta 'free'):
--   -- guardar 6 objetivos diarios de cero debe fallar con 'plan_limit_exceeded:dailyGoals'
--   -- guardar el MISMO set que ya está en la base (aunque sean 11) debe pasar
--   -- borrar hasta 4 y volver a 5 debe pasar
--   update public.profiles set plan = 'premium' where id = auth.uid();  -- luego: sin límites
