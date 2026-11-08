import type React from 'react';
import { useMemo, useState } from 'react';
import { ChevronLeft, Clock, Heart, Search, SlidersHorizontal, X } from 'lucide-react';
import type { Difficulty, MainIngredient, Recipe, RecipeCategory } from '../types';
import { PageHeader } from '../components/layout/AppShell';
import { Badge, Button, Card, Chip, EmptyState, IconButton, Segmented, Toggle, cx } from '../components/ui/primitives';
import { Sheet } from '../components/ui/Sheet';
import { useData } from '../store/AppStore';
import { n0, normalize } from '../lib/format';
import { navigate } from '../lib/router';
import { allRecipes, getFood } from '../services/catalog';
import { recipeFit } from '../services/nutrition';
import {
  CATEGORY_META, CATEGORY_ORDER, DIET_LABEL, DIFFICULTY_LABEL, MAIN_LABEL, dietLabels, recipeMacros, type DietLabel,
} from '../services/recipeMeta';
import { RecipeCover } from '../features/meals/RecipeBits';
import { RecipeSheet } from '../features/meals/RecipeSheet';

type TimeF = 'all' | '10' | '20' | '30' | '45';
type KcalF = 'all' | 'lt250' | '250-450' | '450-650' | 'gt650';
type ProtF = 'all' | '15' | '25' | '35';
type Sort = 'recomendadas' | 'tiempo' | 'kcal' | 'proteina' | 'nombre';

interface Filters {
  time: TimeF;
  kcal: KcalF;
  protein: ProtF;
  mains: MainIngredient[];
  difficulty: Difficulty[];
  diets: DietLabel[];
  compatible: boolean;
  favorites: boolean;
}

const EMPTY: Filters = { time: 'all', kcal: 'all', protein: 'all', mains: [], difficulty: [], diets: [], compatible: false, favorites: false };

const MAIN_GROUPS: MainIngredient[] = ['pollo', 'pavo', 'ternera', 'cerdo', 'pescado_blanco', 'pescado_azul', 'atun', 'marisco', 'huevo', 'lacteo', 'legumbre', 'proteina_vegetal', 'cereal', 'verdura', 'fruta'];

const KCAL_RANGE: Record<Exclude<KcalF, 'all'>, [number, number]> = { lt250: [0, 250], '250-450': [250, 450], '450-650': [450, 650], gt650: [650, 99999] };

function countActive(f: Filters) {
  return (
    Number(f.time !== 'all') + Number(f.kcal !== 'all') + Number(f.protein !== 'all') + f.mains.length + f.difficulty.length + f.diets.length + Number(f.compatible) + Number(f.favorites)
  );
}

