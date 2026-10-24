import { useState } from 'react';
import { ArrowLeftRight, Check, ChevronDown, Clock, Heart, Info, RotateCcw, Trash2, Users } from 'lucide-react';
import type { PlannedMeal, Recipe } from '../../types';
import { Sheet } from '../../components/ui/Sheet';
import { Badge, Button, IconButton, Stepper, cx } from '../../components/ui/primitives';
import { useData, useStore } from '../../store/AppStore';
import { getFood, SLOT_META } from '../../services/catalog';
import { foodMacros, ingredientsAllergens, ingredientsNutrition, mealIngredients, type EffectiveIngredient } from '../../services/nutrition';
import { equivalencesFor } from '../../services/equivalences';
import { ALLERGEN_LABELS } from '../../data/foods';
import { n0, n1 } from '../../lib/format';
import { MacroGrid, RecipeCover } from './RecipeBits';
import { useMealActions } from './useMealActions';

interface Props {
  recipe: Recipe | undefined;
  open: boolean;
  onClose: () => void;
  meal?: PlannedMeal;
  onSwap?: () => void;
}

export function RecipeSheet({ recipe, open, onClose, meal, onSwap }: Props) {
  const data = useData();
  const { mutate } = useStore();
  const actions = useMealActions();
  const [openIng, setOpenIng] = useState<string | null>(null);

  if (!recipe) return null;
  const portion = meal?.portion ?? 1;
  // Ingredientes reales: con las sustituciones hechas en ESTA comida
  const editable = !!meal && meal.recipeId === recipe.id;
  const rows: EffectiveIngredient[] = editable ? mealIngredients(data, meal, { includeRemoved: true }) : recipe.ingredients.map((i) => ({ ...i }));
  const ingredients = rows.filter((i) => !i.removed);
  const { macros, missing } = ingredientsNutrition(data, ingredients, portion);
  const allergens = ingredientsAllergens(data, ingredients);
  const inMeal = new Set(ingredients.map((i) => i.foodId));
  const fav = data.favorites.recipes.includes(recipe.id);

  const toggleFav = () =>
    mutate((d) => {
      const list = d.favorites.recipes;
      d.favorites.recipes = list.includes(recipe.id) ? list.filter((x) => x !== recipe.id) : [...list, recipe.id];
    });

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={recipe.name}
      size="lg"
      subtitle={meal ? `${SLOT_META[meal.slot].label} · ${meal.status === 'hecha' ? 'Completada' : meal.status === 'omitida' ? 'Omitida' : 'Pendiente'}` : recipe.slots.map((s) => SLOT_META[s].label).join(' · ')}
      headerAction={
        <IconButton label={fav ? 'Quitar de favoritas' : 'Guardar en favoritas'} onClick={toggleFav} variant="secondary" className="!h-9 !w-9">
          <Heart size={18} className={cx(fav && 'fill-danger text-danger')} />
        </IconButton>
      }
      footer={
        meal ? (
          <div className="flex gap-2">
            {onSwap && (
              <Button variant="secondary" className="min-w-0 flex-1" icon={<ArrowLeftRight size={18} />} onClick={onSwap}>
                Cambiar
              </Button>
            )}
            <Button
              className="min-w-0 flex-[1.4]"
              variant={meal.status === 'hecha' ? 'tinted' : 'primary'}
              icon={<Check size={18} />}
              onClick={() => {
                actions.toggleDone(meal);
                onClose();
              }}
            >
              {meal.status === 'hecha' ? 'Pendiente' : 'Marcar hecha'}
            </Button>
          </div>
        ) : undefined
      }
    >
      <RecipeCover recipe={recipe} size="full" className="mb-4 h-40 w-full" rounded="rounded-[18px]" />

      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px] text-ink2">
        <span className="inline-flex items-center gap-1.5"><Clock size={16} /> {recipe.minutes} min</span>
        <span className="inline-flex items-center gap-1.5"><Users size={16} /> {portion === 1 ? '1 ración' : `${n1(portion)} raciones`}</span>
        {recipe.tags.includes('batch') && <Badge>Se puede preparar con antelación</Badge>}
        {fav && <Badge tone="accent">Favorita</Badge>}
      </div>

      <MacroGrid m={macros} />
      <p className="mt-2 flex items-start gap-1.5 text-[12px] leading-snug text-ink3">
        <Info size={14} className="mt-[1px] shrink-0" />
        Valores calculados a partir de los ingredientes con datos de referencia (BEDCA/USDA). Son aproximados y pueden variar según marca y preparación.
        {missing.length > 0 && ` ${missing.length} ingrediente(s) sin datos no se han sumado.`}
      </p>

      {meal && (
        <div className="mt-5 flex items-center justify-between rounded-[16px] bg-surface2 px-4 py-2">
          <div>
            <p className="text-[15px] font-semibold">Ración</p>
            <p className="text-[13px] text-ink2">Ajusta la cantidad que vas a comer</p>
          </div>
          <Stepper label="ración" value={portion} min={0.5} max={3} step={0.25} format={(v) => `×${n1(v)}`} onChange={(v) => actions.setPortion(meal, v)} />
        </div>
      )}

      <h3 className="mb-2 mt-6 text-[17px] font-bold">Ingredientes</h3>
      <ul className="divide-y divide-line/70 overflow-hidden rounded-[16px] bg-surface2/60 ring-1 ring-line/60">
        {rows.map((ing) => {
          const key = ing.replaces ?? ing.foodId;
          if (ing.removed) {
            const rf = getFood(data, ing.foodId);
            return (
              <li key={key} data-ingredient={key} className="flex min-h-[52px] items-center gap-3 px-4 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-medium text-ink3 line-through">{rf?.name ?? ing.foodId}</span>
                  <span className="block text-[12px] text-ink3">Quitado de esta comida</span>
                </span>
                <button
                  type="button"
                  data-restore={key}
                  className="flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-[10px] px-3 text-[14px] font-semibold text-accent-deep hover:bg-accentSoft"
                  onClick={() => actions.swapIngredient(meal!, key, null, { from: '', to: rf?.name ?? key })}
                >
                  <RotateCcw size={16} /> Volver a añadir
                </button>
              </li>
            );
          }
          const f = getFood(data, ing.foodId);
          const orig = ing.replaces ? getFood(data, ing.replaces) : undefined;
          const amount = ing.amount * portion;
          // equivalencias del alimento actual; sin repetir alimentos que ya están en el plato
          const exclude = new Set(inMeal);
          if (ing.replaces) exclude.add(ing.replaces);
          const eq = f ? equivalencesFor(data, f.id, ing.amount, { exclude }) : null;
          const canExpand = editable || !!eq?.items.length;
          const expanded = openIng === key;
          const origAmount = recipe.ingredients.find((i) => i.foodId === key)?.amount ?? ing.amount;
          return (
            <li key={key} data-ingredient={key}>
              <button
                type="button"
                className="flex min-h-[52px] w-full items-center gap-3 px-4 py-2 text-left hover:bg-surface2"
                onClick={() => setOpenIng(expanded ? null : key)}
                aria-expanded={canExpand ? expanded : undefined}
                disabled={!canExpand}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-medium">{f?.name ?? ing.foodId}</span>
                  {orig && <span className="block text-[12px] font-medium text-accent-deep">Sustituye a {orig.name.toLowerCase()}</span>}
                  {f && <span className="tabular block text-[12px] text-ink3">{n0(foodMacros(f, amount).kcal)} kcal</span>}
                </span>
                <span className="tabular shrink-0 text-[15px] font-semibold text-ink2">{n0(amount)} {f?.unit ?? 'g'}</span>
                {canExpand && <ChevronDown size={16} className={cx('shrink-0 text-ink3 transition-transform', expanded && 'rotate-180')} aria-hidden="true" />}
              </button>
              {expanded && (
                <div className="anim-fade bg-surface px-4 pb-3 pt-1">
                  {!!eq?.items.length && (
                    <>
                      <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-ink3">
                        {editable ? 'Cambiar por' : 'Equivalencias'} · {eq.items[0].basisLabel}
                      </p>
                      <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                        {eq.items.slice(0, 8).map((e) => {
                          const label = (
                            <>
                              <span className="min-w-0 flex-1 truncate">{e.food.name}</span>
                              {e.blocked ? (
                                <span className="shrink-0 text-[12px] text-ink3">{e.blocked}</span>
                              ) : (
                                <span className="tabular shrink-0 font-semibold text-ink2">{n0(e.amount * portion)} {e.food.unit}</span>
                              )}
                            </>
                          );
                          if (!editable || e.blocked)
                            return (
                              <li key={e.food.id} className={cx('flex items-center gap-2 rounded-[10px] bg-surface2 px-3 py-1.5 text-[14px]', e.blocked && 'opacity-55')}>
                                {label}
                              </li>
                            );
                          return (
                            <li key={e.food.id}>
                              <button
                                type="button"
                                data-equivalence={e.food.id}
                                className="flex min-h-[44px] w-full items-center gap-2 rounded-[10px] bg-surface2 px-3 py-1.5 text-left text-[14px] ring-accent/40 transition hover:bg-accentSoft focus-visible:ring-2 active:scale-[0.99]"
                                onClick={() => {
                                  actions.swapIngredient(meal!, key, { foodId: e.food.id, amount: e.amount }, { from: f?.name ?? key, to: e.food.name });
                                  setOpenIng(null);
                                }}
                              >
                                {label}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </>
                  )}
                  {editable && !eq?.items.length && <p className="pb-1 text-[13px] text-ink3">No hay equivalencias en la base para este alimento.</p>}
                  {editable && !orig && ingredients.length > 1 && (
                    <button
                      type="button"
                      data-remove={key}
                      className="mt-2 flex min-h-[44px] w-full items-center gap-2 rounded-[10px] px-3 text-left text-[14px] font-semibold text-danger hover:bg-surface2"
                      onClick={() => {
                        actions.swapIngredient(meal!, key, { foodId: key, amount: 0 }, { from: f?.name ?? key, to: '' });
                        setOpenIng(null);
                      }}
                    >
                      <Trash2 size={16} /> Quitar de esta comida
                    </button>
                  )}
                  {editable && orig && (
                    <button
                      type="button"
                      data-restore={key}
                      className="mt-2 flex min-h-[44px] w-full items-center gap-2 rounded-[10px] px-3 text-left text-[14px] font-semibold text-accent-deep hover:bg-accentSoft"
                      onClick={() => {
                        actions.swapIngredient(meal!, key, null, { from: f?.name ?? '', to: orig.name });
                        setOpenIng(null);
                      }}
                    >
                      <RotateCcw size={16} /> Volver a {orig.name.toLowerCase()} ({n0(origAmount * portion)} {orig.unit})
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-1.5 px-1 text-[12px] text-ink3">
        {editable
          ? 'Toca un ingrediente y elige una equivalencia para cambiarlo solo en esta comida. Los valores y la lista de la compra se actualizan.'
          : 'Toca un ingrediente para ver con qué puedes intercambiarlo. Para cambiarlo, abre la receta desde una comida de tu plan.'}
      </p>

      <h3 className="mb-2 mt-6 text-[17px] font-bold">Alérgenos</h3>
      {allergens.length ? (
        <div className="flex flex-wrap gap-1.5">
          {allergens.map((a) => (
            <Badge key={a} tone={data.profile.allergies.includes(a) ? 'danger' : 'neutral'}>{ALLERGEN_LABELS[a]}</Badge>
          ))}
        </div>
      ) : (
        <p className="text-[15px] text-ink2">Ninguno de los 14 alérgenos principales según los ingredientes de la base. Revisa siempre el etiquetado de cada producto.</p>
      )}

      <h3 className="mb-2 mt-6 text-[17px] font-bold">Preparación</h3>
      <ol className="space-y-3">
        {recipe.steps.map((s, i) => (
          <li key={i} className="flex gap-3">
            <span className="tabular mt-[1px] flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accentSoft text-[13px] font-bold text-accent-deep">{i + 1}</span>
            <p className="text-[16px] leading-relaxed">{s}</p>
          </li>
        ))}
      </ol>
    </Sheet>
  );
}
