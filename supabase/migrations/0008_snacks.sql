-- ---------------------------------------------------------------------------
-- Brote · picoteo (registros fuera de las comidas) y calorías a mano (preparado, NO aplicado).
-- ---------------------------------------------------------------------------

-- Picoteo: suma al día como cualquier registro, pero no pertenece a desayuno, comida…
-- (slot guarda la comida más cercana por hora, para no romper el modelo).
alter table public.food_logs
  add column if not exists snack boolean not null default false,
  -- «solo calorías»: sin alimento; los valores introducidos van en snapshot (× amount = 1)
  add column if not exists quick boolean not null default false,
  add column if not exists snapshot jsonb;

-- food_id vacío para platos y calorías a mano
alter table public.food_logs alter column food_id drop not null;
