-- ---------------------------------------------------------------------------
-- Brote · «Mis platos» (preparado, NO aplicado).
-- Los platos del usuario reutilizan public.custom_recipes (0001): mismo modelo que
-- las recetas de la biblioteca, separados por tabla y con propietario (user_id).
-- Equivalencias con el modelo local:
--   custom_recipes                ← AppData.customRecipes (Recipe con custom = true)
--   custom_recipes.dish_items     ← Recipe.dish.items (cantidad + unidad del plato completo)
--   custom_recipes.ingredients    ← Recipe.ingredients (g/ml POR RACIÓN, derivado)
--   food_logs.snapshot            ← FoodLogEntry.snapshot (valores en el momento del consumo)
--   planned_meals.snapshot        ← PlannedMeal.snapshot (usos congelados al editar/borrar)
-- ---------------------------------------------------------------------------

alter table public.custom_recipes
  add column if not exists title text,
  add column if not exists description text,
  add column if not exists category text check (category in ('desayuno','comida','cena','merienda','snack','postre')),
  add column if not exists dish_items jsonb,          -- [{foodId, quantity, unit}] plato completo
  add column if not exists updated_at timestamptz not null default now();

-- Registro diario: un plato se registra por raciones con una copia de sus valores
alter table public.food_logs
  add column if not exists recipe_id text,            -- plato de Mis platos (sin FK: el plato puede borrarse)
  add column if not exists snapshot jsonb;            -- {name, perServing:{kcal,protein,carbs,fat}, fiber, complete, at}

alter table public.planned_meals
  add column if not exists snapshot jsonb;

-- Un consumo no depende del plato: borrar el plato no borra el historial
comment on column public.food_logs.snapshot is 'Valores por ración en el momento del registro; amount = raciones consumidas';
