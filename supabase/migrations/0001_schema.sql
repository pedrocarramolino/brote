-- ---------------------------------------------------------------------------
-- Brote · esquema para migrar de almacenamiento local a Supabase.
-- Preparado pero NO aplicado: la versión actual guarda los datos en el navegador.
-- Cada tabla lleva user_id y Row Level Security: cada persona solo puede leer y
-- escribir sus propias filas.
-- ---------------------------------------------------------------------------

create extension if not exists "pgcrypto";

-- Perfil y preferencias (1 fila por usuario)
create table public.profiles (
  user_id uuid primary key references auth.users on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  goal text,
  diet_type text,
  meal_slots text[] not null default array['desayuno','mediamanana','comida','merienda','cena'],
  schedule jsonb not null default '{}',
  likes text[] not null default '{}',
  dislikes text[] not null default '{}',
  allergies text[] not null default '{}',
  cooking_time smallint,
  budget text,
  activity_level text,
  training text,
  region text not null default 'ES',
  steps_target integer not null default 8000,
  water_target smallint not null default 8,
  targets jsonb not null default '{}',
  share_context_with_ai boolean not null default false,
  use_open_food_facts boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Alimentos propios (introducidos por el usuario, de Open Food Facts o estimaciones)
create table public.custom_foods (
  id text primary key,
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  unit text not null check (unit in ('g','ml')),
  kcal numeric not null check (kcal >= 0),
  protein numeric not null check (protein >= 0),
  carbs numeric not null check (carbs >= 0),
  fat numeric not null check (fat >= 0),
  category text not null,
  source text not null check (source in ('usuario','openfoodfacts','estimacion')),
  brand text,
  created_at timestamptz not null default now()
);

-- Recetas propias
create table public.custom_recipes (
  id text primary key,
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  slots text[] not null,
  servings smallint not null default 1,
  minutes smallint not null,
  ingredients jsonb not null, -- [{foodId, amount}]
  steps text[] not null default '{}',
  tags text[] not null default '{}',
  image_url text,
  created_at timestamptz not null default now()
);

-- Menú: días y comidas planificadas
create table public.planned_meals (
  id text primary key,
  user_id uuid not null references auth.users on delete cascade,
  date date not null,
  slot text not null,
  recipe_id text,          -- receta del catálogo o propia; null = plato libre sin datos
  custom_name text,
  portion numeric not null default 1 check (portion > 0),
  status text not null default 'pendiente' check (status in ('pendiente','hecha','omitida')),
  note text,
  unique (user_id, date, slot)
);
create index on public.planned_meals (user_id, date);

-- Registros de alimentos
create table public.food_logs (
  id text primary key,
  user_id uuid not null references auth.users on delete cascade,
  date date not null,
  slot text not null,
  food_id text not null,
  amount numeric not null check (amount > 0),
  method text not null,
  created_at timestamptz not null default now()
);
create index on public.food_logs (user_id, date);

-- Hábitos
create table public.habits (
  id text primary key,
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  kind text not null,
  icon text not null,
  active boolean not null default true
);
create table public.habit_logs (
  user_id uuid not null references auth.users on delete cascade,
  habit_id text not null references public.habits on delete cascade,
  date date not null,
  value numeric not null,
  primary key (user_id, habit_id, date)
);

-- Peso y medidas (datos personales sensibles)
create table public.weights (
  id text primary key,
  user_id uuid not null references auth.users on delete cascade,
  date date not null,
  kg numeric not null check (kg between 25 and 350),
  unique (user_id, date)
);
create table public.measurements (
  id text primary key,
  user_id uuid not null references auth.users on delete cascade,
  date date not null,
  waist numeric, hip numeric, chest numeric, arm numeric, thigh numeric
);

-- Actividad física
create table public.activity_plan (
  user_id uuid not null references auth.users on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  type text not null,
  routine_id text,
  title text not null,
  minutes smallint not null default 0,
  primary key (user_id, weekday)
);
create table public.activity_sessions (
  id text primary key,
  user_id uuid not null references auth.users on delete cascade,
  date date not null,
  type text not null,
  title text not null,
  minutes smallint not null check (minutes > 0),
  notes text
);
create table public.steps (
  user_id uuid not null references auth.users on delete cascade,
  date date not null,
  steps integer not null check (steps between 0 and 100000),
  primary key (user_id, date)
);

-- Lista de la compra: solo se guardan los cambios manuales; la base se calcula desde el menú
create table public.shopping_overrides (
  user_id uuid not null references auth.users on delete cascade,
  week_start date not null,
  checked jsonb not null default '{}',
  qty jsonb not null default '{}',
  removed jsonb not null default '{}',
  manual jsonb not null default '[]',
  primary key (user_id, week_start)
);

-- Favoritos
create table public.favorites (
  user_id uuid not null references auth.users on delete cascade,
  kind text not null check (kind in ('recipe','food')),
  item_id text not null,
  primary key (user_id, kind, item_id)
);

-- Conversaciones con el asistente
create table public.chat_messages (
  id text primary key,
  user_id uuid not null references auth.users on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  mode text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security: acceso exclusivo a las filas propias
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','custom_foods','custom_recipes','planned_meals','food_logs','habits','habit_logs',
    'weights','measurements','activity_plan','activity_sessions','steps','shopping_overrides',
    'favorites','chat_messages'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "own_rows_select" on public.%I for select using (auth.uid() = user_id)', t);
    execute format('create policy "own_rows_insert" on public.%I for insert with check (auth.uid() = user_id)', t);
    execute format('create policy "own_rows_update" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
    execute format('create policy "own_rows_delete" on public.%I for delete using (auth.uid() = user_id)', t);
  end loop;
end $$;
