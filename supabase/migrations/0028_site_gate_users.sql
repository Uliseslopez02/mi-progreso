-- 0028_site_gate_users.sql
-- Usuarios autorizados a pasar el "gate" de acceso a todo el sitio
-- (middleware.ts, en la raíz del repo) — protección previa a cualquier
-- landing/app pública, independiente del login real de Supabase Auth que
-- usan las cuentas de la app. Sólo se lee/escribe con la service role key
-- desde el middleware (Edge), nunca desde el cliente, así que RLS queda
-- habilitado sin ninguna policy (deny-all por defecto).
create table if not exists public.site_gate_users (
  username text primary key,
  password_hash text not null,
  created_at timestamptz not null default now()
);

alter table public.site_gate_users enable row level security;
