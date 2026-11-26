-- Versiones de los apuntes compartidos. Cada guardado inserta una fila nueva (historial completo).
-- RLS activado y SIN políticas: nadie puede leer ni escribir con la clave pública.
-- Solo la Edge Function `apuntes` (con la service role) accede a la tabla.
create table if not exists public.apuntes_versiones (
  id bigint generated always as identity primary key,
  version integer not null,
  data jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists apuntes_versiones_version_idx on public.apuntes_versiones (version desc, id desc);

alter table public.apuntes_versiones enable row level security;

revoke all on public.apuntes_versiones from anon, authenticated;
