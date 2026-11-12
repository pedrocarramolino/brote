import { useEffect, useState } from 'react';
import { CalendarPlus, Clock, Shuffle, Sparkles } from 'lucide-react';
import type { Recipe, RecipeCategory } from '../../types';
import { Sheet } from '../../components/ui/Sheet';
import { Button, Chip } from '../../components/ui/primitives';
import { useData } from '../../store/AppStore';
import { n0, n1 } from '../../lib/format';
import { getFood } from '../../services/catalog';
import { surprise } from '../../services/planner';
import { CATEGORY_META, CATEGORY_ORDER, CUISINE_LABEL, ingredientsFiber, recipeMacros, recipeTitle } from '../../services/recipeMeta';
import { MacroInline, RecipeCover } from './RecipeBits';

/**
 * «Sorpréndeme»: propone una receta compatible que no se haya usado en las últimas
 * 4 semanas. No modifica el menú: «Añadir al menú» abre la elección de día y comida.
 */
export function SurpriseSheet({ open, onClose, onAdd, onOpen }: { open: boolean; onClose: () => void; onAdd: (r: Recipe) => void; onOpen: (r: Recipe) => void }) {
  const data = useData();
  const [cat, setCat] = useState<RecipeCategory>('comida');
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [recipe, setRecipe] = useState<Recipe | null>(null);

  const next = (c = cat, reset = false) => {
    const exclude = reset ? new Set<string>() : seen;
    let r = surprise(data, { category: c, exclude });
    if (!r && exclude.size) r = surprise(data, { category: c }); // se han visto todas: empezar de nuevo
    setRecipe(r);
    setSeen(r ? new Set(reset ? [r.id] : [...exclude, r.id]) : new Set());
  };

  useEffect(() => {
    if (open) next(cat, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const m = recipe ? recipeMacros(data, recipe) : null;
  const fiber = recipe ? ingredientsFiber(data, recipe.ingredients) : null;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Sorpréndeme"
      subtitle="Una receta para ti que no has comido últimamente"
      size="lg"
      footer={
        recipe ? (
          <div className="flex gap-2">
            <Button variant="secondary" icon={<Shuffle size={18} />} onClick={() => next()} data-surprise-next>
              Otra
            </Button>
            <Button className="flex-1" icon={<CalendarPlus size={18} />} onClick={() => onAdd(recipe)} data-surprise-add>
              Añadir al menú
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1" data-no-swipe>
        {CATEGORY_ORDER.map((c) => (
          <Chip key={c} selected={cat === c} onClick={() => { setCat(c); next(c, true); }}>
            {CATEGORY_META[c].label}
          </Chip>
        ))}
      </div>

      {!recipe || !m ? (
        <p className="py-10 text-center text-[15px] text-ink2">No hay recetas de esta categoría compatibles con tus preferencias.</p>
      ) : (
        <article className="anim-fade" key={recipe.id} data-surprise-recipe={recipe.id}>
          <button type="button" className="block w-full text-left" onClick={() => onOpen(recipe)}>
            <RecipeCover recipe={recipe} size="full" className="h-44 w-full" rounded="rounded-[18px]" labelled />
            <p className="mt-3 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-accent">
              <Sparkles size={14} /> {CATEGORY_META[recipe.category].label}
              {recipe.cuisine && <span className="text-ink3">· {CUISINE_LABEL[recipe.cuisine]}</span>}
            </p>
            <h3 className="mt-0.5 text-[24px] font-bold leading-tight tracking-tight" data-surprise-title>{recipeTitle(recipe)}</h3>
            <p className="mt-1 text-[15px] leading-snug text-ink2">{recipe.name}</p>
          </button>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
            <MacroInline m={m} />
            <span className="tabular text-[13px] text-ink2">Fibra ≈ {n1(fiber!.grams)} g</span>
            <span className="inline-flex items-center gap-1 text-[13px] text-ink2"><Clock size={13} /> {recipe.minutes} min</span>
          </div>
          <h4 className="mb-2 mt-4 text-[15px] font-bold">Ingredientes por ración</h4>
          <ul className="flex flex-wrap gap-1.5">
            {recipe.ingredients.map((i) => {
              const f = getFood(data, i.foodId);
              return (
                <li key={i.foodId} className="rounded-full bg-surface2 px-3 py-1 text-[14px]">
                  {f?.name} <span className="tabular text-ink3">{n0(i.amount)} {f?.unit}</span>
                </li>
              );
            })}
          </ul>
          <button type="button" className="mt-4 text-[14px] font-semibold text-accent" onClick={() => onOpen(recipe)}>Ver receta completa</button>
          <p className="mt-3 text-[12px] text-ink3">Valores estimados a partir de los ingredientes. El menú no cambia hasta que elijas día y comida.</p>
        </article>
      )}
    </Sheet>
  );
}
