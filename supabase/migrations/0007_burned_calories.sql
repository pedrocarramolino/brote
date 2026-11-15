-- ---------------------------------------------------------------------------
-- Brote · objetivo y registro de calorías quemadas con actividad (preparado, NO aplicado).
-- ---------------------------------------------------------------------------

-- Objetivo (en el perfil): { mode: 'calculado' | 'manual', kcal?, deficit?, sex?, age?, heightCm?, weightKg?, updatedAt }
alter table public.profiles add column if not exists burn_goal jsonb;

-- Registros manuales: varios por día; independientes de lo que se come y de los pasos
create table if not exists public.burned_entries (
  id text primary key,
  user_id uuid not null references auth.users on delete cascade,
  date date not null,
  kcal integer not null check (kcal between 1 and 5000),
  note text,
  created_at timestamptz not null default now()
);
create index if not exists burned_entries_user_date on public.burned_entries (user_id, date);
alter table public.burned_entries enable row level security;
create policy "burned_entries propios" on public.burned_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
