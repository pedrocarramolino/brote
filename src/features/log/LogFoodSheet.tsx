import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, ChevronLeft, ChevronRight, Globe, Heart, Plus, RotateCw, Search, Trash2 } from 'lucide-react';
import type { Food, FoodLogEntry, ISODate, MealSlot } from '../../types';
import { Sheet } from '../../components/ui/Sheet';
import { Badge, Button, IconButton, Segmented, SelectField, TextField, cx } from '../../components/ui/primitives';
import { useData, useStore } from '../../store/AppStore';
import { getFood, SLOT_META, slotsOrdered } from '../../services/catalog';
import { foodMacros } from '../../services/nutrition';
import { openFoodFactsProvider, searchLocal, SOURCE_LABEL } from '../../services/foodDatabase';
import { n0, parseDecimal } from '../../lib/format';
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
}

type Tab = 'buscar' | 'favoritos' | 'recientes';

export function LogFoodSheet({ open, onClose, date, slot: initialSlot, editEntry, onOpenPhoto }: Props) {
  const data = useData();
  const { mutate } = useStore();
  const { addLog, updateLog, removeLog } = useMealActions();

  const [view, setView] = useState<'list' | 'amount' | 'custom'>('list');
  const [tab, setTab] = useState<Tab>('buscar');
  const [query, setQuery] = useState('');
  const [food, setFood] = useState<Food | null>(null);
  const [amountText, setAmountText] = useState('100');
  const [slot, setSlot] = useState<MealSlot>(initialSlot);
  const [amountError, setAmountError] = useState<string | null>(null);

  // Open Food Facts (opcional)
  const [offState, setOffState] = useState<{ status: 'idle' | 'loading' | 'error' | 'done'; items: Food[]; error?: string }>({ status: 'idle', items: [] });
  const [offTick, setOffTick] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) return;
    setSlot(initialSlot);
    setQuery('');
    setTab('buscar');
    setOffState({ status: 'idle', items: [] });
    if (editEntry) {
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
  }, [open, editEntry?.id]);

  const local = useMemo(() => searchLocal(data, query).slice(0, 40), [data, query]);
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

  useEffect(() => {
    if (!open || !data.profile.useOpenFoodFacts || tab !== 'buscar') return;
    const q = query.trim();
    if (q.length < 3) {
      setOffState({ status: 'idle', items: [] });
      return;
    }
    const t = setTimeout(() => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setOffState({ status: 'loading', items: [] });
      openFoodFactsProvider
        .search(q, ac.signal)
        .then((items) => setOffState({ status: 'done', items }))
        .catch((e: Error) => {
          if (e.name === 'AbortError') return;
          setOffState({ status: 'error', items: [], error: 'No se ha podido consultar Open Food Facts. Comprueba la conexión e inténtalo de nuevo.' });
        });
    }, 450);
    return () => clearTimeout(t);
  }, [query, open, tab, data.profile.useOpenFoodFacts, offTick]);

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
      title={editEntry ? 'Editar registro' : view === 'custom' ? 'Alimento personalizado' : 'Añadir alimento'}
      subtitle={`${relativeDayLabel(date)} · ${SLOT_META[slot].label}`}
      footer={
        view === 'amount' && food ? (
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
              options={[{ value: 'buscar', label: 'Todos' }, { value: 'favoritos', label: 'Favoritos' }, { value: 'recientes', label: 'Recientes' }]}
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
          </div>

          {list.length === 0 ? (
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
                  <Button size="sm" variant="secondary" icon={<RotateCw size={15} />} onClick={() => setOffTick((t) => t + 1)}>Reintentar</Button>
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
          {tab === 'buscar' && !data.profile.useOpenFoodFacts && (
            <p className="mt-4 text-[12px] text-ink3">Puedes activar la búsqueda en Open Food Facts (productos de supermercado) en Perfil › Privacidad y datos.</p>
          )}
        </div>
      )}

      {view === 'amount' && food && (
        <div className="anim-fade">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-[19px] font-bold leading-snug">{food.name}</h3>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <Badge tone={food.source === 'estimacion' ? 'warn' : 'neutral'}>{SOURCE_LABEL[food.source]}</Badge>
                {food.brand && <Badge>{food.brand}</Badge>}
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
          {food.source === 'openfoodfacts' && <p className="mt-2 text-[12px] text-ink3">Datos declarados por el fabricante en Open Food Facts; pueden contener errores.</p>}
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

function FoodRow({ food, onClick }: { food: Food; onClick: () => void }) {
  return (
    <li>
      <button type="button" onClick={onClick} className="flex min-h-[56px] w-full items-center gap-3 py-2 text-left hover:bg-surface2/50">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[16px] font-medium">{food.name}</span>
          <span className="tabular block text-[13px] text-ink3">
            {n0(food.per100.kcal)} kcal · P {n0(food.per100.protein)} · H {n0(food.per100.carbs)} · G {n0(food.per100.fat)} <span className="text-ink3">/100 {food.unit}</span>
            {food.brand ? ` · ${food.brand}` : ''}
            {food.source === 'usuario' ? ' · Tuyo' : ''}
          </span>
        </span>
        <ChevronRight size={18} className="text-ink3" aria-hidden="true" />
      </button>
    </li>
  );
}
