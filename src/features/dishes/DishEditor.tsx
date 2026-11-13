import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Camera, ChevronDown, ChevronLeft, ImageOff, Minus, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import type { Food, QtyUnit, Recipe } from '../../types';
import { Sheet } from '../../components/ui/Sheet';
import { Button, Chip, IconButton, Stepper, TextField, cx } from '../../components/ui/primitives';
import { useFeedback } from '../../components/ui/Feedback';
import { useData, useStore } from '../../store/AppStore';
import { getFood } from '../../services/catalog';
import { nextQty } from '../meals/QuantityEditor';
import { todayISO } from '../../lib/dates';
import { n0, n1, parseDecimal, uid } from '../../lib/format';
import {
  allowedUnits, compressPhoto, defaultQuantity, dishNutrition, DISH_CATEGORIES, draftFromRecipe, emptyDraft, saveDish, toBaseAmount, UNIT_LABEL, unitSize, validateDraft, type DishDraft,
} from '../../services/dishes';
import { QUALITY_TEXT } from '../../services/recipeMeta';
import { FoodRow, FoodSourcesNote } from '../log/LogFoodSheet';
import { CustomFoodForm } from '../log/CustomFoodForm';
import { useFoodSearch } from '../log/useFoodSearch';

/**
 * «Crear mi plato»: nombre, ingredientes con cantidad y unidad, raciones y resumen
 * nutricional en tiempo real. Sirve también para editar un plato guardado.
 */
