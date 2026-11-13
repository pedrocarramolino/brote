-- ---------------------------------------------------------------------------
-- Brote · solo alimentos genéricos y cantidades en unidades (preparado, NO aplicado).
-- ---------------------------------------------------------------------------

-- Sin marcas comerciales: la columna brand se vacía y deja de usarse (se conserva por compatibilidad).
-- Los productos de marca guardados se sustituyen por su genérico en la app (migración de datos v3).
update public.ingredients set brand = null where brand is not null;
drop index if exists ingredients_brand_idx;
update public.custom_foods set brand = null where brand is not null;

-- Registro diario: cantidad tal y como la escribió el usuario (p. ej. 2 unidades);
-- amount sigue siendo g/ml y es la que se usa para calcular.
alter table public.food_logs
  add column if not exists quantity numeric check (quantity is null or quantity > 0),
  add column if not exists unit text check (unit is null or unit in ('g','kg','ml','l','unidad','cucharada','cucharadita'));

-- Cantidades cambiadas o ingredientes sustituidos SOLO en una comida del plan:
-- { "<foodId de la receta>": { "foodId": "...", "amount": g_o_ml_por_ración } } (amount 0 = quitado).
-- La receta original no se modifica nunca.
alter table public.planned_meals add column if not exists swaps jsonb;