export function RecipesPage() {
  const data = useData();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<RecipeCategory | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [sheet, setSheet] = useState(false);
  const [sort, setSort] = useState<Sort>('recomendadas');
  const [open, setOpen] = useState<Recipe | null>(null);

  const library = useMemo(() => allRecipes(data).filter((r) => !r.custom), [data]);

  const counts = useMemo(() => {
    const c: Partial<Record<RecipeCategory, number>> = {};
    library.forEach((r) => (c[r.category] = (c[r.category] ?? 0) + 1));
    return c;
  }, [library]);

  const list = useMemo(() => {
    const nq = normalize(q.trim());
    const favs = new Set(data.favorites.recipes);
    const res = library.filter((r) => {
      if (cat && r.category !== cat) return false;
      if (filters.favorites && !favs.has(r.id)) return false;
      if (filters.time !== 'all' && r.minutes > Number(filters.time)) return false;
      if (filters.mains.length && !filters.mains.includes(r.main)) return false;
      if (filters.difficulty.length && !filters.difficulty.includes(r.difficulty)) return false;
      const m = recipeMacros(data, r);
      if (filters.kcal !== 'all') {
        const [lo, hi] = KCAL_RANGE[filters.kcal];
        if (m.kcal < lo || m.kcal >= hi) return false;
      }
      if (filters.protein !== 'all' && m.protein < Number(filters.protein)) return false;
      if (filters.diets.length) {
        const d = dietLabels(data, r);
        const has = (x: DietLabel) => d.includes(x) || (x === 'vegetariana' && d.includes('vegana')) || (x === 'pescetariana' && (d.includes('vegana') || d.includes('vegetariana')));
        if (!filters.diets.every(has)) return false;
      }
      if (filters.compatible && !recipeFit(data, r, data.profile).ok) return false;
      if (nq) {
        const inName = normalize(r.name).includes(nq);
        const inIngredients = r.ingredients.some((i) => normalize(getFood(data, i.foodId)?.name ?? '').includes(nq));
        if (!inName && !inIngredients) return false;
      }
      return true;
    });
    const by: Record<Sort, (a: Recipe, b: Recipe) => number> = {
      recomendadas: (a, b) => Number(favs.has(b.id)) - Number(favs.has(a.id)) || CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category),
      tiempo: (a, b) => a.minutes - b.minutes,
      kcal: (a, b) => recipeMacros(data, a).kcal - recipeMacros(data, b).kcal,
      proteina: (a, b) => recipeMacros(data, b).protein - recipeMacros(data, a).protein,
      nombre: (a, b) => a.name.localeCompare(b.name, 'es'),
    };
    return res.sort(by[sort]);
  }, [library, q, cat, filters, sort, data]);

  const active = countActive(filters);
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setFilters((f) => ({ ...f, [k]: v }));
  const toggleIn = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <>
      <PageHeader
        eyebrow={
          <button type="button" onClick={() => navigate('plan')} className="-ml-1 inline-flex items-center gap-0.5 text-accent hover:underline">
            <ChevronLeft size={16} /> Plan
          </button>
        }
        title="Recetas"
        subtitle={`${library.length} recetas · cantidades por ración y valores calculados por ingredientes`}
      />

      <div className="mb-3 flex gap-2">
        <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-[12px] bg-surface px-3 ring-1 ring-line/70 focus-within:ring-2 focus-within:ring-accent">
          <Search size={18} className="shrink-0 text-ink3" aria-hidden="true" />
          <span className="sr-only">Buscar por nombre o ingrediente</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nombre o ingrediente"
            className="h-full w-full min-w-0 bg-transparent text-[16px] placeholder:text-ink3 focus:outline-none"
            data-recipe-search
          />
        </label>
        <Button variant={active ? 'tinted' : 'secondary'} icon={<SlidersHorizontal size={18} />} onClick={() => setSheet(true)} data-open-filters>
          <span className="hidden xs:inline">Filtros</span>
          {active > 0 && <span className="tabular ml-0.5">({active})</span>}
        </Button>
      </div>

      <div className="no-scrollbar -mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" data-no-swipe>
        <Chip selected={cat === null} onClick={() => setCat(null)}>Todas</Chip>
        {CATEGORY_ORDER.map((c) => (
          <Chip key={c} selected={cat === c} onClick={() => setCat(cat === c ? null : c)}>
            {CATEGORY_META[c].plural} <span className="tabular ml-1 text-ink3">{counts[c] ?? 0}</span>
          </Chip>
        ))}
      </div>

      <div className="mb-3 flex items-center justify-between gap-2 text-[14px] text-ink2">
        <span className="tabular" data-result-count>{list.length} {list.length === 1 ? 'receta' : 'recetas'}</span>
        <label className="flex items-center gap-1.5">
          <span>Ordenar</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="h-9 rounded-[10px] bg-surface2 px-2 text-[15px] text-ink">
            <option value="recomendadas">Recomendadas</option>
            <option value="tiempo">Menos tiempo</option>
            <option value="kcal">Menos calorías</option>
            <option value="proteina">Más proteína</option>
            <option value="nombre">Nombre</option>
          </select>
        </label>
      </div>

      {active > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {filters.favorites && <ActiveChip onClear={() => set('favorites', false)}>Favoritas</ActiveChip>}
          {filters.compatible && <ActiveChip onClear={() => set('compatible', false)}>Compatibles con mi perfil</ActiveChip>}
          {filters.time !== 'all' && <ActiveChip onClear={() => set('time', 'all')}>≤ {filters.time} min</ActiveChip>}
          {filters.kcal !== 'all' && <ActiveChip onClear={() => set('kcal', 'all')}>{kcalLabel(filters.kcal)}</ActiveChip>}
          {filters.protein !== 'all' && <ActiveChip onClear={() => set('protein', 'all')}>≥ {filters.protein} g proteína</ActiveChip>}
          {filters.mains.map((m) => <ActiveChip key={m} onClear={() => set('mains', filters.mains.filter((x) => x !== m))}>{MAIN_LABEL[m]}</ActiveChip>)}
          {filters.difficulty.map((d) => <ActiveChip key={d} onClear={() => set('difficulty', filters.difficulty.filter((x) => x !== d))}>{DIFFICULTY_LABEL[d]}</ActiveChip>)}
          {filters.diets.map((d) => <ActiveChip key={d} onClear={() => set('diets', filters.diets.filter((x) => x !== d))}>{DIET_LABEL[d]}</ActiveChip>)}
          <button type="button" className="px-2 text-[14px] font-semibold text-accent" onClick={() => setFilters(EMPTY)}>Limpiar</button>
        </div>
      )}

      {list.length === 0 ? (
        <Card>
          <EmptyState icon={filters.favorites ? <Heart size={24} /> : <Search size={24} />} title="Sin resultados">
            {filters.favorites && !data.favorites.recipes.length ? 'Abre una receta y pulsa el corazón para guardarla.' : 'Prueba con otra búsqueda o quita algún filtro.'}
          </EmptyState>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <ul className="divide-y divide-line/60" data-recipe-list>
            {list.map((r) => {
              const m = recipeMacros(data, r);
              const fit = recipeFit(data, r, data.profile);
              const fav = data.favorites.recipes.includes(r.id);
              return (
                <li key={r.id}>
                  <button type="button" onClick={() => setOpen(r)} className="flex w-full min-w-0 items-center gap-3 px-3 py-2.5 text-left hover:bg-surface2/50 sm:px-4" data-recipe={r.id}>
                    <RecipeCover recipe={r} size={52} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start gap-1.5">
                        <span className="min-w-0 flex-1 text-[15px] font-semibold leading-snug">{r.name}</span>
                        {fav && <Heart size={14} className="mt-1 shrink-0 fill-danger text-danger" aria-label="Favorita" />}
                      </span>
                      <span className="tabular mt-0.5 flex flex-wrap gap-x-2 text-[13px] text-ink2">
                        <span className="font-semibold text-ink">{n0(m.kcal)} kcal</span>
                        <span className="text-protein">P {n0(m.protein)} g</span>
                        <span className="inline-flex items-center gap-0.5 text-ink3"><Clock size={12} />{r.minutes} min</span>
                        <span className="text-ink3">{CATEGORY_META[r.category].label}</span>
                      </span>
                      {!fit.ok && <span className="mt-1 block"><Badge tone="danger">{fit.reasons[0]}</Badge></span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <Sheet
        open={sheet}
        onClose={() => setSheet(false)}
        title="Filtros"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setFilters(EMPTY)}>Limpiar</Button>
            <Button className="flex-1" onClick={() => setSheet(false)}>Ver {list.length} recetas</Button>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="space-y-2">
            <Toggle checked={filters.compatible} onChange={(v) => set('compatible', v)} label="Compatibles con mi perfil" description="Respeta tu alimentación, alergias y lo que no te gusta" />
            <Toggle checked={filters.favorites} onChange={(v) => set('favorites', v)} label="Solo favoritas" />
          </div>
          <Group label="Tiempo de preparación">
            <Segmented label="Tiempo" value={filters.time} onChange={(v) => set('time', v)} options={[{ value: 'all', label: 'Todo' }, { value: '10', label: '≤10' }, { value: '20', label: '≤20' }, { value: '30', label: '≤30' }, { value: '45', label: '≤45' }]} />
          </Group>
          <Group label="Calorías por ración">
            <div className="flex flex-wrap gap-2">
              {(['all', 'lt250', '250-450', '450-650', 'gt650'] as KcalF[]).map((k) => (
                <Chip key={k} selected={filters.kcal === k} onClick={() => set('kcal', k)}>{k === 'all' ? 'Cualquiera' : kcalLabel(k)}</Chip>
              ))}
            </div>
          </Group>
          <Group label="Proteína por ración">
            <Segmented label="Proteína" value={filters.protein} onChange={(v) => set('protein', v)} options={[{ value: 'all', label: 'Todo' }, { value: '15', label: '≥15 g' }, { value: '25', label: '≥25 g' }, { value: '35', label: '≥35 g' }]} />
          </Group>
          <Group label="Ingrediente principal">
            <div className="flex flex-wrap gap-2">
              {MAIN_GROUPS.map((m) => <Chip key={m} selected={filters.mains.includes(m)} onClick={() => set('mains', toggleIn(filters.mains, m))}>{MAIN_LABEL[m]}</Chip>)}
            </div>
          </Group>
          <Group label="Tipo de alimentación">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(DIET_LABEL) as DietLabel[]).map((d) => <Chip key={d} selected={filters.diets.includes(d)} onClick={() => set('diets', toggleIn(filters.diets, d))}>{DIET_LABEL[d]}</Chip>)}
            </div>
          </Group>
          <Group label="Dificultad">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(DIFFICULTY_LABEL) as Difficulty[]).map((d) => <Chip key={d} selected={filters.difficulty.includes(d)} onClick={() => set('difficulty', toggleIn(filters.difficulty, d))}>{DIFFICULTY_LABEL[d]}</Chip>)}
            </div>
          </Group>
        </div>
      </Sheet>

      <RecipeSheet recipe={open ?? undefined} open={!!open} onClose={() => setOpen(null)} />
    </>
  );
}

function kcalLabel(k: Exclude<KcalF, 'all'> | KcalF) {
  return k === 'lt250' ? '< 250 kcal' : k === '250-450' ? '250–450 kcal' : k === '450-650' ? '450–650 kcal' : k === 'gt650' ? '> 650 kcal' : '';
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-[14px] font-semibold text-ink2">{label}</h3>
      {children}
    </section>
  );
}

function ActiveChip({ children, onClear }: { children: React.ReactNode; onClear: () => void }) {
  return (
    <span className={cx('inline-flex h-8 items-center gap-1 rounded-full bg-accentSoft pl-3 pr-1 text-[13px] font-medium text-accent-deep')}>
      {children}
      <IconButton label="Quitar filtro" onClick={onClear} className="!h-7 !w-7">
        <X size={14} />
      </IconButton>
    </span>
  );
}
