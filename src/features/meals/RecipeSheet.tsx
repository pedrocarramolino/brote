import { useEffect, useState } from 'react';
import { ArrowLeftRight, CalendarPlus, Check, ChevronDown, Clock, Copy, Heart, Info, PencilLine, Plus, RotateCcw, Search, Trash2, UtensilsCrossed, Users } from 'lucide-react';
import { MoreMenu } from '../../components/ui/Menu';
import { useFeedback } from '../../components/ui/Feedback';
import { deleteDish, duplicateDish, unitSize } from '../../services/dishes';
import { QuantityEditor, amountLabel, fmtQty, qtyFromBase, qtyToBase, type QtyValue } from './QuantityEditor';
import { defaultQuantity } from '../../services/dishes';
import { useFoodSearch } from '../log/useFoodSearch';
import { FoodRow } from '../log/LogFoodSheet';
import { todayISO } from '../../lib/dates';
import type { Food, PlannedMeal, Recipe } from '../../types';
import { Sheet } from '../../components/ui/Sheet';
import { Badge, Button, IconButton, Stepper, cx } from '../../components/ui/primitives';
import { useData, useStore } from '../../store/AppStore';
import { getFood, SLOT_META } from '../../services/catalog';
import { foodMacros, ingredientsAllergens, ingredientsNutrition, mealIngredients, type EffectiveIngredient } from '../../services/nutrition';
import { equivalencesFor } from '../../services/equivalences';
import { ALLERGEN_LABELS } from '../../data/foods';
import { n0, n1 } from '../../lib/format';
import { MacroGrid, RecipeCover } from './RecipeBits';
import { CATEGORY_META, CUISINE_LABEL, DIET_LABEL, DIFFICULTY_LABEL, MAIN_LABEL, QUALITY_TEXT, TAG_LABEL, dietLabels, ingredientsFiber, nutritionQuality, recipeTitle, sourceSummary } from '../../services/recipeMeta';
import { Segmented } from '../../components/ui/primitives';
import { useMealActions } from './useMealActions';

interface Props {
  recipe: Recipe | undefined;
  open: boolean;
  onClose: () => void;
  meal?: PlannedMeal;
  onSwap?: () => void;
  /** Biblioteca: abre la elección de día y comida para añadir la receta al menú */
  onAddToPlan?: () => void;
  /** Mis platos: editar y registrar en Hoy */
  onEditDish?: (r: Recipe) => void;
  /** Biblioteca: crear una copia en Mis platos para añadirle alimentos (la receta no cambia) */
  onCustomize?: (r: Recipe) => void;
  onLogDish?: (r: Recipe) => void;
}

