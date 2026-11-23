import { useEffect, useMemo, useState } from 'react';
import { Camera, ChevronLeft, ChevronRight, Heart, Plus, Search, Sparkles, Trash2 } from 'lucide-react';
import type { Food, FoodLogEntry, ISODate, MealSlot, Recipe } from '../../types';
import { Sheet } from '../../components/ui/Sheet';
import { Badge, Button, Chip, IconButton, Segmented, SelectField, TextField, cx } from '../../components/ui/primitives';
import { useData, useStore } from '../../store/AppStore';
import { getFood, SLOT_META, slotsOrdered } from '../../services/catalog';
import { addMacros, foodMacros, recipeNutrition, scaleMacros, ZERO } from '../../services/nutrition';
import { buildIndex, parseMealText } from '../../services/mealText';
import { BASE_FOODS, OFFICIAL_FOODS } from '../../data/foods';
import { useFeedback } from '../../components/ui/Feedback';
import { defaultQuantity, dishLogEntry, unitSize, userDishes } from '../../services/dishes';
import { QuantityEditor, fmtQty, qtyFromBase, qtyToBase, type QtyValue } from '../meals/QuantityEditor';
import { recipeMatches, recipeTitle } from '../../services/recipeMeta';
import { RecipeCover } from '../meals/RecipeBits';
import { SOURCE_LABEL } from '../../services/foodDatabase';
import { useFoodSearch } from './useFoodSearch';
import { n0, normalize, parseDecimal, servingsLabel } from '../../lib/format';
import { relativeDayLabel } from '../../lib/dates';
import { MacroGrid } from '../meals/RecipeBits';
import { useMealActions } from '../meals/useMealActions';
import { CustomFoodForm } from './CustomFoodForm';

interface Props {
  open: boolean;
  onClose: () => void;
  date: ISODate;
  slot: MealSlot;
  editEntry?: FoodLogEntry | null;
  onOpenPhoto?: () => void;
  /** abrir directamente con un plato de «Mis platos» para registrarlo */
  initialDish?: Recipe | null;
  /** abrir el creador de platos */
  onCreateDish?: () => void;
  /** registrar como picoteo (fuera de las comidas del día) */
  snack?: boolean;
}

type Tab = 'buscar' | 'favoritos' | 'recientes' | 'platos';
interface DescribedRow { text: string; food?: Food; recipe?: Recipe; amount: number; note: string; estimated: boolean; alternatives: Food[] }

/** Cantidad de un alimento reconocido en el texto (mismo editor que en el resto de la app). */
function DescribedQty({ food, amount, onChange }: { food: Food; amount: number; onChange: (g: number) => void }) {
  const [v, setV] = useState<QtyValue>(() => qtyFromBase(food, amount, unitSize(food) && Math.abs((amount / unitSize(food)!) * 2 - Math.round((amount / unitSize(food)!) * 2)) < 0.04 ? 'unidad' : undefined));
  return <QuantityEditor food={food} value={v} onChange={(n) => { setV(n); const b = qtyToBase(food, n); if (b !== null) onChange(b); }} />;
}
/** valor del selector de comida para «Picoteo» */
const SNACK = '__picoteo';

