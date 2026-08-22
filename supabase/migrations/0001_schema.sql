-- Fase 2 — esquema base multiusuario.
-- Ver src/domain/types.ts para el tipo AppData del que derivan estas tablas.

create extension if not exists pgcrypto;

-- Ancla por usuario. Se crea sola vía trigger al registrarse (ver abajo).
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Equivalente a AppData.settings. Una fila por usuario.
create table public.user_settings (
  user_id                 uuid primary key references auth.users(id) on delete cascade,
  app_name                text not null default 'Mi Progreso',
  streak_threshold        int not null default 70 check (streak_threshold between 1 and 100),
  allow_editing_past_days boolean not null default false,
  updated_at              timestamptz not null default now()
);

create table public.categories (
  id          text not null,
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  order_index int not null default 0,
  primary key (user_id, id)
);

create table public.goals (
  id          text not null,
  user_id     uuid not null references auth.users(id) on delete cascade,
  category_id text not null,
  name        text not null,
  weight      int not null default 1 check (weight >= 1),
  active      boolean not null default true,
  period      text not null default 'daily' check (period in ('daily', 'weekly', 'monthly')),
  order_index int not null default 0,
  created_at  timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, category_id) references public.categories (user_id, id) on delete cascade
);
create index goals_user_id_idx on public.goals (user_id);

-- `date` se guarda como texto YYYY-MM-DD (DateKey), nunca como `date`/`timestamp`:
-- "hoy" es el día calendario local del usuario (ver src/domain/date.ts), no UTC,
-- y coercionarlo a un tipo fecha de Postgres arriesga correrlo un día.
create table public.day_records (
  user_id            uuid not null references auth.users(id) on delete cascade,
  date               text not null,
  goals              jsonb not null default '[]'::jsonb,
  completed_goal_ids jsonb not null default '[]'::jsonb,
  closed             boolean not null default false,
  updated_at         timestamptz not null default now(),
  primary key (user_id, date)
);

create table public.period_records (
  user_id            uuid not null references auth.users(id) on delete cascade,
  key                text not null,
  period             text not null check (period in ('weekly', 'monthly')),
  period_start       text not null,
  goals              jsonb not null default '[]'::jsonb,
  completed_goal_ids jsonb not null default '[]'::jsonb,
  closed             boolean not null default false,
  updated_at         timestamptz not null default now(),
  primary key (user_id, key)
);

-- Crea profile + user_settings por defecto apenas alguien se registra.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.user_settings (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
