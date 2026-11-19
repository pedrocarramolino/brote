import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChefHat, Clock, Search, ShieldCheck, Shuffle } from 'lucide-react';
import type { MealSlot, PlannedMeal, UserDishData } from '../../types';
import { Sheet } from '../../components/ui/Sheet';
import { Badge, Button, Chip, Segmented, cx } from '../../components/ui/primitives';
import { useData } from '../../store/AppStore';
import { findAlternatives, type Alternative } from '../../services/substitutions';
import { getFood, SLOT_META } from '../../services/catalog';
import { n0, normalize } from '../../lib/format';
import { surpriseRecipe } from '../../services/planner';
import { recipeNutrition } from '../../services/nutrition';
import { CATEGORY_META, recipeMatches, recipeSubtitle, recipeTitle } from '../../services/recipeMeta';
import { userDishes } from '../../services/dishes';
import { recipeFit } from '../../services/nutrition';
import { FreeMealCover, MacroInline, RecipeCover } from './RecipeBits';
import { useMealActions } from './useMealActions';
import { DishEditor } from '../dishes/DishEditor';

/** Categoría inicial del plato nuevo según la comida que se cambia. */
const CATEGORY_OF_SLOT: Record<MealSlot, UserDishData['category']> = { desayuno: 'desayuno', mediamanana: 'snack', comida: 'comida', merienda: 'merienda', cena: 'cena' };

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
  const { swap, setFree } = useMealActions();
  const [selected, setSelected] = useState<Alternative | null>(null);
  // creador de platos abierto desde aquí: al guardar, el plato nuevo pasa a esta comida
  const [creating, setCreating] = useState(false);
  const [q, setQ] = useState('');
  const [scope, setScope] = useState<'slot' | 'all' | 'mine'>('slot');
  const [maxMin, setMaxMin] = useState<0 | 15 | 30>(0);
  const [shown, setShown] = useState(25);
  const [surprised, setSurprised] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      setSelected(null);
      setCreating(false);
      setQ('');
      setScope('slot');
      setMaxMin(0);
      setShown(25);
      setSurprised(new Set());
    }
  }, [open, meal?.id]);

  const result = useMemo(() => {
    if (!meal) return null;
    const res = findAlternatives(data, meal, scope === 'mine' ? 0 : 1000, { anySlot: scope === 'all' });
    // Mis platos: todos los del usuario (avisando si alguno no encaja con el perfil). En «Comida»
    // y «Todas» también aparecen, para que un plato creado se encuentre al buscarlo.
    const om = res.original.macros;
    const seen = new Set(res.alternatives.map((a) => a.recipe.id));
    const mine = userDishes(data)
      .filter((r) => r.id !== meal.recipeId && !seen.has(r.id) && (scope !== 'slot' || r.slots.includes(meal.slot)))
      .map((r) => {
        const macros = recipeNutrition(data, r, meal.portion).macros;
        const fit = recipeFit(data, r, data.profile);
        return {
          recipe: r,
          macros,
          score: 0,
          reasons: fit.ok ? ['Mi plato'] : ['Mi plato', `Requiere revisar: ${fit.reasons[0].toLowerCase()}`],
          delta: om ? { kcal: macros.kcal - om.kcal, protein: macros.protein - om.protein, carbs: macros.carbs - om.carbs, fat: macros.fat - om.fat } : null,
        };
      });
    if (scope !== 'mine') return { ...res, alternatives: [...res.alternatives, ...mine] };
    return { ...res, alternatives: mine, excludedCount: 0 };
  }, [data, meal, scope]);
  const filtered = useMemo(() => {
    if (!result) return [];
    const nq = normalize(q.trim());
    const list = result.alternatives.filter((a) => {
      if (maxMin && a.recipe.minutes > maxMin) return false;
      return recipeMatches(data, a.recipe, nq, normalize);
    });
    // al buscar, primero los platos propios
    return nq ? [...list.filter((a) => a.recipe.custom), ...list.filter((a) => !a.recipe.custom)] : list;
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
    if (selected) swap(meal, { recipeId: selected.recipe.id }, selected.reasons.includes('Sorpréndeme') ? 'sorpresa' : 'manual');
    onClose();
  };

  const title = selected ? 'Revisar cambio' : 'Cambiar plato';

  return (
    <>
    <Sheet
      open={open && !creating}
      onClose={onClose}
      title={title}
      size="lg"
      subtitle={`${SLOT_META[meal.slot].label} · sustituye a ${original.recipe ? recipeTitle(original.recipe) : meal.customName ?? 'plato sin receta'}`}
      footer={
        selected ? (
          <div className="flex gap-2">
            <Button variant="secondary" icon={<ChevronLeft size={18} />} onClick={() => setSelected(null)}>
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
      {!selected && (
        <>
          <button
            type="button"
            onClick={() => { setFree(meal, !meal.free); onClose(); }}
            className="press mb-3 flex w-full items-center gap-3 rounded-[16px] bg-warnSoft/70 p-3 text-left"
            data-free-meal-toggle
          >
            <FreeMealCover size={44} />
            <span className="min-w-0 flex-1">
              <span className="block text-[16px] font-semibold">{meal.free ? 'Volver al plato del plan' : 'Comida libre'}</span>
              <span className="block text-[13px] leading-snug text-ink2">
                {meal.free ? 'Recupera el plato que tenías previsto.' : 'Sáltate este plato y come lo que te apetezca. No suma calorías previstas ni entra en la compra.'}
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="press mb-3 flex w-full items-center gap-3 rounded-[16px] bg-accentSoft/60 p-3 text-left"
            data-swap-create-dish
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-surface text-accent"><ChefHat size={22} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[16px] font-semibold">Crear mi plato</span>
              <span className="block text-[13px] leading-snug text-ink2">Elige ingredientes y cantidades: verás sus calorías y macros, y se pondrá en esta comida.</span>
            </span>
          </button>
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
              options={[{ value: 'slot', label: SLOT_META[meal.slot].label }, { value: 'all', label: 'Todas' }, { value: 'mine', label: 'Mis platos' }]}
            />
            <div className="flex flex-wrap gap-2">
              {([0, 15, 30] as const).map((m) => (
                <Chip key={m} selected={maxMin === m} onClick={() => { setMaxMin(m); setShown(25); }}>{m === 0 ? 'Cualquier tiempo' : `≤ ${m} min`}</Chip>
              ))}
            </div>
            <p className="tabular text-[13px] text-ink3" data-swap-count>{alternatives.length} {alternatives.length === 1 ? 'receta' : 'recetas'}</p>
          </div>

          {alternatives.length === 0 ? (
            <p className="py-8 text-center text-[15px] text-ink2">
              {scope === 'mine' ? 'Aún no tienes platos propios. Usa «Crear mi plato» arriba.' : 'No hay recetas con estos filtros. Prueba con «Todas» o crea tu plato.'}
            </p>
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
                        {a.recipe.custom ? a.recipe.description ?? 'Mi plato' : a.recipe.title ? a.recipe.name : a.recipe.ingredients.slice(0, 4).map((i) => getFood(data, i.foodId)?.name.toLowerCase()).join(', ')}
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

        </>
      )}

      {selected && (
        <div className="anim-fade">
          <div className="mb-4 flex items-center gap-3">
            <RecipeCover recipe={selected.recipe} size={72} />
            <div className="min-w-0">
              {selected.reasons.includes('Sorpréndeme') && <p className="text-[12px] font-semibold uppercase tracking-wide text-accent">Sorpréndeme</p>}
              <h3 className="text-[18px] font-bold leading-snug">{recipeTitle(selected.recipe)}</h3>
              {recipeSubtitle(selected.recipe) && <p className="text-[14px] leading-snug text-ink2">{recipeSubtitle(selected.recipe)}</p>}
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

    </Sheet>
    <DishEditor
      open={creating}
      initialName={q.trim() || undefined}
      initialCategory={CATEGORY_OF_SLOT[meal.slot]}
      onClose={() => setCreating(false)}
      onSaved={(id) => {
        swap(meal, { recipeId: id }, 'manual');
        onClose();
      }}
    />
    </>
  );
}
