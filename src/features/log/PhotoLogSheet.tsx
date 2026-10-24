import { useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus, Info, RotateCw, Sparkles, X } from 'lucide-react';
import type { Food, ISODate, MealSlot } from '../../types';
import { Sheet } from '../../components/ui/Sheet';
import { Badge, Button, IconButton, cx } from '../../components/ui/primitives';
import { useData, useStore } from '../../store/AppStore';
import { useFeedback } from '../../components/ui/Feedback';
import { useAI } from '../../hooks/useAI';
import { AIError } from '../../services/ai';
import { allFoods, allRecipes, getFood, SLOT_META } from '../../services/catalog';
import { foodMacros } from '../../services/nutrition';
import { n0, normalize, parseDecimal, uid } from '../../lib/format';
import { relativeDayLabel } from '../../lib/dates';
import { useMealActions } from '../meals/useMealActions';

interface Suggestion {
  key: string;
  food: Food;
  amount: string;
  selected: boolean;
  origin: 'coincidencia' | 'ia';
}

/** Coincidencias por palabras clave (modo demostración). No es un análisis. */
function keywordMatches(text: string, foods: Food[], recipes: ReturnType<typeof allRecipes>, getF: (id: string) => Food | undefined): Food[] {
  const t = normalize(text);
  if (!t.trim()) return [];
  const found = new Map<string, Food>();
  for (const r of recipes) {
    const words = normalize(r.name).split(/\s+/).filter((w) => w.length > 4);
    if (words.length && words.filter((w) => t.includes(w)).length >= Math.min(2, words.length)) {
      r.ingredients.forEach((i) => {
        const f = getF(i.foodId);
        if (f) found.set(f.id, f);
      });
    }
  }
  for (const f of foods) {
    const stem = normalize(f.name).split(/[ (]/)[0];
    if (stem.length > 3 && t.includes(stem.slice(0, Math.max(4, stem.length - 1)))) found.set(f.id, f);
  }
  return [...found.values()].slice(0, 10);
}

async function downscale(file: File, max = 1024): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error('No se ha podido leer la imagen.'));
      i.src = url;
    });
    const k = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * k);
    c.height = Math.round(img.height * k);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function PhotoLogSheet({ open, onClose, date, slot }: { open: boolean; onClose: () => void; date: ISODate; slot: MealSlot }) {
  const data = useData();
  const { mutate } = useStore();
  const { toast } = useFeedback();
  const { addLog } = useMealActions();
  const { provider, status } = useAI();
  const fileRef = useRef<HTMLInputElement>(null);

  const [image, setImage] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [phase, setPhase] = useState<'input' | 'loading' | 'results' | 'error'>('input');
  const [error, setError] = useState<{ msg: string; retry: boolean } | null>(null);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [resultMode, setResultMode] = useState<'demo' | 'ia'>('demo');

  useEffect(() => {
    if (open) {
      setImage(null);
      setText('');
      setPhase('input');
      setItems([]);
      setError(null);
    }
  }, [open]);

  const isAI = status?.mode === 'ia' && !!provider?.analyzeMeal;

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      toast('El archivo no es una imagen', { tone: 'info' });
      return;
    }
    try {
      setImage(await downscale(f));
    } catch (e) {
      toast((e as Error).message, { tone: 'info' });
    }
  };

  const analyze = async () => {
    setError(null);
    if (!isAI) {
      const matches = keywordMatches(text, allFoods(data), allRecipes(data), (id) => getFood(data, id));
      setItems(matches.map((f) => ({ key: f.id, food: f, amount: String(f.portion?.amount ?? 100), selected: true, origin: 'coincidencia' })));
      setResultMode('demo');
      setPhase('results');
      return;
    }
    setPhase('loading');
    try {
      const est = await provider!.analyzeMeal!({ text, imageDataUrl: image ?? undefined });
      setItems(
        est.map((e) => {
          const g = Math.max(1, e.grams);
          const food: Food = {
            id: uid('est'),
            name: e.name,
            unit: 'g',
            per100: { kcal: (e.kcal / g) * 100, protein: (e.protein / g) * 100, carbs: (e.carbs / g) * 100, fat: (e.fat / g) * 100 },
            category: 'otros',
            source: 'estimacion',
            allergens: [],
          };
          return { key: food.id, food, amount: String(Math.round(g)), selected: true, origin: 'ia' as const };
        }),
      );
      setResultMode('ia');
      setPhase('results');
    } catch (e) {
      const err = e instanceof AIError ? e : new AIError('No se ha podido completar el análisis.', true);
      setError({ msg: err.message, retry: err.retryable });
      setPhase('error');
    }
  };

  const selected = items.filter((i) => i.selected && Number.isFinite(parseDecimal(i.amount)) && parseDecimal(i.amount) > 0);

  const addAll = () => {
    const estimates = selected.filter((s) => s.food.source === 'estimacion');
    if (estimates.length) mutate((d) => void d.customFoods.push(...estimates.map((s) => s.food)));
    selected.forEach((s) =>
      addLog({ date, slot, foodId: s.food.id, amount: parseDecimal(s.amount), method: resultMode === 'ia' ? (image ? 'foto-ia' : 'texto-ia') : image ? 'foto-demo' : 'texto-demo' }, true),
    );
    toast(`${selected.length} alimento${selected.length === 1 ? '' : 's'} añadido${selected.length === 1 ? '' : 's'}`);
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Registrar con foto o texto"
      subtitle={`${relativeDayLabel(date)} · ${SLOT_META[slot].label}`}
      footer={
        phase === 'results' ? (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setPhase('input')}>Volver</Button>
            <Button className="flex-1" disabled={!selected.length} onClick={addAll}>
              Añadir {selected.length || ''} alimento{selected.length === 1 ? '' : 's'}
            </Button>
          </div>
        ) : phase === 'input' ? (
          <Button size="lg" icon={<Sparkles size={18} />} onClick={analyze} disabled={!text.trim() && !image}>
            {isAI ? 'Analizar con IA' : 'Buscar coincidencias'}
          </Button>
        ) : undefined
      }
    >
      <div className={cx('mb-4 flex items-start gap-2 rounded-[14px] px-3.5 py-2.5 text-[13px] leading-snug', isAI ? 'bg-accentSoft text-accent-deep' : 'bg-warnSoft text-warn')}>
        <Info size={18} className="mt-[1px] shrink-0" />
        {status === null
          ? 'Comprobando el servicio de análisis…'
          : isAI
            ? 'La foto y la descripción se enviarán al servidor del asistente para obtener una estimación. Revisa y corrige las cantidades antes de guardar.'
            : 'Modo demostración: no hay un servicio de IA conectado, así que la foto no se analiza. Se buscarán alimentos cuyo nombre aparezca en tu descripción para que los confirmes tú.'}
      </div>

      {(phase === 'input' || phase === 'error') && (
        <div className="anim-fade space-y-4">
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          {image ? (
            <div className="relative overflow-hidden rounded-[18px]">
              <img src={image} alt="Foto de la comida seleccionada" className="max-h-64 w-full object-cover" />
              <IconButton label="Quitar foto" onClick={() => setImage(null)} className="absolute right-2 top-2 !bg-black/50 !text-white">
                <X size={18} />
              </IconButton>
              {!isAI && <span className="absolute bottom-2 left-2 rounded-full bg-black/55 px-2.5 py-1 text-[12px] font-semibold text-white">Foto no analizada (demo)</span>}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="press flex h-36 w-full flex-col items-center justify-center gap-2 rounded-[18px] border border-dashed border-line bg-surface2/50 text-ink2 hover:bg-surface2"
            >
              <span className="flex gap-2"><Camera size={24} /><ImagePlus size={24} /></span>
              <span className="text-[15px] font-semibold">Hacer o elegir una foto</span>
            </button>
          )}
          <div>
            <label htmlFor="meal-desc" className="mb-1.5 block text-[14px] font-semibold text-ink2">Describe lo que has comido</label>
            <textarea
              id="meal-desc"
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={400}
              placeholder="Por ejemplo: ensalada con pollo, tomate y aguacate, y un yogur"
              className="w-full resize-none rounded-[12px] bg-surface2 px-3.5 py-3 text-[17px] placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          {phase === 'error' && error && (
            <div className="flex items-center justify-between gap-3 rounded-[14px] bg-danger/10 px-3.5 py-2.5 text-[14px] text-danger">
              <span>{error.msg}</span>
              {error.retry && <Button size="sm" variant="secondary" icon={<RotateCw size={15} />} onClick={analyze}>Reintentar</Button>}
            </div>
          )}
        </div>
      )}

      {phase === 'loading' && (
        <div className="space-y-2 py-4" aria-live="polite">
          <p className="text-[15px] text-ink2">Analizando…</p>
          {[0, 1, 2].map((i) => <div key={i} className="anim-shimmer h-14 rounded-[14px] bg-surface2" />)}
        </div>
      )}

      {phase === 'results' && (
        <div className="anim-fade">
          {items.length === 0 ? (
            <p className="py-6 text-center text-[15px] text-ink2">
              No se han encontrado alimentos en la descripción. Escribe los ingredientes con más detalle o añádelos desde la búsqueda.
            </p>
          ) : (
            <>
              <p className="mb-2 text-[13px] text-ink3">
                {resultMode === 'ia' ? 'Estimación generada por IA: valores aproximados.' : 'Coincidencias por nombre en tu descripción. Ajusta las cantidades.'}
              </p>
              <ul className="space-y-2">
                {items.map((s, idx) => {
                  const amt = parseDecimal(s.amount);
                  const m = Number.isFinite(amt) ? foodMacros(s.food, amt) : null;
                  return (
                    <li key={s.key} className={cx('flex items-center gap-3 rounded-[14px] p-3 ring-1', s.selected ? 'bg-surface ring-accent/40' : 'bg-surface2/50 ring-line/60')}>
                      <input
                        type="checkbox"
                        checked={s.selected}
                        onChange={(e) => setItems((x) => x.map((y, i) => (i === idx ? { ...y, selected: e.target.checked } : y)))}
                        className="h-5 w-5 accent-[rgb(var(--accent))]"
                        aria-label={`Incluir ${s.food.name}`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-medium">{s.food.name}</span>
                        <span className="flex items-center gap-1.5 text-[12px] text-ink3">
                          {m ? `${n0(m.kcal)} kcal` : '—'}
                          <Badge tone={s.origin === 'ia' ? 'warn' : 'neutral'}>{s.origin === 'ia' ? 'Estimación IA' : 'Valor de referencia'}</Badge>
                        </span>
                      </span>
                      <label className="flex items-center gap-1 rounded-[10px] bg-surface2 px-2">
                        <span className="sr-only">Cantidad de {s.food.name}</span>
                        <input
                          inputMode="decimal"
                          value={s.amount}
                          onChange={(e) => setItems((x) => x.map((y, i) => (i === idx ? { ...y, amount: e.target.value } : y)))}
                          className="tabular h-10 w-14 bg-transparent text-right text-[15px] font-semibold focus:outline-none"
                        />
                        <span className="text-[13px] text-ink3">{s.food.unit}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      )}
    </Sheet>
  );
}
