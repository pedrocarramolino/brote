import { HelpCircle } from 'lucide-react';
import type { Macros, Recipe } from '../../types';
import { RECIPE_ICONS } from '../../components/ui/icons';
import { cx } from '../../components/ui/primitives';
import { n0 } from '../../lib/format';

/**
 * Portada ilustrada de la receta. Si hay fotografía (`imageUrl`) se muestra;
 * si no, una superficie tintada con el icono del ingrediente principal.
 */
export function RecipeCover({ recipe, size = 56, className, rounded = 'rounded-[14px]' }: { recipe?: Recipe; size?: number | 'full'; className?: string; rounded?: string }) {
  const style = size === 'full' ? undefined : { width: size, height: size };
  if (!recipe) {
    return (
      <div className={cx('flex shrink-0 items-center justify-center bg-surface2 text-ink3', rounded, className)} style={style} aria-hidden="true">
        <HelpCircle size={size === 'full' ? 40 : Math.round((size as number) * 0.42)} />
      </div>
    );
  }
  if (recipe.imageUrl) {
    return <img src={recipe.imageUrl} alt="" className={cx('shrink-0 object-cover', rounded, className)} style={style} />;
  }
  const Icon = RECIPE_ICONS[recipe.icon];
  const iconSize = size === 'full' ? 56 : Math.round((size as number) * 0.44);
  return (
    <div
      aria-hidden="true"
      className={cx('recipe-cover relative flex shrink-0 items-center justify-center overflow-hidden', rounded, className)}
      style={{ ...style, ['--h' as string]: recipe.hue }}
    >
      <Icon size={iconSize} strokeWidth={1.6} className="recipe-cover-icon relative" />
    </div>
  );
}

export function MacroInline({ m, className }: { m: Macros; className?: string }) {
  return (
    <span className={cx('tabular text-[13px] text-ink2', className)}>
      <span className="font-semibold text-ink">{n0(m.kcal)} kcal</span>
      <span className="mx-1.5 text-line">·</span>
      <span className="text-protein">P {n0(m.protein)}</span>
      <span className="mx-1 text-line">·</span>
      <span className="text-carbs">H {n0(m.carbs)}</span>
      <span className="mx-1 text-line">·</span>
      <span className="text-fat">G {n0(m.fat)}</span>
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
