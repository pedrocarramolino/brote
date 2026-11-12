import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ChevronLeft, Clock, PencilLine, Search, ShieldCheck, Shuffle } from 'lucide-react';
import type { PlannedMeal } from '../../types';
import { Sheet } from '../../components/ui/Sheet';
import { Badge, Button, Chip, Segmented, TextField, cx } from '../../components/ui/primitives';
import { useData } from '../../store/AppStore';
import { findAlternatives, type Alternative } from '../../services/substitutions';
import { getFood, SLOT_META } from '../../services/catalog';
import { n0, normalize } from '../../lib/format';
import { surpriseRecipe } from '../../services/planner';
import { recipeNutrition } from '../../services/nutrition';
import { CATEGORY_META, recipeMatches, recipeTitle } from '../../services/recipeMeta';
import { MacroInline, RecipeCover } from './RecipeBits';
import { useMealActions } from './useMealActions';

function Delta({ v, unit, invert = false }: { v: number; unit: string; invert?: boolean }) {
  const r = Math.round(v);
  if (r === 0) return <span className="text-ink3">= {unit}</span>;
  const good = invert ? r < 0 : r > 0;
  return <span className={cx('tabular font-semibold', good ? 'text-accent-deep' : 'text-ink2')}>{r > 0 ? '+' : '−'}{n0(Math.abs(r))} {unit}</span>;
}

/**
 * Selección de alternativas. El menú NO se modifica hasta pulsar «Confirmar cambio».
 */
