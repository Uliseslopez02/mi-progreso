-- 0025_free_trial.sql
-- Trial reverso: toda cuenta nueva arranca con Premium completo 14 días (sin
-- tarjeta) en vez de arrancar limitada — ver razonamiento en `src/domain/plan.ts`
-- (sección "Trial reverso") y CONTEXTO_FREEMIUM.md sección 13.2.
--
-- No se aplica retroactivamente: sólo altas nuevas desde que se aplica esta
-- migración. Las cuentas existentes (sin fila en `subscriptions`) siguen 'free'
-- exactamente igual que antes — `get_effective_plan` resuelve a 'free' cuando
-- no hay fila.

-- Plan efectivo, calculado en el momento (no depende de un cron que baje el
-- plan al vencer el trial): 'premium' si status='active', o si status='trial'
-- y trial_end todavía no pasó. Cualquier otro caso (incluida cuenta sin fila
-- en subscriptions) es 'free'. Reemplaza la lectura directa de profiles.plan
-- tanto en el backend (enforce_free_plan_limits) como en el frontend
-- (ver supabaseRepository.getUserPlan/getSubscriptionSummary, sección 3.3).
create or replace function public.get_effective_plan(uid uuid default auth.uid())
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select case
       when s.status = 'active' then 'premium'
       when s.status = 'trial' and s.trial_end > now() then 'premium'
       else 'free'
     end
     from public.subscriptions s
     where s.user_id = uid),
    'free'
  );
$$;

revoke all on function public.get_effective_plan(uuid) from public;
grant execute on function public.get_effective_plan(uuid) to authenticated;

-- Alta nueva: además del profile + user_settings de siempre, crea la fila de
-- subscriptions en estado 'trial' con 14 días desde el alta. Cuerpo idéntico
-- al de 0022_profile_fields.sql + el insert de subscriptions.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name) values (new.id, new.raw_user_meta_data ->> 'full_name');
  insert into public.user_settings (user_id) values (new.id);
  insert into public.subscriptions (user_id, status, plan_tier, trial_start, trial_end)
  values (new.id, 'trial', 'free', now(), now() + interval '14 days')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

-- enforce_free_plan_limits pasa a resolver el plan con get_effective_plan (así
-- el trial cuenta como premium sin tocar profiles.plan ni depender de un cron
-- que lo baje al vencer) y refleja los números nuevos de la tercera pasada
-- (habits 3→2, activeLifeGoals 2→1 — ver src/domain/plan.ts, sección 2 de este doc).
create or replace function public.enforce_free_plan_limits(uid uuid, payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text;
begin
  v_plan := public.get_effective_plan(uid);
  if v_plan is distinct from 'free' then
    return; -- Premium o trial vigente: sin límites.
  end if;

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
    1);

  perform public.plan_limit_guard('monthlyGoals',
    (select count(*)::int from jsonb_array_elements(coalesce(payload->'goals', '[]'::jsonb)) g
       where coalesce(g->>'trackingKind', 'goal') <> 'habit'
         and coalesce(g->>'period', 'daily') = 'monthly'),
    (select count(*)::int from public.goals
       where user_id = uid and coalesce(tracking_kind, 'goal') <> 'habit' and period = 'monthly'),
    1);

  perform public.plan_limit_guard('habits',
    (select count(*)::int from jsonb_array_elements(coalesce(payload->'goals', '[]'::jsonb)) g
       where coalesce(g->>'trackingKind', 'goal') = 'habit'),
    (select count(*)::int from public.goals
       where user_id = uid and coalesce(tracking_kind, 'goal') = 'habit'),
    2);

  perform public.plan_limit_guard('activeLifeGoals',
    (select count(*)::int from jsonb_array_elements(coalesce(payload->'lifeGoals', '[]'::jsonb)) lg
       where coalesce(lg->>'status', 'active') = 'active'),
    (select count(*)::int from public.life_goals where user_id = uid and status = 'active'),
    1);

  perform public.plan_limit_guard('activeProjects',
    (select count(*)::int from jsonb_array_elements(coalesce(payload->'projects', '[]'::jsonb)) p
       where coalesce(p->>'status', 'active') = 'active'),
    (select count(*)::int from public.projects where user_id = uid and status = 'active'),
    1);

  perform public.plan_limit_guard('routines',
    (select count(*)::int from jsonb_array_elements(coalesce(payload->'routines', '[]'::jsonb))),
    (select count(*)::int from public.routines where user_id = uid),
    1);
end;
$$;

revoke all on function public.enforce_free_plan_limits(uuid, jsonb) from public;

-- Verificación manual tras aplicar (SQL Editor):
--   select get_effective_plan('<uid de un usuario existente sin fila subscriptions>'); -- 'free'
--   -- crear un usuario de prueba nuevo (signup real) y confirmar:
--   select * from public.subscriptions where user_id = '<ese nuevo uid>';
--     -- status='trial', trial_end ≈ now()+14d
--   select public.get_effective_plan('<ese nuevo uid>'); -- 'premium' (trial vigente)
