-- Arquitectura comercial: plan por usuario, todavía sin cobros ni límites reales.
-- `profiles` ya tiene RLS "owner rw" desde 0002_rls.sql (using/with check id = auth.uid()),
-- así que esta columna nueva queda automáticamente cubierta por esa misma policy —
-- no hace falta tocar RLS.

alter table public.profiles
  add column if not exists plan text not null default 'free' check (plan in ('free', 'premium'));
