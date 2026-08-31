-- Perfil de usuario más completo: nombre real consultable por SQL (hoy sólo
-- vive en auth.users.raw_user_meta_data, no en una tabla propia), última
-- actividad, y flag explícito de onboarding completado — preparación para
-- futuras vistas/IA que necesiten esto sin volver a tocar el esquema.
-- profiles ya tiene RLS "owner rw" desde 0002_rls.sql (using/with check
-- id = auth.uid()), así que estas columnas quedan cubiertas solas.

alter table public.profiles
  add column if not exists full_name text,
  add column if not exists last_active_at timestamptz not null default now(),
  add column if not exists onboarding_completed boolean not null default false;

-- El trigger de alta ya inserta la fila de profiles; se actualiza para copiar
-- el nombre que signUp() ya manda en user_metadata.full_name, sin depender de
-- un segundo update desde el cliente.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name) values (new.id, new.raw_user_meta_data ->> 'full_name');
  insert into public.user_settings (user_id) values (new.id);
  return new;
end;
$$;

-- Backfill para cuentas que ya existían antes de esta migración: copia el
-- nombre real desde auth.users sólo donde todavía esté vacío, sin pisar nada.
update public.profiles p
set full_name = u.raw_user_meta_data ->> 'full_name'
from auth.users u
where p.id = u.id and p.full_name is null;