export function SwapSheet({ meal, open, onClose }: { meal: PlannedMeal | null; open: boolean; onClose: () => void }) {
  const data = useData();
  const { swap } = useMealActions();
  const [selected, setSelected] = useState<Alternative | null>(null);
  const [freeMode, setFreeMode] = useState(false);
  const [freeName, setFreeName] = useState('');
  const [freeError, setFreeError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [scope, setScope] = useState<'slot' | 'all'>('slot');
  const [maxMin, setMaxMin] = useState<0 | 15 | 30>(0);
  const [shown, setShown] = useState(25);
  const [surprised, setSurprised] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      setSelected(null);
      setFreeMode(false);
      setFreeName('');
      setFreeError(null);
      setQ('');
      setScope('slot');
      setMaxMin(0);
      setShown(25);
      setSurprised(new Set());
    }
  }, [open, meal?.id]);

  const result = useMemo(() => (meal ? findAlternatives(data, meal, 1000, { anySlot: scope === 'all' }) : null), [data, meal, scope]);
  const filtered = useMemo(() => {
    if (!result) return [];
    const nq = normalize(q.trim());
    return result.alternatives.filter((a) => {
      if (maxMin && a.recipe.minutes > maxMin) return false;
      return recipeMatches(data, a.recipe, nq, normalize);
    });
  }, [result, q, maxMin, data]);
  if (!meal || !result) return null;
  const { original, excludedCount } = result;
  const alternatives = filtered;

  const surprise = () => {
    const r = surpriseRecipe(data, meal, { anySlot: scope === 'all', exclude: surprised });
    if (!r) return;
    setSurprised((s) => new Set(s).add(r.id));
    const macros = recipeNutrition(data, r, meal.portion).macros;
    const om = original.macros;
    setSelected({
      recipe: r,
      macros,
      score: 0,
      reasons: ['Sorpréndeme'],
      delta: om ? { kcal: macros.kcal - om.kcal, protein: macros.protein - om.protein, carbs: macros.carbs - om.carbs, fat: macros.fat - om.fat } : null,
    });
  };

  const confirm = () => {
    if (freeMode) {
      const name = freeName.trim();
      if (name.length < 2) {
        setFreeError('Escribe el nombre del plato (mínimo 2 caracteres).');
        return;
      }
      swap(meal, { customName: name });
    } else if (selected) {
      swap(meal, { recipeId: selected.recipe.id }, selected.reasons.includes('Sorpréndeme') ? 'sorpresa' : 'manual');
    }
    onClose();
  };

  const title = selected ? 'Revisar cambio' : freeMode ? 'Plato libre' : 'Cambiar plato';

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      size="lg"
      subtitle={`${SLOT_META[meal.slot].label} · sustituye a ${original.recipe ? recipeTitle(original.recipe) : meal.customName ?? 'plato sin receta'}`}
      footer={
        selected || freeMode ? (
          <div className="flex gap-2">
            <Button variant="secondary" icon={<ChevronLeft size={18} />} onClick={() => { setSelected(null); setFreeMode(false); }}>
              Volver
            </Button>
            {selected?.reasons.includes('Sorpréndeme') && (
              <Button variant="secondary" icon={<Shuffle size={18} />} onClick={surprise} aria-label="Otra sorpresa">
                <span className="hidden xs:inline">Otra</span>
              </Button>
            )}
            <Button className="flex-1" onClick={confirm} data-confirm-swap>Confirmar cambio</Button>
          </div>
        ) : undefined
      }
    >
      {!selected && !freeMode && (
        <>
          <div className="mb-4 flex items-start gap-2 rounded-[14px] bg-accentSoft/70 px-3.5 py-2.5 text-[13px] leading-snug text-accent-deep">
            <ShieldCheck size={18} className="mt-[1px] shrink-0" />
            <span>
              Alternativas que respetan tus alergias, tu tipo de alimentación y los alimentos que no te gustan, ordenadas por parecido nutricional, tiempo de preparación e ingredientes que ya tienes en la semana.
              {excludedCount > 0 && ` ${excludedCount} receta(s) descartadas por tus preferencias.`}
            </span>
          </div>

          <div className="mb-3 space-y-2.5">
            <div className="flex gap-2">
              <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-[12px] bg-surface2 px-3 focus-within:ring-2 focus-within:ring-accent">
                <Search size={18} className="shrink-0 text-ink3" aria-hidden="true" />
                <span className="sr-only">Buscar por nombre o ingrediente</span>
                <input type="search" value={q} onChange={(e) => { setQ(e.target.value); setShown(25); }} placeholder="Nombre o ingrediente" className="h-full w-full min-w-0 bg-transparent text-[16px] placeholder:text-ink3 focus:outline-none" data-swap-search />
              </label>
              <Button variant="tinted" icon={<Shuffle size={18} />} onClick={surprise} data-surprise>
                <span className="hidden xs:inline">Sorpréndeme</span>
              </Button>
            </div>
            <Segmented
              label="Qué recetas mostrar"
              value={scope}
              onChange={(v) => { setScope(v); setShown(25); }}
              options={[{ value: 'slot', label: SLOT_META[meal.slot].label }, { value: 'all', label: 'Todas las recetas' }]}
            />
            <div className="flex flex-wrap gap-2">
              {([0, 15, 30] as const).map((m) => (
                <Chip key={m} selected={maxMin === m} onClick={() => { setMaxMin(m); setShown(25); }}>{m === 0 ? 'Cualquier tiempo' : `≤ ${m} min`}</Chip>
              ))}
            </div>
            <p className="tabular text-[13px] text-ink3" data-swap-count>{alternatives.length} {alternatives.length === 1 ? 'receta' : 'recetas'}</p>
          </div>

          {alternatives.length === 0 ? (
            <p className="py-8 text-center text-[15px] text-ink2">No hay recetas compatibles con estos filtros. Prueba con «Todas las recetas» o añade un plato libre.</p>
          ) : (
            <ul className="space-y-2">
              {alternatives.slice(0, shown).map((a) => (
                <li key={a.recipe.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(a)}
                    className="press flex w-full items-center gap-3 rounded-[16px] bg-surface p-3 text-left ring-1 ring-line/70 hover:bg-surface2/60"
                  >
                    <RecipeCover recipe={a.recipe} size={56} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[16px] font-semibold leading-snug">{recipeTitle(a.recipe)}</span>
                      <span className="block truncate text-[12px] text-ink3">
                        {scope === 'all' && `${CATEGORY_META[a.recipe.category].label} · `}
                        {a.recipe.title ? a.recipe.name : a.recipe.ingredients.slice(0, 4).map((i) => getFood(data, i.foodId)?.name.toLowerCase()).join(', ')}
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px]">
                        <span className="tabular text-ink2">{n0(a.macros.kcal)} kcal</span>
                        {a.delta && <Delta v={a.delta.kcal} unit="kcal" />}
                        {a.delta && <span className="text-ink3">prot. <Delta v={a.delta.protein} unit="g" /></span>}
                        <span className="inline-flex items-center gap-1 text-ink3"><Clock size={13} />{a.recipe.minutes} min</span>
                      </span>
                      {a.reasons.length > 0 && (
                        <span className="mt-1.5 flex flex-wrap gap-1">
                          {a.reasons.slice(0, 3).map((r) => (
                            <Badge key={r} tone={r.startsWith('Requiere') ? 'warn' : 'accent'}>{r}</Badge>
                          ))}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {alternatives.length > shown && (
            <Button variant="secondary" className="mt-3 w-full" onClick={() => setShown((n) => n + 25)}>
              Ver más ({alternatives.length - shown})
            </Button>
          )}

          <button
            type="button"
            onClick={() => setFreeMode(true)}
            className="press mt-3 flex w-full items-center gap-3 rounded-[16px] border border-dashed border-line p-3 text-left hover:bg-surface2/60"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-[14px] bg-surface2 text-ink2"><PencilLine size={22} /></span>
            <span>
              <span className="block text-[16px] font-semibold">Otro plato</span>
              <span className="block text-[13px] text-ink2">Escribe lo que vas a comer. No tendrá valores nutricionales verificados.</span>
            </span>
          </button>
        </>
      )}

      {selected && (
        <div className="anim-fade">
          <div className="mb-4 flex items-center gap-3">
            <RecipeCover recipe={selected.recipe} size={72} />
            <div className="min-w-0">
              {selected.reasons.includes('Sorpréndeme') && <p className="text-[12px] font-semibold uppercase tracking-wide text-accent">Sorpréndeme</p>}
              <h3 className="text-[18px] font-bold leading-snug">{recipeTitle(selected.recipe)}</h3>
              {selected.recipe.title && <p className="text-[14px] leading-snug text-ink2">{selected.recipe.name}</p>}
              <p className="text-[13px] text-ink3">{selected.recipe.minutes} min · {selected.recipe.ingredients.length} ingredientes</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-[16px] ring-1 ring-line/70">
            <table className="w-full text-[14px]">
              <thead className="bg-surface2 text-[12px] uppercase tracking-wide text-ink3">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Por ración</th>
                  <th className="px-3 py-2 text-right font-semibold">Actual</th>
                  <th className="px-3 py-2 text-right font-semibold">Nuevo</th>
                  <th className="px-3 py-2 text-right font-semibold">Dif.</th>
                </tr>
              </thead>
              <tbody className="tabular divide-y divide-line/60">
                {([
                  ['Energía', 'kcal', 'kcal'],
                  ['Proteínas', 'protein', 'g'],
                  ['Hidratos', 'carbs', 'g'],
                  ['Grasas', 'fat', 'g'],
                ] as const).map(([label, k, u]) => (
                  <tr key={k}>
                    <td className="px-3 py-2 font-medium">{label}</td>
                    <td className="px-3 py-2 text-right text-ink2">{original.macros ? `${n0(original.macros[k])} ${u}` : '—'}</td>
                    <td className="px-3 py-2 text-right font-semibold">{n0(selected.macros[k])} {u}</td>
                    <td className="px-3 py-2 text-right">{selected.delta ? <Delta v={selected.delta[k]} unit={u} /> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!original.macros && <p className="mt-2 text-[13px] text-ink3">El plato actual no tiene valores verificados, así que no se puede comparar.</p>}

          <h4 className="mb-2 mt-5 text-[15px] font-bold">Ingredientes</h4>
          <ul className="flex flex-wrap gap-1.5">
            {selected.recipe.ingredients.map((i) => (
              <li key={i.foodId} className="rounded-full bg-surface2 px-3 py-1 text-[14px]">
                {getFood(data, i.foodId)?.name} <span className="tabular text-ink3">{n0(i.amount * meal.portion)} {getFood(data, i.foodId)?.unit}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[13px] text-ink3">Al confirmar se actualizarán el menú, los totales del día y la lista de la compra de esta semana.</p>
          <div className="mt-3"><MacroInline m={selected.macros} /></div>
        </div>
      )}

      {freeMode && (
        <div className="anim-fade">
          <TextField
            label="¿Qué vas a comer?"
            placeholder="Por ejemplo: menú del día en el trabajo"
            value={freeName}
            onChange={(e) => { setFreeName(e.target.value); setFreeError(null); }}
            error={freeError}
            maxLength={80}
            data-autofocus
            onKeyDown={(e) => e.key === 'Enter' && confirm()}
          />
          <div className="mt-4 flex items-start gap-2 rounded-[14px] bg-warnSoft px-3.5 py-2.5 text-[13px] leading-snug text-warn">
            <AlertTriangle size={18} className="mt-[1px] shrink-0" />
            Este plato no tiene valores nutricionales verificados: no se sumará a tus totales ni a la lista de la compra. Si quieres contabilizarlo, registra sus alimentos desde «Añadir alimento».
          </div>
        </div>
      )}
    </Sheet>
  );
}