export function DishEditor({ open, onClose, recipe, onSaved, initialName }: {
  open: boolean;
  onClose: () => void;
  recipe?: Recipe | null;
  onSaved?: (id: string) => void;
  /** nombre propuesto al crear un plato nuevo (p. ej. lo escrito en el buscador) */
  initialName?: string;
}) {
  const data = useData();
  const { mutate } = useStore();
  const { toast, confirm } = useFeedback();
  const [draft, setDraft] = useState<DishDraft>(emptyDraft);
  const [initial, setInitial] = useState('');
  const [view, setView] = useState<'form' | 'pick' | 'newfood'>('form');
  const [replacing, setReplacing] = useState<number | null>(null);
  const [qtyText, setQtyText] = useState<string[]>([]);
  const [more, setMore] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const d = recipe ? draftFromRecipe(recipe) : { ...emptyDraft(), name: initialName?.slice(0, 80) ?? '' };
    setDraft(d);
    setQtyText(d.items.map((i) => fmt(i.quantity)));
    setInitial(JSON.stringify(d));
    setView('form');
    setReplacing(null);
    setMore(!!(recipe && (recipe.description || recipe.imageUrl || recipe.steps.length || recipe.minutes)));
    setShowErrors(false);
    setPhotoError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, recipe?.id]);

  const nutrition = useMemo(() => dishNutrition(data, draft.items, draft.servings), [data, draft.items, draft.servings]);
  const errors = validateDraft(data, draft);
  const dirty = JSON.stringify(draft) !== initial;
  const set = <K extends keyof DishDraft>(k: K, v: DishDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const close = async () => {
    if (view !== 'form') return setView('form');
    if (dirty && !(await confirm({ title: 'Descartar cambios', message: 'Tienes cambios sin guardar en este plato.', confirmLabel: 'Descartar', destructive: true }))) return;
    onClose();
  };

  const pickFood = (food: Food) => {
    if (replacing !== null) {
      // sustituir: se conserva la cantidad si la unidad sigue siendo válida para el nuevo alimento
      const old = draft.items[replacing];
      const keep = allowedUnits(food).includes(old.unit);
      const next = keep ? { foodId: food.id, quantity: old.quantity, unit: old.unit } : { foodId: food.id, ...defaultQuantity(food) };
      setDraft((d) => ({ ...d, items: d.items.map((x, i) => (i === replacing ? next : x)) }));
      setQtyText((t) => t.map((x, i) => (i === replacing ? fmt(next.quantity) : x)));
    } else {
      const q = defaultQuantity(food);
      setDraft((d) => ({ ...d, items: [...d.items, { foodId: food.id, ...q }] }));
      setQtyText((t) => [...t, fmt(q.quantity)]);
    }
    setReplacing(null);
    setView('form');
  };

  const setQty = (idx: number, text: string) => {
    setQtyText((t) => t.map((x, i) => (i === idx ? text : x)));
    const v = parseDecimal(text);
    setDraft((d) => ({ ...d, items: d.items.map((x, i) => (i === idx ? { ...x, quantity: Number.isFinite(v) ? v : 0 } : x)) }));
  };
  /** Cambiar de unidad conserva la cantidad real: 2 kiwis → 150 g (si hay equivalencia en la base). */
  const setUnit = (idx: number, unit: QtyUnit) => {
    const it = draft.items[idx];
    const food = it && getFood(data, it.foodId);
    const base = food ? toBaseAmount(food, it.quantity, it.unit) : null;
    const per = food ? toBaseAmount(food, 1, unit) : null;
    const q = base !== null && per ? Math.round((base / per) * 100) / 100 : it?.quantity ?? 0;
    setDraft((d) => ({ ...d, items: d.items.map((x, i) => (i === idx ? { ...x, unit, quantity: q } : x)) }));
    setQtyText((t) => t.map((x, i) => (i === idx ? fmt(q) : x)));
  };
  /** − / +: los mismos pasos que en el registro (ver nextQty). */
  const bump = (idx: number, dir: 1 | -1) => {
    const it = draft.items[idx];
    if (!it) return;
    const next = nextQty(it.quantity > 0 ? it.quantity : 0, it.unit, dir);
    if (next === null) return;
    setQty(idx, fmt(next));
  };
  const remove = (idx: number) => {
    setDraft((d) => ({ ...d, items: d.items.filter((_, i) => i !== idx) }));
    setQtyText((t) => t.filter((_, i) => i !== idx));
  };

  const onPhoto = async (file?: File) => {
    if (!file) return;
    setPhotoError(null);
    try {
      set('imageUrl', await compressPhoto(file));
    } catch (e) {
      setPhotoError((e as Error).message);
    }
  };

  const save = () => {
    if (errors.length) {
      setShowErrors(true);
      return;
    }
    const d = { ...draft, id: draft.id ?? uid('dish') };
    const editing = !!draft.id;
    mutate((x) => void saveDish(x, d, todayISO()));
    toast(editing ? 'Plato actualizado' : `«${d.name.trim()}» guardado en Mis platos`);
    onSaved?.(d.id);
    onClose();
  };

  const missingNames = nutrition.missing.map((r) => r.food?.name ?? 'Alimento desconocido');

  return (
    <Sheet
      open={open}
      onClose={close}
      size="lg"
      title={view === 'pick' ? (replacing !== null ? 'Sustituir ingrediente' : 'Añadir ingrediente') : view === 'newfood' ? 'Nuevo alimento' : recipe ? 'Editar plato' : 'Crear mi plato'}
      subtitle={view === 'form' ? 'Ingredientes y cantidades del plato completo' : undefined}
      footer={
        view === 'form' ? (
          <div>
            <p className="tabular mb-2 text-center text-[13px] text-ink2" data-dish-footer>
              {draft.items.length ? (
                <>
                  <span className="font-semibold text-ink">{n0(nutrition.total.kcal)} kcal</span> en total · <span className="font-semibold text-ink">{n0(nutrition.perServing.kcal)} kcal</span> por ración
                  {nutrition.missing.length > 0 && <span className="text-warn"> · incompleto</span>}
                </>
              ) : (
                'Añade ingredientes para ver las calorías'
              )}
            </p>
            {showErrors && errors.length > 0 && <p className="mb-2 text-center text-[13px] font-medium text-danger" role="alert">{errors[0]}</p>}
            <Button className="w-full" onClick={save} data-save-dish>Guardar plato</Button>
          </div>
        ) : undefined
      }
    >
      {view === 'pick' && <IngredientPicker onPick={pickFood} onCreate={() => setView('newfood')} onBack={() => { setReplacing(null); setView('form'); }} />}
      {view === 'newfood' && <CustomFoodForm onCancel={() => setView('pick')} onSaved={pickFood} />}

      {view === 'form' && (
        <div className="anim-fade space-y-5">
          <div>
            <TextField
              label="Nombre del plato"
              value={draft.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Por ejemplo: mi arroz especial"
              maxLength={80}
              error={showErrors && draft.name.trim().length < 2 ? 'Escribe un nombre para el plato.' : undefined}
              data-dish-name
              {...(!recipe ? { 'data-autofocus': true } : {})}
            />
            <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1" data-no-swipe>
              {DISH_CATEGORIES.map((c) => (
                <Chip key={c.value} selected={draft.category === c.value} onClick={() => set('category', c.value)}>{c.label}</Chip>
              ))}
            </div>
          </div>

          {/* Ingredientes */}
          <section aria-labelledby="dish-ings">
            <div className="mb-2 flex items-baseline justify-between">
              <h3 id="dish-ings" className="text-[17px] font-bold">Ingredientes</h3>
              <span className="text-[13px] text-ink3">{draft.items.length ? `${draft.items.length} · plato completo` : ''}</span>
            </div>
            {draft.items.length > 0 && (
              <ul className="divide-y divide-line/60 overflow-hidden rounded-[16px] bg-surface2/60 ring-1 ring-line/60" data-dish-ingredients>
                {draft.items.map((it, idx) => {
                  const row = nutrition.rows[idx];
                  const food = row?.food;
                  const units = food ? allowedUnits(food) : [it.unit];
                  const bad = !row?.macros;
                  const u = food ? unitSize(food) : null;
                  return (
                    <li key={idx} className="px-3 py-2.5" data-dish-row={it.foodId}>
                      <div className="flex items-start gap-2">
                        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => { setReplacing(idx); setView('pick'); }} aria-label={`Sustituir ${food?.name ?? 'ingrediente'}`}>
                          <span className="block truncate text-[15px] font-semibold">{food?.name ?? 'Alimento no encontrado'}</span>
                          <span className="tabular block text-[12px] text-ink3">
                            {row?.macros ? `${n0(row.macros.kcal)} kcal · P ${n1(row.macros.protein)} · H ${n1(row.macros.carbs)} · G ${n1(row.macros.fat)}` : 'Sin calcular'}
                            {row?.base !== null && row?.base !== undefined && it.unit !== food?.unit ? ` · ${n0(row.base)} ${food?.unit}` : ''}
                          </span>
                        </button>
                        <IconButton label={`Quitar ${food?.name ?? 'ingrediente'}`} onClick={() => remove(idx)} className="!h-9 !w-9 text-ink3">
                          <Trash2 size={17} />
                        </IconButton>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <IconButton label={`Menos ${food?.name ?? ''}`} onClick={() => bump(idx, -1)} onPointerDown={(e) => e.preventDefault()} className="!w-9 bg-surface ring-1 ring-line/70" data-qty-minus>
                          <Minus size={16} />
                        </IconButton>
                        <label className={cx('flex h-11 w-[72px] items-center rounded-[10px] bg-surface px-2.5 ring-1', bad ? 'ring-warn' : 'ring-line/70', 'focus-within:ring-2 focus-within:ring-accent')}>
                          <span className="sr-only">Cantidad de {food?.name}</span>
                          <input
                            inputMode="decimal"
                            enterKeyHint="done"
                            value={qtyText[idx] ?? ''}
                            onChange={(e) => setQty(idx, e.target.value)}
                            className="tabular w-full bg-transparent text-center text-[17px] font-semibold focus:outline-none"
                            data-qty
                          />
                        </label>
                        <IconButton label={`Más ${food?.name ?? ''}`} onClick={() => bump(idx, 1)} onPointerDown={(e) => e.preventDefault()} className="!w-9 bg-surface ring-1 ring-line/70" data-qty-plus>
                          <Plus size={16} />
                        </IconButton>
                        <label className="relative">
                          <span className="sr-only">Unidad</span>
                          <select
                            value={it.unit}
                            onChange={(e) => setUnit(idx, e.target.value as QtyUnit)}
                            className="h-11 max-w-[128px] appearance-none rounded-[10px] bg-surface pl-3 pr-8 text-[15px] ring-1 ring-line/70"
                            data-unit
                          >
                            {units.map((x) => <option key={x} value={x}>{UNIT_LABEL[x].long}</option>)}
                          </select>
                          <ChevronDown size={16} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink3" />
                        </label>
                        <button type="button" onClick={() => { setReplacing(idx); setView('pick'); }} className="ml-auto inline-flex h-11 items-center gap-1 rounded-full px-2 text-[13px] font-semibold text-accent" aria-label="Sustituir ingrediente">
                          <RefreshCw size={15} /> <span className="hidden xs:inline">Cambiar</span>
                        </button>
                      </div>
                      {food && it.unit === 'unidad' && u && <p className="mt-1 text-[12px] text-ink3">1 unidad ≈ {n0(u)} {food.unit} ({food.portion?.label})</p>}
                      {food && bad && it.quantity > 0 && toBaseAmount(food, it.quantity, it.unit) === null && (
                        <p className="mt-1 text-[12px] text-warn">No hay una conversión fiable de {UNIT_LABEL[it.unit].long} para este alimento. Usa {UNIT_LABEL[food.unit].long}.</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            <Button variant="tinted" className="mt-2 w-full" icon={<Plus size={18} />} onClick={() => { setReplacing(null); setView('pick'); }} data-add-ingredient>
              Añadir ingrediente
            </Button>
          </section>

          {/* Raciones y resumen */}
          <section className="rounded-[18px] bg-surface2/70 p-4 ring-1 ring-line/60" aria-label="Resumen nutricional" data-dish-summary>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[15px] font-semibold">Raciones</p>
                <p className="text-[12px] text-ink3">Las cantidades del plato no cambian</p>
              </div>
              <Stepper label="raciones" value={draft.servings} min={1} max={50} step={1} onChange={(v) => set('servings', v)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Totals title="Plato completo" kcal={nutrition.total.kcal} p={nutrition.total.protein} c={nutrition.total.carbs} f={nutrition.total.fat} fiber={nutrition.fiberTotal} fiberOk={nutrition.fiberComplete} data="total" />
              <Totals title={`Por ración (1 de ${draft.servings})`} kcal={nutrition.perServing.kcal} p={nutrition.perServing.protein} c={nutrition.perServing.carbs} f={nutrition.perServing.fat} fiber={nutrition.fiberPerServing} fiberOk={nutrition.fiberComplete} data="serving" accent />
            </div>
            {nutrition.missing.length > 0 ? (
              <p className="mt-3 flex items-start gap-1.5 text-[12px] leading-snug text-warn" data-dish-incomplete>
                <AlertTriangle size={14} className="mt-[1px] shrink-0" />
                Resultado incompleto: no se ha podido sumar {missingNames.join(', ')} (sin cantidad válida o sin datos). No lo tomes como exacto.
              </p>
            ) : draft.items.length > 0 ? (
              <p className="mt-3 text-[12px] leading-snug text-ink3">
                <strong className="font-semibold text-ink2">{QUALITY_TEXT[nutrition.quality].label}.</strong> Suma de cada ingrediente según su cantidad y sus valores por 100 g/ml.
              </p>
            ) : null}
          </section>

          {/* Detalles opcionales */}
          <section>
            <button type="button" onClick={() => setMore((v) => !v)} className="flex w-full items-center justify-between py-1 text-left text-[15px] font-semibold" aria-expanded={more}>
              Foto, descripción y preparación <span className="text-[13px] font-normal text-ink3">opcional <ChevronDown size={16} className={cx('inline transition-transform', more && 'rotate-180')} /></span>
            </button>
            {more && (
              <div className="anim-fade mt-3 space-y-4">
                <div className="flex items-center gap-3">
                  {draft.imageUrl ? (
                    <img src={draft.imageUrl} alt="Foto del plato" className="h-20 w-20 rounded-[14px] object-cover" />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-[14px] bg-surface2 text-ink3"><Camera size={24} /></div>
                  )}
                  <div className="flex flex-col gap-1.5">
                    <Button size="sm" variant="secondary" icon={<Camera size={16} />} onClick={() => fileRef.current?.click()}>{draft.imageUrl ? 'Cambiar foto' : 'Añadir foto'}</Button>
                    {draft.imageUrl && <Button size="sm" variant="secondary" icon={<ImageOff size={16} />} onClick={() => set('imageUrl', undefined)}>Quitar</Button>}
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { void onPhoto(e.target.files?.[0]); e.target.value = ''; }} data-dish-photo />
                </div>
                {photoError && <p className="text-[13px] text-danger">{photoError}</p>}
                <TextField label="Descripción" value={draft.description} onChange={(e) => set('description', e.target.value)} placeholder="Opcional" maxLength={160} />
                <TextField
                  label="Tiempo de preparación"
                  inputMode="numeric"
                  suffix="min"
                  value={draft.minutes ? String(draft.minutes) : ''}
                  onChange={(e) => { const v = parseDecimal(e.target.value); set('minutes', Number.isFinite(v) && v > 0 ? Math.min(600, v) : null); }}
                  placeholder="Opcional"
                />
                <label className="block">
                  <span className="mb-1.5 block text-[14px] font-semibold text-ink2">Preparación <span className="font-normal text-ink3">(un paso por línea)</span></span>
                  <textarea
                    value={draft.steps}
                    onChange={(e) => set('steps', e.target.value)}
                    rows={4}
                    maxLength={2000}
                    placeholder={'Cuece el arroz.\nSaltea el pollo…'}
                    className="w-full rounded-[12px] bg-surface2 px-3 py-2.5 text-[16px] placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </label>
              </div>
            )}
          </section>
        </div>
      )}
    </Sheet>
  );
}

function Totals({ title, kcal, p, c, f, fiber, fiberOk, accent, data }: { title: string; kcal: number; p: number; c: number; f: number; fiber: number; fiberOk: boolean; accent?: boolean; data: string }) {
  return (
    <div className={cx('rounded-[14px] px-3 py-2.5', accent ? 'bg-accentSoft/70' : 'bg-surface')} data-totals={data}>
      <p className="text-[12px] font-semibold text-ink2">{title}</p>
      <p className="tabular text-[24px] font-bold leading-tight" data-kcal>{n0(kcal)}<span className="ml-1 text-[13px] font-semibold text-ink3">kcal</span></p>
      <p className="tabular mt-0.5 text-[12px] leading-snug">
        <span className="text-protein">P {n1(p)}</span> · <span className="text-carbs">H {n1(c)}</span> · <span className="text-fat">G {n1(f)}</span>
      </p>
      <p className="tabular text-[12px] text-ink3">Fibra {n1(fiber)} g{fiberOk ? '' : '*'}</p>
    </div>
  );
}

const fmt = (v: number) => String(Math.round(v * 100) / 100).replace('.', ',');

/** Buscador de ingredientes del creador de platos. */
function IngredientPicker({ onPick, onCreate, onBack }: { onPick: (f: Food) => void; onCreate: () => void; onBack: () => void }) {
  const data = useData();
  const [q, setQ] = useState('');
  const { local: list } = useFoodSearch(data, q);
  return (
    <div className="anim-fade">
      <div className="sticky top-0 z-10 -mx-5 bg-surface px-5 pb-3">
        <div className="flex gap-2">
          <IconButton label="Volver al plato" variant="secondary" onClick={onBack}><ChevronLeft size={20} /></IconButton>
          <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-[12px] bg-surface2 px-3 focus-within:ring-2 focus-within:ring-accent">
            <Search size={18} className="text-ink3" aria-hidden="true" />
            <span className="sr-only">Buscar alimento</span>
            <input data-autofocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Leche, queso, pollo…" className="h-full w-full bg-transparent text-[17px] placeholder:text-ink3 focus:outline-none" type="search" enterKeyHint="search" data-ingredient-search />
          </label>
        </div>
      </div>
      <button type="button" onClick={onCreate} className="press mb-2 flex w-full items-center gap-2 rounded-[14px] bg-surface2 px-3 py-3 text-left text-[14px] font-semibold">
        <Plus size={18} className="text-accent" /> ¿No está? Crea el alimento con sus valores por 100 g
      </button>
      {list.length === 0 ? (
        <p className="py-6 text-center text-[15px] text-ink2">Sin resultados en la base de alimentos. Puedes crearlo con los datos de la etiqueta.</p>
      ) : (
        <ul className="divide-y divide-line/60" data-ingredient-results>
          {list.map((f) => <FoodRow key={f.id} food={f} onClick={() => onPick(f)} />)}
        </ul>
      )}
      <FoodSourcesNote />
    </div>
  );
}
