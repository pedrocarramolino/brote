import { useEffect, useMemo, useState } from 'react';
import { Camera, ChevronLeft, ChevronRight, Globe, Heart, Plus, RotateCw, Search, Trash2 } from 'lucide-react';
import type { Food, FoodLogEntry, ISODate, MealSlot, Recipe } from '../../types';
import { Sheet } from '../../components/ui/Sheet';
import { Badge, Button, IconButton, Segmented, SelectField, TextField, cx } from '../../components/ui/primitives';
import { useData, useStore } from '../../store/AppStore';
import { getFood, SLOT_META, slotsOrdered } from '../../services/catalog';
import { foodMacros, recipeNutrition, scaleMacros } from '../../services/nutrition';
import { dishLogEntry, userDishes } from '../../services/dishes';
import { recipeTitle } from '../../services/recipeMeta';
import { RecipeCover } from '../meals/RecipeBits';
import { SOURCE_LABEL } from '../../services/foodDatabase';
import { useFoodSearch } from './useFoodSearch';
import { kindOf, type FoodKind } from '../../services/foodSearch';
import { n0, parseDecimal, servingsLabel } from '../../lib/format';
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
}

type Tab = 'buscar' | 'favoritos' | 'recientes' | 'platos';

export function LogFoodSheet({ open, onClose, date, slot: initialSlot, editEntry, onOpenPhoto, initialDish, onCreateDish }: Props) {
  const data = useData();
  const { mutate } = useStore();
  const { addLog, updateLog, removeLog } = useMealActions();

  const [kind, setKind] = useState<FoodKind | 'todos'>('todos');
  const [view, setView] = useState<'list' | 'amount' | 'custom' | 'dish'>('list');
  const [dish, setDish] = useState<Recipe | null>(null);
  const [servingsText, setServingsText] = useState('1');
  const [tab, setTab] = useState<Tab>('buscar');
  const [query, setQuery] = useState('');
  const [food, setFood] = useState<Food | null>(null);
  const [amountText, setAmountText] = useState('100');
  const [slot, setSlot] = useState<MealSlot>(initialSlot);
  const [amountError, setAmountError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSlot(initialSlot);
    setQuery('');
    setTab('buscar');
    setKind('todos');
    setDish(null);
    if (editEntry?.snapshot) {
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
      setAmountText(String(editEntry.amount));
      setSlot(editEntry.slot);
      setView('amount');
    } else {
      setFood(null);
      setView('list');
    }
    setAmountError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editEntry?.id, initialDish?.id]);

  const search = useFoodSearch(data, query, open && view === 'list' && tab === 'buscar', kind);
  const local = search.local;
  const offState = search.remote;
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

  const amount = parseDecimal(amountText);
  const validAmount = Number.isFinite(amount) && amount > 0 && amount <= 3000;
  const preview = food && validAmount ? foodMacros(food, amount) : null;
  const isFavFood = food ? data.favorites.foods.includes(food.id) : false;

  const pick = (f: Food) => {
    setFood(f);
    setAmountText(String(f.portion?.amount ?? 100));
    setAmountError(null);
    setView('amount');
  };

  const servings = parseDecimal(servingsText);
  const validServings = Number.isFinite(servings) && servings > 0 && servings <= 20;
  const dishPerServing = editEntry?.snapshot ? editEntry.snapshot.perServing : dish ? recipeNutrition(data, dish).macros : null;
  const dishPreview = dishPerServing && validServings ? scaleMacros(dishPerServing, servings) : null;
  const myDishes = useMemo(() => userDishes(data), [data]);

  const saveDish = () => {
    if (!validServings) return;
    if (editEntry) updateLog(editEntry.id, { amount: servings, slot });
    else if (dish) addLog(dishLogEntry(data, dish, { date, slot, servings }));
    onClose();
  };

  const save = () => {
    if (!food) return;
    if (!validAmount) {
      setAmountError('Introduce una cantidad entre 1 y 3.000.');
      return;
    }
    // Los productos de Open Food Facts se guardan como alimento propio para poder referenciarlos.
    if (food.source === 'openfoodfacts' && !getFood(data, food.id)) {
      mutate((d) => void d.customFoods.push(food));
    }
    if (editEntry) updateLog(editEntry.id, { amount, slot });
    else addLog({ date, slot, foodId: food.id, amount, method: 'manual' });
    onClose();
  };

  const toggleFavFood = () =>
    food &&
    mutate((d) => {
      if (food.source === 'openfoodfacts' && !d.customFoods.some((f) => f.id === food.id)) d.customFoods.push(food);
      const list = d.favorites.foods;
      d.favorites.foods = list.includes(food.id) ? list.filter((x) => x !== food.id) : [...list, food.id];
    });

  const slots = slotsOrdered(data.profile.mealSlots.includes(slot) ? data.profile.mealSlots : [...data.profile.mealSlots, slot]);
  const list = tab === 'buscar' ? local : tab === 'favoritos' ? favorites : recents;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editEntry ? 'Editar registro' : view === 'custom' ? 'Alimento personalizado' : view === 'dish' ? 'Registrar mi plato' : 'Añadir alimento'}
      subtitle={`${relativeDayLabel(date)} · ${SLOT_META[slot].label}`}
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
            {tab === 'buscar' && <KindFilter value={kind} onChange={setKind} />}
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
          ) : list.length === 0 ? (
            <p className="py-8 text-center text-[15px] text-ink2">
              {tab === 'favoritos' ? 'Aún no tienes alimentos favoritos. Márcalos con el corazón al añadirlos.' : tab === 'recientes' ? 'Todavía no has registrado alimentos.' : 'Sin resultados en la base local. Puedes crear el alimento.'}
            </p>
          ) : (
            <ul className="divide-y divide-line/60">
              {list.map((f) => (
                <FoodRow key={f.id} food={f} onClick={() => pick(f)} />
              ))}
            </ul>
          )}

          {tab === 'buscar' && data.profile.useOpenFoodFacts && query.trim().length >= 3 && (
            <div className="mt-5">
              <p className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-ink3"><Globe size={14} /> Open Food Facts</p>
              {offState.status === 'loading' && <p className="anim-shimmer py-4 text-[14px] text-ink2">Buscando productos…</p>}
              {offState.status === 'error' && (
                <div className="flex items-center justify-between gap-3 rounded-[14px] bg-warnSoft px-3 py-2.5 text-[14px] text-warn">
                  <span>{offState.error}</span>
                  <Button size="sm" variant="secondary" icon={<RotateCw size={15} />} onClick={search.retry}>Reintentar</Button>
                </div>
              )}
              {offState.status === 'done' && offState.items.length === 0 && <p className="py-3 text-[14px] text-ink2">Ningún producto con información nutricional completa.</p>}
              {offState.items.length > 0 && (
                <ul className="divide-y divide-line/60">
                  {offState.items.map((f) => <FoodRow key={f.id} food={f} onClick={() => pick(f)} />)}
                </ul>
              )}
            </div>
          )}
          {tab === 'buscar' && <FoodSourcesNote />}
        </div>
      )}

      {view === 'amount' && food && (
        <div className="anim-fade">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-[19px] font-bold leading-snug">{food.name}</h3>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <Badge tone={food.brand ? 'accent' : 'neutral'}>{food.brand ? food.brand : 'Genérico'}</Badge>
                <Badge tone={food.source === 'estimacion' || food.source === 'referencia' ? 'warn' : 'neutral'}>{SOURCE_LABEL[food.source]}</Badge>
                <Badge>{n0(food.per100.kcal)} kcal / 100 {food.unit}</Badge>
              </div>
            </div>
            <IconButton label={isFavFood ? 'Quitar de favoritos' : 'Añadir a favoritos'} variant="secondary" onClick={toggleFavFood}>
              <Heart size={19} className={cx(isFavFood && 'fill-danger text-danger')} />
            </IconButton>
          </div>

          <TextField
            label="Cantidad"
            inputMode="decimal"
            value={amountText}
            onChange={(e) => { setAmountText(e.target.value); setAmountError(null); }}
            suffix={food.unit}
            error={amountError}
            data-autofocus
            onKeyDown={(e) => e.key === 'Enter' && save()}
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {food.portion && (
              <button type="button" onClick={() => setAmountText(String(food.portion!.amount))} className="press h-9 rounded-full bg-accentSoft px-3 text-[14px] font-semibold text-accent-deep">
                {food.portion.label} · {food.portion.amount} {food.unit}
              </button>
            )}
            {[50, 100, 150, 200].map((v) => (
              <button key={v} type="button" onClick={() => setAmountText(String(v))} className="press h-9 rounded-full bg-surface2 px-3 text-[14px] font-medium">
                {v} {food.unit}
              </button>
            ))}
          </div>

          <SelectField label="Comida" className="mt-4" value={slot} onChange={(e) => setSlot(e.target.value as MealSlot)}>
            {slots.map((s) => <option key={s} value={s}>{SLOT_META[s].label}</option>)}
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
          <SelectField label="Comida" className="mt-4" value={slot} onChange={(e) => setSlot(e.target.value as MealSlot)}>
            {slots.map((s) => <option key={s} value={s}>{SLOT_META[s].label}</option>)}
          </SelectField>
          <div className="mt-5" data-dish-preview>{dishPreview ? <MacroGrid m={dishPreview} /> : <p className="text-[14px] text-ink3">Introduce las raciones para ver los valores.</p>}</div>
          <p className="mt-2 text-[12px] leading-snug text-ink3">
            {editEntry
              ? `Valores guardados al registrarlo${editEntry.snapshot ? ` (${new Date(editEntry.snapshot.at).toLocaleDateString('es-ES')})` : ''}: si editas el plato, este registro no cambia.`
              : 'Se guarda una copia de estos valores: si más adelante editas el plato, lo que ya registraste no cambia.'}
          </p>
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
  const marca = kindOf(food) === 'marca';
  return (
    <li>
      <button type="button" onClick={onClick} className="flex min-h-[56px] w-full items-center gap-3 py-2 text-left hover:bg-surface2/50" data-food-row={food.id}>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[16px] font-medium">{food.name}</span>
          <span className="flex min-w-0 items-center gap-1.5 text-[13px] text-ink3">
            <span className={cx('shrink-0 rounded-full px-1.5 py-px text-[11px] font-semibold', marca ? 'bg-accentSoft text-accent-deep' : 'bg-surface2 text-ink2')} data-kind={marca ? 'marca' : 'generico'}>
              {marca ? food.brand : 'Genérico'}
            </span>
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

/** Filtro de tipo de alimento: todos, genéricos (BEDCA/USDA y de la app) o productos de marca. */
export function KindFilter({ value, onChange }: { value: FoodKind | 'todos'; onChange: (v: FoodKind | 'todos') => void }) {
  return (
    <div className="mt-2 flex gap-1.5" role="group" aria-label="Tipo de alimento" data-kind-filter>
      {(['todos', 'generico', 'marca'] as const).map((k) => (
        <button
          key={k}
          type="button"
          aria-pressed={value === k}
          onClick={() => onChange(k)}
          className={cx('press h-8 rounded-full px-3 text-[13px] font-semibold', value === k ? 'bg-ink text-surface' : 'bg-surface2 text-ink2')}
        >
          {k === 'todos' ? 'Todo' : k === 'generico' ? 'Genéricos' : 'Marcas'}
        </button>
      ))}
    </div>
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
    openfoodfacts: 'Fuente: etiqueta del fabricante recogida en Open Food Facts (ODbL). Puede contener errores; compruébala con el envase.',
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
      Alimentos genéricos de BEDCA (AESAN) y USDA; productos de marca con los datos de su etiqueta (Open Food Facts).
    </p>
  );
}
