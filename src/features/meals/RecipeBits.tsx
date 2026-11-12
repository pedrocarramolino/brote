import type React from 'react';
import { HelpCircle } from 'lucide-react';
import type { Macros, Recipe } from '../../types';
import { RECIPE_ICONS } from '../../components/ui/icons';
import { cx } from '../../components/ui/primitives';
import { n0 } from '../../lib/format';

/**
 * Portada ilustrada de la receta. Si hay fotografía (`imageUrl`) se muestra;
 * si no, una superficie tintada con el icono del ingrediente principal.
 */
export function RecipeCover({ recipe, size = 56, className, rounded = 'rounded-[14px]', labelled = false }: { recipe?: Recipe; size?: number | 'full'; className?: string; rounded?: string; labelled?: boolean }) {
  const style = size === 'full' ? undefined : { width: size, height: size };
  if (!recipe) {
    return (
      <div className={cx('flex shrink-0 items-center justify-center bg-surface2 text-ink3', rounded, className)} style={style} aria-hidden="true">
        <HelpCircle size={size === 'full' ? 40 : Math.round((size as number) * 0.42)} />
      </div>
    );
  }
  if (recipe.imageUrl) {
    return <img src={recipe.imageUrl} alt="" loading="lazy" className={cx('shrink-0 object-cover', rounded, className)} style={style} />;
  }
  const Icon = RECIPE_ICONS[recipe.icon];
  const iconSize = size === 'full' ? 56 : Math.round((size as number) * 0.44);
  // Pequeños «ingredientes» alrededor del plato: colores de los 3 ingredientes con más peso
  const dots = [...recipe.ingredients].sort((a, b) => b.amount - a.amount).slice(0, 3).map((i) => foodColor(i.foodId));
  const big = size === 'full' || (size as number) >= 48;
  return (
    <div
      aria-hidden="true"
      className={cx('recipe-cover relative flex shrink-0 items-center justify-center overflow-hidden', rounded, className)}
      style={{ ...style, ['--h' as string]: recipe.hue }}
    >
      <Icon size={iconSize} strokeWidth={1.6} className="recipe-cover-icon relative" />
      {labelled && (
        <span className="absolute bottom-2 right-2 rounded-full bg-surface/85 px-2 py-0.5 text-[11px] font-semibold text-ink2 backdrop-blur" data-cover-illustration>
          Ilustración · sin foto real
        </span>
      )}
      {big &&
        dots.map((c, i) => (
          <span
            key={i}
            className="recipe-dot absolute rounded-full"
            style={{ background: c, ...DOT_POS[(i + recipe.hue) % DOT_POS.length], width: size === 'full' ? 18 - i * 3 : '14%', height: size === 'full' ? 18 - i * 3 : '14%' }}
          />
        ))}
    </div>
  );
}

const DOT_POS: React.CSSProperties[] = [
  { top: '12%', left: '14%' }, { bottom: '14%', right: '12%' }, { top: '16%', right: '16%' }, { bottom: '12%', left: '18%' },
];

const COLORS: [RegExp, string][] = [
  [/tomate|fresas|frambuesas|sandia|granada|cerezas|pimiento$|piquillos|remolacha|col_lombarda|frutos_rojos/, '#d9534f'],
  [/zanahoria|calabaza|naranja|mandarina|mango|melocoton|boniato|caqui|salmon|cacao_?$/, '#e8913a'],
  [/espinacas|lechuga|rucula|brocoli|calabacin|judias|pepino|kiwi|aguacate|kale|acelgas|esparragos|guisantes|canonigos|perejil|edamame|pimiento_verde|alcachofa|puerro|apio/, '#5aa155'],
  [/platano|pina|limon|maiz|huevo|claras|patata|pasta|arroz|cuscus|bulgur|quinoa|tortilla_maiz|melon|pera/, '#e9c46a'],
  [/berenjena|uvas|ciruela|higos|cebolla_morada|datiles|pasas/, '#7b5ea7'],
  [/chocolate|cacao|cafe|lentejas|nueces|avellanas|pan_centeno|ternera|lomo|solomillo|jamon_serrano|crema_cacahuete|tempeh|seitan/, '#8a5a3c'],
  [/pan|avena|muesli|granola|harina|tortilla_trigo|pan_pita|tortitas|copos|almendras|garbanzos|alubias|hummus|tahini|sesamo|pipas|anacardos|pistachos/, '#c9a06b'],
  [/pollo|pavo|merluza|bacalao|lubina|dorada|gambas|langostinos|calamar|sepia|tofu|champinones|setas|coliflor|ajo|cebolla/, '#efe2cf'],
  [/sardinas|caballa|atun|mejillones/, '#6f8fa6'],
  [/yogur|queso|leche|kefir|skyr|requeson|mozzarella|feta|parmesano|bebida|coco/, '#f6f1e7'],
];
function foodColor(id: string): string {
  return COLORS.find(([re]) => re.test(id))?.[1] ?? '#bfc8b8';
}

export function MacroInline({ m, className }: { m: Macros; className?: string }) {
  return (
    <span className={cx('tabular flex flex-wrap items-baseline gap-x-2 text-[13px] leading-snug text-ink2', className)}>
      <span className="whitespace-nowrap font-semibold text-ink">{n0(m.kcal)} kcal</span>
      <span className="whitespace-nowrap">
        <span className="text-protein">P {n0(m.protein)}</span>
        <span className="mx-1 text-ink3" aria-hidden="true">·</span>
        <span className="text-carbs">H {n0(m.carbs)}</span>
        <span className="mx-1 text-ink3" aria-hidden="true">·</span>
        <span className="text-fat">G {n0(m.fat)}</span>
      </span>
    </span>
  );
}

export function MacroGrid({ m }: { m: Macros }) {
  const items = [
    { label: 'Energía', value: `${n0(m.kcal)}`, unit: 'kcal', cls: 'text-ink' },
    { label: 'Proteínas', value: n0(m.protein), unit: 'g', cls: 'text-protein' },
    { label: 'Hidratos', value: n0(m.carbs), unit: 'g', cls: 'text-carbs' },
    { label: 'Grasas', value: n0(m.fat), unit: 'g', cls: 'text-fat' },
  ];
  return (
    <dl className="grid grid-cols-4 gap-2">
      {items.map((i) => (
        <div key={i.label} className="rounded-[14px] bg-surface2 px-2 py-2.5 text-center">
          <dt className="text-[12px] font-medium text-ink2">{i.label}</dt>
          <dd className={cx('tabular mt-0.5 text-[18px] font-bold leading-tight', i.cls)}>
            {i.value}
            <span className="ml-0.5 text-[12px] font-semibold text-ink3">{i.unit}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
