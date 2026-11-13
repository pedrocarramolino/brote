-- ---------------------------------------------------------------------------
-- Brote · base de datos de alimentos ampliada (preparado, NO aplicado).
-- Fuentes: BEDCA (AESAN, uso no comercial citando la fuente), USDA FoodData Central
-- (dominio público) y Open Food Facts (productos de marca, ODbL).
-- ---------------------------------------------------------------------------

alter table public.ingredients
  add column if not exists brand text,                 -- null = alimento genérico
  add column if not exists food_group text,            -- subcategoría: «Quesos», «Bebidas vegetales»…
  add column if not exists saturated_fat numeric,      -- por 100 g/ml
  add column if not exists sugars numeric,
  add column if not exists salt numeric,
  add column if not exists source_ref text,            -- «BEDCA 2541», «USDA FDC 171077», código de barras
  add column if not exists incomplete boolean not null default false,
  add column if not exists approx_ml boolean not null default false,
  add column if not exists package_quantity text,
  add column if not exists db_version smallint not null default 2;

alter table public.ingredients drop constraint if exists ingredients_source_check;
alter table public.ingredients add constraint ingredients_source_check
  check (source in ('bedca','usda','openfoodfacts','referencia','usuario','estimacion'));

create index if not exists ingredients_brand_idx on public.ingredients (brand);
create index if not exists ingredients_group_idx on public.ingredients (food_group);
-- búsqueda por nombre y marca (trigramas para tolerar erratas)
create extension if not exists pg_trgm;
create index if not exists ingredients_name_trgm on public.ingredients using gin (name gin_trgm_ops);

-- Registro diario: copia de los valores por 100 g/ml en el momento del consumo
alter table public.food_logs add column if not exists per100 jsonb; -- {kcal, protein, carbs, fat}

-- Comida libre: el usuario se salta el plato del plan (se conserva recipe_id para volver a él)
alter table public.planned_meals add column if not exists free boolean not null default false;
