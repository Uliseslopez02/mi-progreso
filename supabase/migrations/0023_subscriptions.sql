-- Sistema de suscripciones real: tabla de facturación (fuente de verdad),
-- contador mensual de uso de IA, trigger que mantiene `profiles.plan` en
-- sincronía (sin tocar ningún call site existente de getUserPlan()), y la
-- función que hace el gating de IA de forma atómica y segura.

create table public.subscriptions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  status text not null default 'free'
    check (status in ('free', 'trial', 'active', 'past_due', 'canceled', 'expired')),
  plan_tier text not null default 'free'
    check (plan_tier in ('free', 'premium_monthly', 'premium_yearly')),
  trial_start timestamptz,
  trial_end timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  payment_provider text,
  mp_customer_email text,
  mp_preapproval_id text,
  canceled_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

-- Sólo lectura de la propia fila. Las escrituras las hace el webhook con la
-- service-role key (bypassa RLS) — nunca el cliente autenticado.
create policy "subscriptions: owner read" on public.subscriptions
  for select using (user_id = auth.uid());

-- Contador mensual de uso de IA. Separado de `subscriptions` a propósito:
-- esto es uso, no identidad de facturación.
create table public.ai_usage (
  user_id uuid not null references public.profiles(id) on delete cascade,
  year_month text not null,
  count int not null default 0,
  primary key (user_id, year_month)
);

alter table public.ai_usage enable row level security;

create policy "ai_usage: owner read" on public.ai_usage
  for select using (user_id = auth.uid());

-- Mantiene `profiles.plan` (ya leído en toda la app vía getUserPlan()) en
-- sincronía con el estado real de facturación. Sólo 'active' cuenta como
-- premium: past_due/canceled/expired bajan solos a free en cuanto el
-- webhook actualiza el status, sin código adicional en el frontend.
create or replace function public.sync_profile_plan()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set plan = case when new.status = 'active' then 'premium' else 'free' end
  where id = new.user_id;
  return new;
end;
$$;

create trigger subscriptions_sync_plan
after insert or update of status on public.subscriptions
for each row execute function public.sync_profile_plan();

-- Gating de IA: única forma de escribir en ai_usage. security definer +
-- auth.uid() interno (nunca confía en un user_id mandado por el cliente).
-- Premium: siempre permitido, sin contar uso. Free: hasta 3 usos por mes
-- calendario (year_month 'YYYY-MM'), reseteo automático al cambiar de mes
-- porque cada mes es una fila nueva.
create or replace function public.increment_ai_usage()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_month text := to_char(now(), 'YYYY-MM');
  v_plan text;
  v_count int;
begin
  if v_user is null then
    raise exception 'No autenticado';
  end if;

  select plan into v_plan from public.profiles where id = v_user;
  if v_plan = 'premium' then
    return jsonb_build_object('allowed', true, 'remaining', null);
  end if;

  insert into public.ai_usage (user_id, year_month, count)
  values (v_user, v_month, 0)
  on conflict (user_id, year_month) do nothing;

  select count into v_count from public.ai_usage
  where user_id = v_user and year_month = v_month;

  if v_count >= 3 then
    return jsonb_build_object('allowed', false, 'remaining', 0);
  end if;

  update public.ai_usage set count = count + 1
  where user_id = v_user and year_month = v_month;

  return jsonb_build_object('allowed', true, 'remaining', 3 - (v_count + 1));
end;
$$;

-- Verificación manual tras aplicar (SQL Editor):
--   select * from public.subscriptions where user_id = auth.uid();
--   select public.increment_ai_usage();  -- repetir 4 veces: allowed debe pasar a false en la 4ta
--   select * from public.ai_usage where user_id = auth.uid();
