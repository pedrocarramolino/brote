-- ---------------------------------------------------------------------------
-- Brote · biblioteca gastronómica (preparado, NO aplicado).
-- Arquitectura: biblioteca → recetas → planificación semanal → registro diario.
-- El catálogo (recipe_categories, ingredients, recipes, recipe_ingredients) es
-- público de solo lectura y se carga desde src/data (scripts de seed); lo del
-- usuario (favoritos, historial, sustituciones) lleva user_id y RLS.
-- Equivalencias con el modelo local:
--   recipes / recipe_ingredients  ← src/data/recipeLibrary (Recipe)
--   ingredients                   ← src/data/foods.ts (Food)
--   recipe_favorites              ← AppData.favorites.recipes (tabla favorites de 0001)
--   recipe_history                ← derivado de planned_meals (services/library.ts)
--   weekly_meals                  ← planned_meals (0001) + columna accepted
--   meal_replacements             ← AppData.replacements
-- ---------------------------------------------------------------------------

create table public.recipe_categories (
  id text primary key,            -- desayuno, mediamanana, comida, merienda, cena, snack, postre
  label text not null,
  sort smallint not null
);

create table public.ingredients (
  id text primary key,            -- p. ej. 'pollo', 'arroz_basmati'
  name text not null,
  unit text not null check (unit in ('g','ml')),
  kcal numeric not null, protein numeric not null, carbs numeric not null, fat numeric not null, -- por 100 g/ml
  fiber numeric,                  -- por 100 g/ml, estimada
  shop_category text not null,
  allergens text[] not null default '{}',
  tags text[] not null default '{}',
  source text not null default 'referencia' check (source in ('referencia','usuario','openfoodfacts','estimacion'))
);

create table public.recipes (
  id text primary key,            -- identificador estable usado por menús y favoritos
  title text not null,            -- nombre comercial («Pollo Power Bowl»)
  name text not null,             -- nombre descriptivo
  category text not null references public.recipe_categories,
  slots text[] not null,
  cuisine text not null,
  main_ingredient text not null,
  difficulty text not null check (difficulty in ('facil','media','elaborada')),
  servings smallint not null check (servings > 0),
  minutes smallint not null check (minutes > 0),
  steps text[] not null,
  tags text[] not null default '{}',
  image_url text,
  version smallint not null default 1,
  unique (title)
);

create table public.recipe_ingredients (
  recipe_id text not null references public.recipes on delete cascade,
  ingredient_id text not null references public.ingredients,
  amount numeric not null check (amount > 0), -- por ración
  note text,
  primary key (recipe_id, ingredient_id)
);

-- Platos aceptados: no se cambian al pedir otra propuesta
alter table public.planned_meals add column if not exists accepted boolean not null default false;
create or replace view public.weekly_meals as
  select *, date_trunc('week', date)::date as week_start from public.planned_meals;

create table public.meal_replacements (
  id text primary key,
  user_id uuid not null references auth.users on delete cascade,
  date date not null,
  slot text not null,
  from_recipe_id text,
  to_recipe_id text,
  source text not null check (source in ('manual','sorpresa','dia','regenerar')),
  at timestamptz not null default now()
);
create index on public.meal_replacements (user_id, date);

create or replace view public.recipe_favorites as
  select user_id, item_id as recipe_id from public.favorites where kind = 'recipe';

create or replace view public.recipe_history as
  select user_id, recipe_id, max(date) as last_used, count(*) as times
  from public.planned_meals
  where recipe_id is not null and status <> 'omitida' and date <= current_date
  group by user_id, recipe_id;

-- Catálogo: lectura pública, escritura solo con service role
do $$
declare t text;
begin
  foreach t in array array['recipe_categories','ingredients','recipes','recipe_ingredients'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "catalog_read" on public.%I for select using (true)', t);
  end loop;
end $$;

alter table public.meal_replacements enable row level security;
create policy "own_rows_select" on public.meal_replacements for select using (auth.uid() = user_id);
create policy "own_rows_insert" on public.meal_replacements for insert with check (auth.uid() = user_id);
create policy "own_rows_delete" on public.meal_replacements for delete using (auth.uid() = user_id);

-- Las vistas heredan los permisos de las tablas base
alter view public.weekly_meals set (security_invoker = true);
alter view public.recipe_favorites set (security_invoker = true);
alter view public.recipe_history set (security_invoker = true);