export function LogFoodSheet({ open, onClose, date, slot: initialSlot, editEntry, onOpenPhoto, initialDish, onCreateDish, snack = false }: Props) {
  const data = useData();
  const { mutate } = useStore();
  const { addLog, updateLog, removeLog } = useMealActions();
  const { toast } = useFeedback();

  const [view, setView] = useState<'list' | 'amount' | 'custom' | 'dish' | 'quick' | 'describe'>('list');
  // «¿Qué has comido?»: texto libre → alimentos de la base con su cantidad (valores calculados)
  const [describeText, setDescribeText] = useState('');
  const [parsed, setParsed] = useState<DescribedRow[]>([]);
  const [openRow, setOpenRow] = useState<number | null>(null);
  const [parsedOnce, setParsedOnce] = useState(false);
  // picoteo: fuera de las comidas; se puede pasar a una comida y al revés
  const [asSnack, setAsSnack] = useState(snack);
  const [quick, setQuick] = useState({ name: '', kcal: '', protein: '', carbs: '', fat: '' });
  const [quickError, setQuickError] = useState<string | null>(null);
  const [dish, setDish] = useState<Recipe | null>(null);
  const [servingsText, setServingsText] = useState('1');
  const [tab, setTab] = useState<Tab>('buscar');
  const [query, setQuery] = useState('');
  const [food, setFood] = useState<Food | null>(null);
  const [qty, setQty] = useState<QtyValue>({ text: '100', unit: 'g' });
  const [slot, setSlot] = useState<MealSlot>(initialSlot);
  const [amountError, setAmountError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSlot(initialSlot);
    setQuery('');
    setTab('buscar');
    setDish(null);
    setAsSnack(editEntry ? !!editEntry.snack : snack);
    setQuickError(null);
    if (editEntry?.quick && editEntry.snapshot) {
      const sp = editEntry.snapshot.perServing;
      const t = (v: number) => (v ? String(Math.round(v * 10) / 10).replace('.', ',') : '');
      setQuick({ name: editEntry.snapshot.name, kcal: String(Math.round(sp.kcal)), protein: t(sp.protein), carbs: t(sp.carbs), fat: t(sp.fat) });
      setSlot(editEntry.slot);
      setView('quick');
    } else if (editEntry?.snapshot) {
      setServingsText(String(editEntry.amount).replace('.', ','));
      setSlot(editEntry.slot);
      setView('dish');
    } else if (initialDish) {
      setDish(initialDish);
      setServingsText('1');
      setView('dish');
    } else if (editEntry) {
      const f = getFood(data, editEntry.foodId) ?? null;
      setFood(f);
      if (f) setQty(editEntry.unit && editEntry.quantity ? { text: fmtQty(editEntry.quantity), unit: editEntry.unit } : qtyFromBase(f, editEntry.amount));
      setSlot(editEntry.slot);
      setView('amount');
    } else {
      setFood(null);
      setQuick({ name: '', kcal: '', protein: '', carbs: '', fat: '' });
      // el picoteo empieza por describirlo: la app calcula los valores
      setView(snack ? 'describe' : 'list');
      setDescribeText('');
      setParsed([]);
      setParsedOnce(false);
      setOpenRow(null);
    }
    setAmountError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editEntry?.id, initialDish?.id]);

  const local = useFoodSearch(data, query).local;
  const describeIndex = useMemo(() => buildIndex({ base: BASE_FOODS, official: OFFICIAL_FOODS, custom: data.customFoods.filter((f) => !f.brand) }), [data.customFoods]);
  const favorites = useMemo(() => data.favorites.foods.map((id) => getFood(data, id)).filter((f): f is Food => !!f), [data]);
  const recents = useMemo(() => {
    const seen = new Set<string>();
    const out: Food[] = [];
    [...data.log].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).forEach((l) => {
      if (seen.has(l.foodId) || out.length >= 15) return;
      seen.add(l.foodId);
      const f = getFood(data, l.foodId);
      if (f) out.push(f);
    });
    return out;
  }, [data]);

  const base = food ? qtyToBase(food, qty) : null;
  const amount = base ?? NaN;
  const validAmount = base !== null;
  const preview = food && base !== null ? foodMacros(food, base) : null;
  // cantidad escrita en unidades o cucharadas: se guarda también para mostrarla igual al editar
  const shown = food && validAmount && qty.unit !== food.unit ? { quantity: parseDecimal(qty.text), unit: qty.unit } : { quantity: undefined, unit: undefined };
  const isFavFood = food ? data.favorites.foods.includes(food.id) : false;

  const pick = (f: Food) => {
    setFood(f);
    const d = defaultQuantity(f);
    setQty({ text: fmtQty(d.quantity), unit: d.unit });
    setAmountError(null);
    setView('amount');
  };

  const servings = parseDecimal(servingsText);
  const validServings = Number.isFinite(servings) && servings > 0 && servings <= 20;
  const dishPerServing = editEntry?.snapshot ? editEntry.snapshot.perServing : dish ? recipeNutrition(data, dish).macros : null;
  const dishPreview = dishPerServing && validServings ? scaleMacros(dishPerServing, servings) : null;
  const myDishes = useMemo(() => userDishes(data), [data]);
  // platos propios que coinciden con lo buscado: aparecen arriba de los alimentos
  const dishHits = useMemo(() => {
    const nq = normalize(query.trim());
    if (nq.length < 2) return [];
    return myDishes.filter((r) => recipeMatches(data, r, nq, normalize)).slice(0, 5);
  }, [myDishes, query, data]);

  const saveDish = () => {
    if (!validServings) return;
    if (editEntry) updateLog(editEntry.id, { amount: servings, slot, snack: asSnack });
    else if (dish) addLog({ ...dishLogEntry(data, dish, { date, slot, servings }), ...(asSnack ? { snack: true } : {}) });
    onClose();
  };

  const save = () => {
    if (!food) return;
    if (!validAmount) {
      setAmountError('Introduce una cantidad válida.');
      return;
    }
    if (editEntry) updateLog(editEntry.id, { amount, slot, ...shown, snack: asSnack });
    else addLog({ date, slot, foodId: food.id, amount, method: 'manual', ...(shown.unit ? shown : {}), ...(asSnack ? { snack: true } : {}) });
    onClose();
  };

  /** «Solo calorías»: lo introduce el usuario (p. ej. de una etiqueta o de una carta); no se inventa nada. */
  const saveQuick = () => {
    const kcal = parseDecimal(quick.kcal);
    if (!Number.isFinite(kcal) || kcal <= 0 || kcal > 5000) {
      setQuickError('Introduce las calorías (entre 1 y 5.000 kcal).');
      return;
    }
    const opt = (t: string) => { const v = parseDecimal(t); return Number.isFinite(v) && v >= 0 && v <= 500 ? v : 0; };
    const snapshot = {
      name: quick.name.trim().slice(0, 60) || (asSnack ? 'Picoteo' : 'Calorías a mano'),
      perServing: { kcal: Math.round(kcal), protein: opt(quick.protein), carbs: opt(quick.carbs), fat: opt(quick.fat) },
      complete: !!(quick.protein.trim() && quick.carbs.trim() && quick.fat.trim()),
      at: new Date().toISOString(),
    };
    if (editEntry) updateLog(editEntry.id, { snapshot, slot, snack: asSnack });
    else addLog({ date, slot, foodId: '', amount: 1, method: 'manual', quick: true, snapshot, ...(asSnack ? { snack: true } : {}) });
    onClose();
  };

  const runDescribe = () => {
    const rows = parseMealText(data, describeText, describeIndex);
    setParsed(rows.map((r) => ({ text: r.text, food: r.food, recipe: r.recipe, amount: r.amount, note: r.amountNote, estimated: r.estimated, alternatives: r.alternatives })));
    setParsedOnce(true);
    setOpenRow(null);
  };
  const describedMacros = (r: DescribedRow) =>
    r.food ? foodMacros(r.food, r.amount) : r.recipe ? scaleMacros(recipeNutrition(data, r.recipe).macros, r.amount) : null;
  const describedOk = parsed.filter((r) => (r.food || r.recipe) && r.amount > 0);
  const describedCount = describedOk.length;
  const describedTotal = describedCount ? describedOk.reduce((a, r) => addMacros(a, describedMacros(r)!), ZERO) : null;
  const saveDescribed = () => {
    for (const r of describedOk) {
      const extra = asSnack ? { snack: true } : {};
      if (r.food) addLog({ date, slot, foodId: r.food.id, amount: r.amount, method: 'manual', ...extra }, true);
      else if (r.recipe) addLog({ ...dishLogEntry(data, r.recipe, { date, slot, servings: r.amount }), ...extra }, true);
    }
    toast(`${describedCount === 1 ? 'Añadido' : `${describedCount} alimentos añadidos`} · ${n0(describedTotal?.kcal ?? 0)} kcal`);
    onClose();
  };

  const toggleFavFood = () =>
    food &&
    mutate((d) => {
      const list = d.favorites.foods;
      d.favorites.foods = list.includes(food.id) ? list.filter((x) => x !== food.id) : [...list, food.id];
    });

  const slots = slotsOrdered(data.profile.mealSlots.includes(slot) ? data.profile.mealSlots : [...data.profile.mealSlots, slot]);
  const list = tab === 'buscar' ? local : tab === 'favoritos' ? favorites : recents;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      fill={view === 'list' || view === 'describe'}
      title={editEntry ? 'Editar registro' : view === 'custom' ? 'Alimento personalizado' : view === 'quick' ? 'Calorías a mano' : view === 'describe' ? (asSnack ? 'Añadir picoteo' : 'Describe lo que has comido') : view === 'dish' ? 'Registrar mi plato' : asSnack ? 'Añadir picoteo' : 'Añadir alimento'}
      subtitle={`${relativeDayLabel(date)} · ${asSnack ? 'Picoteo' : SLOT_META[slot].label}`}
      footer={
        view === 'dish' && (dish || editEntry) ? (
          <div className="flex gap-2">
            {editEntry ? (
              <Button variant="destructive" icon={<Trash2 size={18} />} onClick={() => { removeLog(editEntry); onClose(); }} data-remove-log>
                Quitar
              </Button>
            ) : !initialDish ? (
              <Button variant="secondary" icon={<ChevronLeft size={18} />} onClick={() => setView('list')}>Volver</Button>
            ) : null}
            <Button className="flex-1" onClick={saveDish} disabled={!validServings} data-confirm-log-dish>
              {editEntry ? 'Guardar cambios' : 'Registrar'}
            </Button>
          </div>
        ) : view === 'describe' && describedCount > 0 ? (
          <Button className="w-full" onClick={saveDescribed} data-save-described>
            Añadir {describedCount === 1 ? '1 alimento' : `${describedCount} alimentos`} · {n0(describedTotal?.kcal ?? 0)} kcal
          </Button>
        ) : view === 'quick' ? (
          <div className="flex gap-2">
            {editEntry ? (
              <Button variant="destructive" icon={<Trash2 size={18} />} onClick={() => { removeLog(editEntry); onClose(); }}>Eliminar</Button>
            ) : (
              <Button variant="secondary" icon={<ChevronLeft size={18} />} onClick={() => setView('list')}>Volver</Button>
            )}
            <Button className="flex-1" onClick={saveQuick} data-save-quick>{editEntry ? 'Guardar cambios' : 'Añadir'}</Button>
          </div>
        ) : view === 'amount' && food ? (
          <div className="flex gap-2">
            {editEntry ? (
              <Button variant="destructive" icon={<Trash2 size={18} />} onClick={() => { removeLog(editEntry); onClose(); }}>
                Eliminar
              </Button>
            ) : (
              <Button variant="secondary" icon={<ChevronLeft size={18} />} onClick={() => setView('list')}>Volver</Button>
            )}
            <Button className="flex-1" onClick={save} disabled={!validAmount}>
              {editEntry ? 'Guardar cambios' : 'Añadir'}
            </Button>
          </div>
        ) : undefined
      }
    >
      {view === 'list' && (
        <div className="anim-fade">
          <div className="sticky top-0 z-10 -mx-5 bg-surface px-5 pb-3">
            <label className="flex h-11 items-center gap-2 rounded-[12px] bg-surface2 px-3 focus-within:ring-2 focus-within:ring-accent">
              <Search size={18} className="text-ink3" aria-hidden="true" />
              <span className="sr-only">Buscar alimento</span>
              <input
                data-autofocus
                value={query}
                onChange={(e) => { setQuery(e.target.value); setTab('buscar'); }}
                placeholder="Buscar alimento"
                className="h-full w-full bg-transparent text-[17px] placeholder:text-ink3 focus:outline-none"
                type="search"
                enterKeyHint="search"
              />
            </label>
            <Segmented
              className="mt-3"
              size="sm"
              label="Origen"
              value={tab}
              onChange={setTab}
              options={[{ value: 'buscar', label: 'Todos' }, { value: 'platos', label: 'Mis platos' }, { value: 'favoritos', label: 'Favoritos' }, { value: 'recientes', label: 'Recientes' }]}
            />
          </div>

          <div className="mb-3 grid grid-cols-2 gap-2">
            {onOpenPhoto && (
              <button type="button" onClick={onOpenPhoto} className="press flex items-center gap-2 rounded-[14px] bg-surface2 px-3 py-3 text-left text-[14px] font-semibold hover:bg-line/50">
                <Camera size={18} className="text-accent" /> Foto o descripción
              </button>
            )}
            <button type="button" onClick={() => setView('custom')} className={cx('press flex items-center gap-2 rounded-[14px] bg-surface2 px-3 py-3 text-left text-[14px] font-semibold hover:bg-line/50', !onOpenPhoto && 'col-span-2')}>
              <Plus size={18} className="text-accent" /> Crear alimento
            </button>
            <button type="button" onClick={() => setView('describe')} className="press col-span-2 flex items-center gap-2 rounded-[14px] bg-surface2 px-3 py-2.5 text-left text-[14px] font-semibold hover:bg-line/50" data-describe-open>
              <Sparkles size={18} className="text-accent" /> Escribe lo que has comido <span className="font-normal text-ink3">· te calcula las calorías</span>
            </button>
          </div>

          {tab === 'platos' ? (
            myDishes.length === 0 ? (
              <div className="py-8 text-center text-[15px] text-ink2">
                <p>Aún no has creado platos. Crea uno una vez y regístralo siempre que quieras sin volver a escribir los ingredientes.</p>
                {onCreateDish && <Button className="mt-3" icon={<Plus size={18} />} onClick={onCreateDish}>Crear mi plato</Button>}
              </div>
            ) : (
              <ul className="divide-y divide-line/60" data-my-dishes>
                {myDishes.map((r) => {
                  const m = recipeNutrition(data, r).macros;
                  return (
                    <li key={r.id}>
                      <button type="button" onClick={() => { setDish(r); setServingsText('1'); setView('dish'); }} className="flex min-h-[60px] w-full items-center gap-3 py-2 text-left hover:bg-surface2/50" data-pick-dish={r.id}>
                        <RecipeCover recipe={r} size={44} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[16px] font-medium">{recipeTitle(r)}</span>
                          <span className="tabular block text-[13px] text-ink3">{n0(m.kcal)} kcal por ración · P {n0(m.protein)} · H {n0(m.carbs)} · G {n0(m.fat)}</span>
                        </span>
                        <ChevronRight size={18} className="text-ink3" aria-hidden="true" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )
          ) : (<>
          {tab === 'buscar' && dishHits.length > 0 && (
            <div className="mb-2" data-dish-hits>
              <p className="pb-1 text-[12px] font-semibold uppercase tracking-wide text-ink3">Mis platos</p>
              <ul className="divide-y divide-line/60">
                {dishHits.map((r) => {
                  const m = recipeNutrition(data, r).macros;
                  return (
                    <li key={r.id}>
                      <button type="button" onClick={() => { setDish(r); setServingsText('1'); setView('dish'); }} className="flex min-h-[56px] w-full items-center gap-3 py-2 text-left hover:bg-surface2/50" data-pick-dish={r.id}>
                        <RecipeCover recipe={r} size={40} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[16px] font-medium">{recipeTitle(r)}</span>
                          <span className="tabular block text-[13px] text-ink3">{n0(m.kcal)} kcal por ración · Mi plato</span>
                        </span>
                        <ChevronRight size={18} className="shrink-0 text-ink3" aria-hidden="true" />
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="pb-1 pt-3 text-[12px] font-semibold uppercase tracking-wide text-ink3">Alimentos</p>
            </div>
          )}
          {list.length === 0 ? (
            <p className="py-8 text-center text-[15px] text-ink2">
              {tab === 'favoritos' ? 'Aún no tienes alimentos favoritos. Márcalos con el corazón al añadirlos.' : tab === 'recientes' ? 'Todavía no has registrado alimentos.' : query.trim() ? 'Sin resultados en la base de alimentos. Puedes crear el alimento.' : 'Escribe para buscar un alimento o uno de tus platos.'}
            </p>
          ) : (
            <ul className="divide-y divide-line/60">
              {list.map((f) => (
                <FoodRow key={f.id} food={f} onClick={() => pick(f)} />
              ))}
            </ul>
          )}
          </>)}

          {tab === 'buscar' && <FoodSourcesNote />}
        </div>
      )}

      {view === 'amount' && food && (
        <div className="anim-fade">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-[19px] font-bold leading-snug">{food.name}</h3>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {food.group && <Badge>{food.group}</Badge>}
                <Badge tone={food.source === 'estimacion' || food.source === 'referencia' ? 'warn' : 'neutral'}>{SOURCE_LABEL[food.source]}</Badge>
                <Badge>{n0(food.per100.kcal)} kcal / 100 {food.unit}</Badge>
              </div>
            </div>
            <IconButton label={isFavFood ? 'Quitar de favoritos' : 'Añadir a favoritos'} variant="secondary" onClick={toggleFavFood}>
              <Heart size={19} className={cx(isFavFood && 'fill-danger text-danger')} />
            </IconButton>
          </div>

          <p className="mb-2 text-[14px] font-semibold text-ink2">Cantidad</p>
          <QuantityEditor
            food={food}
            value={qty}
            onChange={(v) => { setQty(v); setAmountError(null); }}
            onEnter={save}
            autoFocus
          />
          {amountError && <p className="mt-1 text-[13px] text-danger">{amountError}</p>}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {food.portion && (
              <button
                type="button"
                onClick={() => { setQty(unitSize(food) && /^1\s/.test(food.portion!.label) ? { text: '1', unit: 'unidad' } : { text: fmtQty(food.portion!.amount), unit: food.unit }); setAmountError(null); }}
                className="press h-9 rounded-full bg-accentSoft px-3 text-[14px] font-semibold text-accent-deep"
              >
                {food.portion.label} · {food.portion.amount} {food.unit}
              </button>
            )}
            {[50, 100, 150, 200].map((v) => (
              <button key={v} type="button" onClick={() => { setQty({ text: String(v), unit: food.unit }); setAmountError(null); }} className="press h-9 rounded-full bg-surface2 px-3 text-[14px] font-medium">
                {v} {food.unit}
              </button>
            ))}
          </div>

          <SelectField label="Comida" className="mt-4" value={asSnack ? SNACK : slot} onChange={(e) => { if (e.target.value === SNACK) setAsSnack(true); else { setAsSnack(false); setSlot(e.target.value as MealSlot); } }} data-log-slot>
            {slots.map((s) => <option key={s} value={s}>{SLOT_META[s].label}</option>)}
            <option value={SNACK}>Picoteo (fuera de las comidas)</option>
          </SelectField>

          <div className="mt-5">{preview ? <MacroGrid m={preview} /> : <p className="text-[14px] text-ink3">Introduce una cantidad válida para ver los valores.</p>}</div>
          {preview && <ExtraNutrients food={food} amount={amount} />}
          <FoodSourceLine food={food} />
        </div>
      )}

      {view === 'dish' && (dish || editEntry?.snapshot) && (
        <div className="anim-fade" data-log-dish>
          <div className="mb-4 flex items-center gap-3">
            {dish && <RecipeCover recipe={dish} size={52} />}
            <div className="min-w-0">
              <h3 className="text-[19px] font-bold leading-snug">{dish ? recipeTitle(dish) : editEntry!.snapshot!.name}</h3>
              <p className="tabular text-[13px] text-ink3">{dishPerServing ? `${n0(dishPerServing.kcal)} kcal por ración` : ''}{dish ? ` · el plato completo son ${dish.servings} ${dish.servings === 1 ? 'ración' : 'raciones'}` : ''}</p>
            </div>
          </div>
          <TextField
            label="Raciones que tomas"
            inputMode="decimal"
            value={servingsText}
            onChange={(e) => setServingsText(e.target.value)}
            suffix={validServings ? (servings === 1 ? 'ración' : 'raciones') : ''}
            error={servingsText && !validServings ? 'Introduce un número entre 0,1 y 20.' : undefined}
            onKeyDown={(e) => e.key === 'Enter' && saveDish()}
            data-servings
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[0.5, 1, 1.5, 2].map((v) => (
              <button key={v} type="button" onClick={() => setServingsText(String(v).replace('.', ','))} className={cx('press h-9 rounded-full px-3 text-[14px] font-medium', servings === v ? 'bg-accent text-accentInk' : 'bg-surface2')} data-servings-chip={v}>
                {servingsLabel(v)}
              </button>
            ))}
          </div>
          <SelectField label="Comida" className="mt-4" value={asSnack ? SNACK : slot} onChange={(e) => { if (e.target.value === SNACK) setAsSnack(true); else { setAsSnack(false); setSlot(e.target.value as MealSlot); } }} data-log-slot>
            {slots.map((s) => <option key={s} value={s}>{SLOT_META[s].label}</option>)}
            <option value={SNACK}>Picoteo (fuera de las comidas)</option>
          </SelectField>
          <div className="mt-5" data-dish-preview>{dishPreview ? <MacroGrid m={dishPreview} /> : <p className="text-[14px] text-ink3">Introduce las raciones para ver los valores.</p>}</div>
          <p className="mt-2 text-[12px] leading-snug text-ink3">
            {editEntry
              ? `Valores guardados al registrarlo${editEntry.snapshot ? ` (${new Date(editEntry.snapshot.at).toLocaleDateString('es-ES')})` : ''}: si editas el plato, este registro no cambia.`
              : 'Se guarda una copia de estos valores: si más adelante editas el plato, lo que ya registraste no cambia.'}
          </p>
        </div>
      )}

      {view === 'describe' && (
        <div className="anim-fade" data-describe>
          <label className="block">
            <span className="mb-1.5 block text-[14px] font-semibold text-ink2">{asSnack ? '¿Qué has picado?' : '¿Qué has comido?'}</span>
            <textarea
              data-autofocus
              value={describeText}
              onChange={(e) => setDescribeText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); runDescribe(); } }}
              rows={2}
              placeholder="Por ejemplo: un puñado de almendras y una cerveza"
              className="w-full resize-none rounded-[12px] bg-surface2 px-3 py-2.5 text-[16px] leading-snug placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-accent"
              data-describe-input
            />
          </label>
          <div className="mt-2 flex items-center gap-2">
            <Button size="sm" onClick={runDescribe} disabled={!describeText.trim()} data-describe-run>Calcular</Button>
            <button type="button" onClick={() => setView('list')} className="min-h-[36px] px-1 text-[14px] font-semibold text-accent">o busca un alimento</button>
          </div>
          {parsedOnce && parsed.length === 0 && <p className="mt-4 text-[14px] text-ink2">No he reconocido ningún alimento. Prueba con otras palabras o búscalo.</p>}
          {parsed.length > 0 && (
            <ul className="mt-4 divide-y divide-line/60 rounded-[16px] ring-1 ring-line/60" data-described>
              {parsed.map((row, i) => {
                const m = describedMacros(row);
                const name = row.food?.name ?? (row.recipe ? recipeTitle(row.recipe) : row.text);
                return (
                  <li key={i} data-described-row>
                    <div className="flex min-h-[52px] items-center gap-2 px-3 py-2">
                      <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setOpenRow(openRow === i ? null : i)} disabled={!row.food && !row.recipe}>
                        <span className="block truncate text-[15px] font-semibold">{row.food || row.recipe ? name : `«${row.text}»`}</span>
                        <span className="tabular block text-[12px] text-ink3">
                          {row.food ? `${row.note} · ${n0(row.amount)} ${row.food.unit}${row.estimated ? ' · cantidad estimada' : ''}` : row.recipe ? `${servingsLabel(row.amount)} · ${row.recipe.custom ? 'Mi plato' : 'receta'}` : 'No encontrado'}
                        </span>
                      </button>
                      {m ? <span className="tabular shrink-0 text-[15px] font-semibold" data-described-kcal>{n0(m.kcal)} kcal</span> : (
                        <button type="button" className="shrink-0 text-[13px] font-semibold text-accent" onClick={() => { setQuery(row.text); setTab('buscar'); setView('list'); }}>Buscar</button>
                      )}
                      <IconButton label={`Quitar ${name}`} onClick={() => setParsed((ps) => ps.filter((_, j) => j !== i))} className="!h-9 !w-9 text-ink3"><Trash2 size={16} /></IconButton>
                    </div>
                    {openRow === i && row.food && (
                      <div className="border-t border-line/60 px-3 pb-3 pt-2">
                        <DescribedQty key={row.food.id} food={row.food} amount={row.amount} onChange={(a) => setParsed((ps) => ps.map((p, j) => (j === i ? { ...p, amount: a, note: 'cantidad ajustada', estimated: false } : p)))} />
                        {row.alternatives.length > 0 && (
                          <>
                            <p className="mb-1 mt-3 text-[12px] font-semibold uppercase tracking-wide text-ink3">¿Era otro?</p>
                            <div className="flex flex-wrap gap-1.5">
                              {row.alternatives.map((f) => (
                                <Chip key={f.id} selected={false} onClick={() => setParsed((ps) => ps.map((p, j) => (j === i ? { ...p, food: f, alternatives: [p.food!, ...p.alternatives.filter((x) => x.id !== f.id)] } : p)))}>{f.name}</Chip>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {describedTotal && (
            <div className="mt-3" data-described-total><MacroGrid m={describedTotal} /></div>
          )}
          {parsed.length > 0 && <p className="mt-2 text-[12px] leading-snug text-ink3">Las calorías salen de los valores por 100 g de cada alimento en la base (BEDCA/USDA). Si no dices la cantidad se usa una ración habitual: toca un alimento para ajustarla o cambiarlo.</p>}
          <SelectField label="Comida" className="mt-4" value={asSnack ? SNACK : slot} onChange={(e) => { if (e.target.value === SNACK) setAsSnack(true); else { setAsSnack(false); setSlot(e.target.value as MealSlot); } }}>
            {slots.map((s) => <option key={s} value={s}>{SLOT_META[s].label}</option>)}
            <option value={SNACK}>Picoteo (fuera de las comidas)</option>
          </SelectField>
        </div>
      )}

      {view === 'quick' && (
        <div className="anim-fade" data-quick-form>
          <TextField label="¿Qué has comido?" value={quick.name} onChange={(e) => setQuick({ ...quick, name: e.target.value })} placeholder={asSnack ? 'Por ejemplo: patatas fritas del bar' : 'Por ejemplo: menú del día'} maxLength={60} data-quick-name />
          <TextField className="mt-3" label="Calorías" inputMode="decimal" suffix="kcal" value={quick.kcal} onChange={(e) => { setQuick({ ...quick, kcal: e.target.value }); setQuickError(null); }} error={quickError} placeholder="Obligatorio" data-autofocus data-quick-kcal-input onKeyDown={(e) => e.key === 'Enter' && saveQuick()} />
          <p className="mb-1.5 mt-4 text-[14px] font-semibold text-ink2">Macronutrientes <span className="font-normal text-ink3">(opcional)</span></p>
          <div className="grid grid-cols-3 gap-2">
            <TextField label="Proteínas" inputMode="decimal" suffix="g" value={quick.protein} onChange={(e) => setQuick({ ...quick, protein: e.target.value })} />
            <TextField label="Hidratos" inputMode="decimal" suffix="g" value={quick.carbs} onChange={(e) => setQuick({ ...quick, carbs: e.target.value })} />
            <TextField label="Grasas" inputMode="decimal" suffix="g" value={quick.fat} onChange={(e) => setQuick({ ...quick, fat: e.target.value })} />
          </div>
          <SelectField label="Comida" className="mt-4" value={asSnack ? SNACK : slot} onChange={(e) => { if (e.target.value === SNACK) setAsSnack(true); else { setAsSnack(false); setSlot(e.target.value as MealSlot); } }}>
            {slots.map((s) => <option key={s} value={s}>{SLOT_META[s].label}</option>)}
            <option value={SNACK}>Picoteo (fuera de las comidas)</option>
          </SelectField>
          <p className="mt-3 text-[12px] leading-snug text-ink3">Úsalo cuando sepas las calorías (de una etiqueta, una carta o una app) pero no esté el alimento. Si conoces el alimento, búscalo: sus valores salen de la base y son más fiables.</p>
        </div>
      )}

      {view === 'custom' && (
        <CustomFoodForm
          onCancel={() => setView('list')}
          onSaved={(f) => pick(f)}
        />
      )}
    </Sheet>
  );
}

export function FoodRow({ food, onClick }: { food: Food; onClick: () => void }) {
  return (
    <li>
      <button type="button" onClick={onClick} className="flex min-h-[56px] w-full items-center gap-3 py-2 text-left hover:bg-surface2/50" data-food-row={food.id}>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[16px] font-medium">{food.name}</span>
          <span className="flex min-w-0 items-center gap-1.5 text-[13px] text-ink3">
            <span className="tabular shrink-0 font-medium text-ink2">{n0(food.per100.kcal)} kcal</span>
            <span className="shrink-0">/100 {food.unit}</span>
            <span className="truncate">· {food.source === 'usuario' ? 'Tuyo' : food.group ?? SOURCE_LABEL[food.source]}</span>
          </span>
        </span>
        <ChevronRight size={18} className="shrink-0 text-ink3" aria-hidden="true" />
      </button>
    </li>
  );
}

/** Saturadas, azúcares, fibra y sal de la cantidad elegida (solo los datos que existen). */
export function ExtraNutrients({ food, amount }: { food: Food; amount: number }) {
  const k = amount / 100;
  const items = [
    ['Saturadas', food.sat],
    ['Azúcares', food.sugars],
    ['Fibra', food.fiber],
    ['Sal', food.salt],
  ] as const;
  return (
    <p className="tabular mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[13px] text-ink2" data-extra-nutrients>
      {items.map(([label, v]) => (
        <span key={label}>{label} <span className="font-semibold text-ink">{v === undefined ? 's/d' : `${(Math.round(v * k * 10) / 10).toString().replace('.', ',')} g`}</span></span>
      ))}
    </p>
  );
}

/** Origen del dato, explicado en una línea. */
export function FoodSourceLine({ food }: { food: Food }) {
  const text: Record<Food['source'], string> = {
    bedca: 'Fuente: AESAN/BEDCA, Base de Datos Española de Composición de Alimentos v1.0 (2010).',
    usda: 'Fuente: USDA FoodData Central, SR Legacy (dominio público).',
    openfoodfacts: 'Valor medio de las etiquetas de varios productos equivalentes (Open Food Facts, ODbL).',
    referencia: 'Valor medio estimado: no hay un equivalente fiable en BEDCA ni en USDA.',
    usuario: 'Valores introducidos por ti.',
    estimacion: 'Estimación aproximada.',
  };
  return (
    <p className="mt-2 text-[12px] leading-snug text-ink3" data-food-source={food.source}>
      {text[food.source]}
      {food.ref ? ` (${food.ref})` : ''}
      {food.incomplete ? ' Falta algún macronutriente en la fuente: se cuenta como 0.' : ''}
      {food.approxMl ? ' Valores por 100 g aplicados a 100 ml.' : ''}
    </p>
  );
}

/** Nota breve sobre de dónde salen los datos del buscador. */
export function FoodSourcesNote() {
  return (
    <p className="mt-4 text-[12px] leading-snug text-ink3">
      Alimentos genéricos con valores por 100 g o 100 ml de BEDCA (AESAN) y USDA FoodData Central.
    </p>
  );
}