export function RecipeSheet({ recipe, open, onClose, meal, onSwap, onAddToPlan, onEditDish, onLogDish, onCustomize }: Props) {
  const data = useData();
  const { mutate } = useStore();
  const actions = useMealActions();
  const { toast, confirm } = useFeedback();
  const [openIng, setOpenIng] = useState<string | null>(null);
  const [whole, setWhole] = useState(false);
  // al restablecer una cantidad se vuelve a montar su editor con el valor de la receta
  const [qtyResets, setQtyResets] = useState(0);
  const [adding, setAdding] = useState(false);
  useEffect(() => setAdding(false), [meal?.id, open]);
  useEffect(() => setWhole(false), [recipe?.id, open]);

  if (!recipe) return null;
  const portion = meal?.portion ?? 1;
  // cantidades mostradas: la ración planificada, o la receta completa si se pide
  const qty = meal ? portion : whole ? recipe.servings : 1;
  // Ingredientes reales: con las sustituciones hechas en ESTA comida
  const editable = !!meal && meal.recipeId === recipe.id;
  const rows: EffectiveIngredient[] = editable ? mealIngredients(data, meal, { includeRemoved: true }) : recipe.ingredients.map((i) => ({ ...i }));
  const ingredients = rows.filter((i) => !i.removed);
  const { macros, missing } = ingredientsNutrition(data, ingredients, portion);
  const allergens = ingredientsAllergens(data, ingredients);
  const fiber = ingredientsFiber(data, ingredients, portion);
  const inMeal = new Set(ingredients.map((i) => i.foodId));
  const fav = data.favorites.recipes.includes(recipe.id);

  const mine = !!recipe.custom;
  const duplicate = () => {
    let copyName = '';
    mutate((d) => { const c = duplicateDish(d, recipe.id); copyName = c?.title ?? ''; });
    toast(`Copia creada en Mis platos${copyName ? `: ${copyName}` : ''}`);
    onClose();
  };
  const remove = async () => {
    const ok = await confirm({
      title: 'Eliminar plato',
      message: `«${recipe.title ?? recipe.name}» se quitará de Mis platos. Lo que ya registraste o planificaste con él conserva sus valores.`,
      confirmLabel: 'Eliminar',
      destructive: true,
    });
    if (!ok) return;
    mutate((d) => deleteDish(d, recipe.id, todayISO()));
    toast('Plato eliminado');
    onClose();
  };

  const toggleFav = () =>
    mutate((d) => {
      const list = d.favorites.recipes;
      d.favorites.recipes = list.includes(recipe.id) ? list.filter((x) => x !== recipe.id) : [...list, recipe.id];
    });

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={recipeTitle(recipe)}
      size="lg"
      subtitle={meal ? `${SLOT_META[meal.slot].label} · ${meal.status === 'hecha' ? 'Completada' : meal.status === 'omitida' ? 'Omitida' : 'Pendiente'}` : recipe.slots.map((s) => SLOT_META[s].label).join(' · ')}
      headerAction={
        <>
          {mine && (
            <MoreMenu
              label="Opciones del plato"
              items={[
                ...(onEditDish ? [{ label: 'Editar', icon: <PencilLine size={18} />, onSelect: () => onEditDish(recipe) }] : []),
                { label: 'Duplicar', icon: <Copy size={18} />, onSelect: duplicate },
                { label: 'Eliminar', icon: <Trash2 size={18} />, onSelect: () => void remove(), destructive: true },
              ]}
            />
          )}
          <IconButton label={fav ? 'Quitar de favoritas' : 'Guardar en favoritas'} onClick={toggleFav} variant="secondary" className="!h-9 !w-9">
            <Heart size={18} className={cx(fav && 'fill-danger text-danger')} />
          </IconButton>
        </>
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
        ) : onAddToPlan || onLogDish ? (
          <div className="flex gap-2">
            {onLogDish && (
              <Button variant="secondary" className="min-w-0 flex-1" icon={<UtensilsCrossed size={18} />} onClick={() => onLogDish(recipe)} data-log-dish>
                Registrar hoy
              </Button>
            )}
            {onAddToPlan && (
              <Button className="min-w-0 flex-[1.3]" icon={<CalendarPlus size={18} />} onClick={onAddToPlan} data-add-to-plan>
                Añadir al menú
              </Button>
            )}
          </div>
        ) : undefined
      }
    >
      <RecipeCover recipe={recipe} size="full" className="mb-3 h-40 w-full" rounded="rounded-[18px]" labelled={!recipe.imageUrl} />
      {mine && <p className="mb-2"><Badge tone="accent">Mi plato</Badge></p>}
      {(mine ? recipe.description : recipe.title ? recipe.name : undefined) && (
        <p className="mb-3 text-[16px] leading-snug text-ink2" data-recipe-description>{mine ? recipe.description : recipe.name}</p>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px] text-ink2">
        {recipe.minutes > 0 && <span className="inline-flex items-center gap-1.5"><Clock size={16} /> {recipe.minutes} min</span>}
        <span className="inline-flex items-center gap-1.5"><Users size={16} /> {meal ? (portion === 1 ? '1 ración' : `${n1(portion)} raciones`) : `Receta para ${recipe.servings} ${recipe.servings === 1 ? 'ración' : 'raciones'}`}</span>
        <span>{CATEGORY_META[recipe.category].label} · {DIFFICULTY_LABEL[recipe.difficulty]} · {MAIN_LABEL[recipe.main]}{recipe.cuisine ? ` · Cocina ${CUISINE_LABEL[recipe.cuisine].toLowerCase()}` : ''}</span>
      </div>
      <div className="mb-4 flex flex-wrap gap-1.5" data-recipe-tags>
        {fav && <Badge tone="accent">Favorita</Badge>}
        {dietLabels(data, recipe).map((d) => <Badge key={d} tone="accent">{DIET_LABEL[d]}</Badge>)}
        {recipe.tags.map((t) => <Badge key={t}>{TAG_LABEL[t]}</Badge>)}
      </div>

      <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-ink3">{meal && portion !== 1 ? `Para tu ración (×${n1(portion)})` : 'Por ración'}</p>
      <MacroGrid m={macros} />
      <p className="tabular mt-2 text-[13px] text-ink2" data-fiber>
        Fibra: <span className="font-semibold text-ink">≈ {n1(fiber.grams)} g</span> <span className="text-ink3">(estimada{fiber.complete ? '' : ', faltan datos de algún ingrediente'})</span>
      </p>
      <p className="mt-2 flex items-start gap-1.5 text-[12px] leading-snug text-ink3" data-quality={nutritionQuality(data, ingredients)}>
        <Info size={14} className="mt-[1px] shrink-0" />
        <span>
          <strong className="font-semibold text-ink2">{QUALITY_TEXT[nutritionQuality(data, ingredients)].label}.</strong> {QUALITY_TEXT[nutritionQuality(data, ingredients)].detail}
          {missing.length > 0 && ` ${missing.length} ingrediente(s) sin datos no se han sumado.`}
          <span className="mt-0.5 block text-ink3" data-source-summary>Ingredientes por fuente: {sourceSummary(data, ingredients)}.</span>
        </span>
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

      <div className="mb-2 mt-6 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[17px] font-bold">Ingredientes</h3>
        {!meal && recipe.servings > 1 && (
          <Segmented
            className="w-full xs:w-auto"
            label="Cantidades"
            value={whole ? 'all' : 'one'}
            onChange={(v) => setWhole(v === 'all')}
            options={[{ value: 'one', label: '1 ración' }, { value: 'all', label: `${recipe.servings} raciones` }]}
          />
        )}
      </div>
      <ul className="divide-y divide-line/70 overflow-hidden rounded-[16px] bg-surface2/60 ring-1 ring-line/60">
        {rows.map((ing) => {
          const key = ing.extra ? `extra:${ing.extra}` : ing.replaces ?? ing.foodId;
          const isExtra = !!ing.extra;
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
          const amount = ing.amount * qty;
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
                  {isExtra && <span className="block text-[12px] font-medium text-accent-deep" data-extra-kind={ing.dessert ? 'postre' : 'extra'}>{ing.dessert ? 'Postre' : 'Añadido por ti'}</span>}
                  {f && <span className="tabular block text-[12px] text-ink3">{n0(foodMacros(f, amount).kcal)} kcal</span>}
                </span>
                {ing.original !== undefined && !orig && <span className="sr-only">Cantidad cambiada en esta comida</span>}
                <span className="tabular shrink-0 text-right text-[15px] font-semibold text-ink2" data-ingredient-amount>
                  {amountLabel(f, amount)}
                  {ing.original !== undefined && <span className="block text-[11px] font-medium text-accent-deep">Cambiada</span>}
                </span>
                {canExpand && <ChevronDown size={16} className={cx('shrink-0 text-ink3 transition-transform', expanded && 'rotate-180')} aria-hidden="true" />}
              </button>
              {expanded && (
                <div className="anim-fade bg-surface px-4 pb-3 pt-1">
                  {editable && f && (
                    <div className="mb-3" data-ingredient-qty={key}>
                      <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-ink3">Cantidad en esta comida</p>
                      <IngredientQty
                        key={`${f.id}-${qtyResets}`}
                        food={f}
                        amount={amount}
                        onCommit={(b) => (isExtra ? actions.updateExtra(meal!, ing.extra!, { amount: b }) : actions.setIngredientAmount(meal!, key, f.id, b / qty))}
                      />
                      {ing.original !== undefined && (
                        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[13px] text-ink3" data-original-amount>
                          Receta original: {amountLabel(f, ing.original * qty)}
                          <button
                            type="button"
                            className="min-h-[36px] rounded-[8px] px-2 font-semibold text-accent-deep hover:bg-accentSoft"
                            onClick={() => { actions.setIngredientAmount(meal!, key, f.id, ing.original!); setQtyResets((n) => n + 1); }}
                            data-reset-amount
                          >
                            Restablecer
                          </button>
                        </p>
                      )}
                    </div>
                  )}
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
                                <span className="tabular shrink-0 font-semibold text-ink2">{n0(e.amount * qty)} {e.food.unit}</span>
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
                                  if (isExtra) actions.updateExtra(meal!, ing.extra!, { foodId: e.food.id, amount: e.amount * qty });
                                  else actions.swapIngredient(meal!, key, { foodId: e.food.id, amount: e.amount }, { from: f?.name ?? key, to: e.food.name });
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
                  {editable && isExtra && (
                    <button
                      type="button"
                      data-remove-extra={ing.extra}
                      className="mt-2 flex min-h-[44px] w-full items-center gap-2 rounded-[10px] px-3 text-left text-[14px] font-semibold text-danger hover:bg-surface2"
                      onClick={() => {
                        actions.removeExtra(meal!, ing.extra!, f?.name ?? 'Alimento');
                        setOpenIng(null);
                      }}
                    >
                      <Trash2 size={16} /> Quitar de esta comida
                    </button>
                  )}
                  {editable && !isExtra && !orig && ingredients.filter((i) => !i.extra).length > 1 && (
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
                      <RotateCcw size={16} /> Volver a {orig.name.toLowerCase()} ({n0(origAmount * qty)} {orig.unit})
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {editable && (
        adding ? (
          <AddFoodPanel
            onCancel={() => setAdding(false)}
            onAdd={(food, amount) => {
              actions.addExtra(meal!, food.id, amount, food.name);
              setAdding(false);
            }}
          />
        ) : (
          <Button variant="tinted" className="mt-2 w-full" icon={<Plus size={18} />} onClick={() => setAdding(true)} data-add-extra>
            Añadir alimento
          </Button>
        )
      )}
      {!meal && !mine && onCustomize && (
        <Button variant="tinted" className="mt-2 w-full" icon={<Plus size={18} />} onClick={() => onCustomize(recipe)} data-customize-recipe>
          Añadir alimentos (crear mi versión)
        </Button>
      )}
      {!meal && mine && onEditDish && (
        <Button variant="tinted" className="mt-2 w-full" icon={<Plus size={18} />} onClick={() => onEditDish(recipe)} data-add-ingredient-dish>
          Añadir ingredientes
        </Button>
      )}
      <p className="mt-1.5 px-1 text-[12px] text-ink3">
        {editable
          ? 'Toca un ingrediente para cambiar su cantidad (en unidades o gramos) o sustituirlo solo en esta comida, o añade otro alimento (pan, fruta, postre…). La receta original no cambia; los valores y la lista de la compra se actualizan.'
          : mine
            ? 'Toca un ingrediente para ver con qué puedes intercambiarlo. Para añadir o cambiar ingredientes, edita el plato.'
            : 'Toca un ingrediente para ver con qué puedes intercambiarlo. La receta de la biblioteca no se modifica: para añadir alimentos se crea tu versión en Mis platos, o añádelos en una comida de tu plan.'}
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

/**
 * Cantidad de un ingrediente en una comida del plan. Mantiene su propio texto mientras se
 * escribe y guarda cada valor válido al momento (los totales se recalculan sin cerrar el teclado).
 */
function IngredientQty({ food, amount, onCommit }: { food: Food; amount: number; onCommit: (base: number) => void }) {
  const [v, setV] = useState<QtyValue>(() => {
    // en unidades si la cantidad equivale a un número «redondo» de piezas (½, 1, 1½, 2…)
    const u = unitSize(food);
    const pieces = u ? amount / u : 0;
    return qtyFromBase(food, amount, u && Math.abs(pieces * 2 - Math.round(pieces * 2)) < 0.04 ? 'unidad' : undefined);
  });
  return (
    <QuantityEditor
      food={food}
      value={v}
      onChange={(next) => {
        setV(next);
        const b = qtyToBase(food, next);
        if (b !== null) onCommit(b);
      }}
    />
  );
}

/**
 * Añadir un alimento a esta comida: buscador del catálogo genérico (kcal por 100 g/ml en cada
 * resultado) y, al elegir, cantidad en unidades o gramos con sus valores energéticos.
 */
function AddFoodPanel({ onAdd, onCancel }: { onAdd: (food: Food, amount: number) => void; onCancel: () => void }) {
  const data = useData();
  const [q, setQ] = useState('');
  const [food, setFood] = useState<Food | null>(null);
  const [v, setV] = useState<QtyValue>({ text: '100', unit: 'g' });
  const results = useFoodSearch(data, q).local.slice(0, 8);
  const base = food ? qtyToBase(food, v) : null;
  const m = food && base !== null ? foodMacros(food, base) : null;
  return (
    <div className="anim-fade mt-2 rounded-[16px] bg-surface2/60 p-3 ring-1 ring-line/60" data-add-food-panel>
      {!food ? (
        <>
          <label className="flex h-11 items-center gap-2 rounded-[12px] bg-surface px-3 ring-1 ring-line/70 focus-within:ring-2 focus-within:ring-accent">
            <Search size={18} className="text-ink3" aria-hidden="true" />
            <span className="sr-only">Buscar alimento para añadir</span>
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Pan, plátano, yogur, queso…"
              className="h-full w-full bg-transparent text-[16px] placeholder:text-ink3 focus:outline-none"
              type="search"
              enterKeyHint="search"
              data-add-food-search
            />
          </label>
          {q.trim() && (
            <ul className="mt-1 divide-y divide-line/60">
              {results.length ? results.map((f) => (
                <FoodRow key={f.id} food={f} onClick={() => { const d = defaultQuantity(f); setV({ text: fmtQty(d.quantity), unit: d.unit }); setFood(f); }} />
              )) : <li className="py-3 text-[14px] text-ink3">Sin resultados.</li>}
            </ul>
          )}
          <Button variant="secondary" size="sm" className="mt-2" onClick={onCancel}>Cancelar</Button>
        </>
      ) : (
        <>
          <p className="mb-2 text-[16px] font-semibold">{food.name}</p>
          <QuantityEditor food={food} value={v} onChange={setV} onEnter={() => base !== null && onAdd(food, base)} autoFocus />
          {m && (
            <p className="tabular mt-1.5 text-[13px] text-ink2" data-add-food-macros>
              Proteínas <span className="font-semibold text-ink">{n1(m.protein)} g</span> · Hidratos <span className="font-semibold text-ink">{n1(m.carbs)} g</span> · Grasas <span className="font-semibold text-ink">{n1(m.fat)} g</span>
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setFood(null)}>Volver</Button>
            <Button className="flex-[1.4]" disabled={base === null} onClick={() => base !== null && onAdd(food, base)} data-confirm-add-extra>
              Añadir{m ? ` · ${n0(m.kcal)} kcal` : ''}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
