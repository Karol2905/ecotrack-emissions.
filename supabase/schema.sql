-- =====================================================================
-- EcoTrack · Tabla de emisiones
-- Ejecutar en Supabase > SQL Editor
-- =====================================================================

create extension if not exists "pgcrypto";

create table if not exists public.emissions (
  id           uuid primary key default gen_random_uuid(),
  source_name  text        not null check (char_length(source_name) between 3 and 120),
  category     text        not null check (category in ('transporte', 'energia', 'residuos')),
  co2_kg       numeric(12,2) not null check (co2_kg > 0),
  created_at   timestamptz not null default now()
);

create index if not exists emissions_created_at_idx on public.emissions (created_at desc);

-- Row Level Security (políticas abiertas para la demo; en producción
-- restringir por organización / usuario autenticado).
alter table public.emissions enable row level security;

drop policy if exists "emissions_select" on public.emissions;
drop policy if exists "emissions_insert" on public.emissions;
drop policy if exists "emissions_delete" on public.emissions;

create policy "emissions_select" on public.emissions for select using (true);
create policy "emissions_insert" on public.emissions for insert with check (true);
create policy "emissions_delete" on public.emissions for delete using (true);

-- Habilitar Realtime para la tabla
alter publication supabase_realtime add table public.emissions;
