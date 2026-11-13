-- ---------------------------------------------------------------------------
-- Brote · alimentos añadidos a una comida del plan y postres (preparado, NO aplicado).
-- ---------------------------------------------------------------------------

-- [{ "id": "...", "foodId": "...", "amount": g_o_ml_que_se_comen, "kind": "postre" | "extra" }]
-- La cantidad es absoluta (no por ración). La receta original no se modifica.
alter table public.planned_meals add column if not exists extras jsonb;
