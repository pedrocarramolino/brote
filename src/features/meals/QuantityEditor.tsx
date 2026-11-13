import { Minus, Plus } from 'lucide-react';
import type { Food, QtyUnit } from '../../types';
import { IconButton, Segmented, cx } from '../../components/ui/primitives';
import { n0, parseDecimal } from '../../lib/format';
import { allowedUnits, toBaseAmount, unitSize } from '../../services/dishes';

/**
 * Cantidad editable de un alimento: botones − / +, campo de texto con decimales y, si el
 * alimento tiene un peso por unidad en la base, cambio entre unidades y gramos (o ml).
 *
 * El valor se guarda como TEXTO mientras se escribe (no se reformatea en cada pulsación), y el
 * componente vive fuera del árbol de su padre: el teclado del iPhone no se cierra al recalcular.
 * Las equivalencias salen solo de la base (ración «1 unidad», «1 mediano»… o cucharadas de
 * 15/5 ml en líquidos): si no hay un peso por unidad fiable, solo se ofrecen gramos o ml.
 */
export interface QtyValue {
  text: string;
  unit: QtyUnit;
}

const MAX_BASE = 3000;
/** Unidades ofrecidas al editar una cantidad consumida (sin kg ni litros). */
export function qtyUnits(food: Food): QtyUnit[] {
  return allowedUnits(food).filter((u) => u !== 'kg' && u !== 'l');
}

/** Número para el campo de texto: coma decimal y como mucho dos decimales. */
export function fmtQty(n: number): string {
  return String(Math.round(n * 100) / 100).replace('.', ',');
}

/** g/ml del valor (null si no es válido o no hay conversión fiable). */
export function qtyToBase(food: Food, v: QtyValue): number | null {
  const q = parseDecimal(v.text);
  const base = Number.isFinite(q) ? toBaseAmount(food, q, v.unit) : null;
  return base !== null && base > 0 && base <= MAX_BASE ? base : null;
}

/** Valor inicial a partir de una cantidad en g/ml (y la unidad preferida si se guardó). */
export function qtyFromBase(food: Food, base: number, prefer?: QtyUnit): QtyValue {
  const units = qtyUnits(food);
  const unit = prefer && units.includes(prefer) ? prefer : food.unit;
  const per = toBaseAmount(food, 1, unit);
  if (!per) return { text: fmtQty(base), unit: food.unit };
  return { text: fmtQty(base / per), unit };
}

/** «2 unidades», «½ unidad»… para mostrar una cantidad guardada. */
export function qtyLabel(quantity: number, unit: QtyUnit): string {
  const t = quantity === 0.5 ? '½' : fmtQty(quantity);
  switch (unit) {
    case 'unidad':
      return `${t} ${quantity === 1 || quantity === 0.5 ? 'unidad' : 'unidades'}`;
    case 'cucharada':
      return `${t} ${quantity === 1 || quantity === 0.5 ? 'cucharada' : 'cucharadas'}`;
    case 'cucharadita':
      return `${t} ${quantity === 1 || quantity === 0.5 ? 'cucharadita' : 'cucharaditas'}`;
    default:
      return `${fmtQty(quantity)} ${unit}`;
  }
}

/** Cantidad legible en g/ml con su equivalencia en unidades cuando la base la tiene y es redonda: «2 ud. · 150 g». */
export function amountLabel(food: Food | undefined, base: number): string {
  if (!food) return `${n0(base)} g`;
  const u = unitSize(food);
  const pieces = u ? base / u : 0;
  // solo cuando son piezas «redondas» (½, 1, 1½, 2…): «0,36 ud.» no ayuda
  if (!u || pieces < 0.5 || Math.abs(pieces * 2 - Math.round(pieces * 2)) > 0.04) return `${n0(base)} ${food.unit}`;
  return `${fmtQty(Math.round(pieces * 2) / 2)} ud. · ${n0(base)} ${food.unit}`;
}

const SEG_LABEL: Record<QtyUnit, string> = { g: 'g', kg: 'kg', ml: 'ml', l: 'l', unidad: 'unidades', cucharada: 'cdas.', cucharadita: 'cdtas.' };
const isPiece = (u: QtyUnit) => u === 'unidad' || u === 'cucharada' || u === 'cucharadita';

/** Los botones no roban el foco: si el teclado está abierto, sigue abierto. */
const keepFocus = (e: { preventDefault: () => void }) => e.preventDefault();

/**
 * Siguiente cantidad al pulsar − / +. Unidades y cucharadas: de una en una y, por debajo de 1,
 * medias (2 → 1 → ½ y ½ → 1 → 2). Gramos y ml: de 5 en 5 hasta 30 y luego de 10 en 10.
 * Devuelve null si bajaría a 0.
 */
export function nextQty(cur: number, unit: QtyUnit, dir: 1 | -1): number | null {
  if (isPiece(unit)) {
    if (dir > 0) return cur < 0.5 ? 0.5 : cur < 1 ? 1 : Math.floor(cur + 1e-9) + 1;
    if (cur <= 0.5 + 1e-9) return null;
    return cur <= 1 + 1e-9 ? 0.5 : Math.ceil(cur - 1e-9) - 1;
  }
  const step = unit === 'kg' || unit === 'l' ? 0.1 : (dir > 0 ? cur : cur - 1e-9) < 30 ? 5 : 10;
  const next = Math.round((dir > 0 ? Math.floor(cur / step + 1e-9) * step + step : Math.ceil(cur / step - 1e-9) * step - step) * 100) / 100;
  return next > 0 ? next : null;
}

export function QuantityEditor({
  food,
  value,
  onChange,
  label,
  onEnter,
  autoFocus,
  className,
}: {
  food: Food;
  value: QtyValue;
  onChange: (v: QtyValue) => void;
  /** texto accesible del campo; por defecto «Cantidad de <alimento>» */
  label?: string;
  onEnter?: () => void;
  autoFocus?: boolean;
  className?: string;
}) {
  const units = qtyUnits(food);
  const q = parseDecimal(value.text);
  const base = qtyToBase(food, value);
  const per = toBaseAmount(food, 1, value.unit);
  const kcal = base !== null ? (food.per100.kcal * base) / 100 : null;

  const bump = (dir: 1 | -1) => {
    const next = nextQty(Number.isFinite(q) ? q : 0, value.unit, dir);
    if (next === null) return;
    if (per && next * per > MAX_BASE) return;
    onChange({ text: fmtQty(next), unit: value.unit });
  };

  const switchUnit = (u: QtyUnit) => {
    if (u === value.unit) return;
    const nextPer = toBaseAmount(food, 1, u);
    if (!nextPer) return;
    if (base === null) {
      onChange({ text: isPiece(u) ? '1' : fmtQty(food.portion?.amount ?? 100), unit: u });
      return;
    }
    const raw = base / nextPer;
    onChange({ text: fmtQty(isPiece(u) ? raw : Math.round(raw * 10) / 10), unit: u });
  };

  const perLine = isPiece(value.unit) && per
    ? `${n0((food.per100.kcal * per) / 100)} kcal por ${value.unit === 'unidad' ? 'unidad' : value.unit} (${n0(per)} ${food.unit})`
    : `${n0(food.per100.kcal)} kcal / 100 ${food.unit}`;

  return (
    <div className={className} data-qty-editor={food.id}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center rounded-full bg-surface2" role="group" aria-label={label ?? `Cantidad de ${food.name}`}>
          <IconButton label="Menos" onClick={() => bump(-1)} onPointerDown={keepFocus} disabled={!Number.isFinite(q) || nextQty(q, value.unit, -1) === null} data-qty-minus>
            <Minus size={18} />
          </IconButton>
          <input
            value={value.text}
            onChange={(e) => onChange({ text: e.target.value, unit: value.unit })}
            onKeyDown={(e) => e.key === 'Enter' && onEnter?.()}
            inputMode="decimal"
            enterKeyHint="done"
            autoComplete="off"
            aria-label={label ?? `Cantidad de ${food.name}`}
            aria-invalid={base === null || undefined}
            data-autofocus={autoFocus || undefined}
            data-qty-input
            className={cx('tabular h-11 w-[72px] rounded-[10px] bg-surface text-center text-[17px] font-semibold focus:outline-none focus:ring-2 focus:ring-accent', base === null && 'ring-2 ring-danger/60')}
          />
          <IconButton label="Más" onClick={() => bump(1)} onPointerDown={keepFocus} data-qty-plus>
            <Plus size={18} />
          </IconButton>
        </div>
        {units.length > 1 ? (
          <Segmented
            size="sm"
            className="min-w-[150px] flex-1"
            label="Unidad"
            value={value.unit}
            onChange={switchUnit}
            options={units.map((u) => ({ value: u, label: SEG_LABEL[u] }))}
          />
        ) : (
          <span className="text-[15px] font-medium text-ink2">{value.unit === 'unidad' ? 'unidades' : value.unit}</span>
        )}
      </div>
      <p className="tabular mt-1.5 text-[13px] text-ink3" data-qty-summary>
        {base === null ? (
          <span className="text-danger">Introduce una cantidad mayor que 0{per ? ` (máx. ${n0(MAX_BASE / per)})` : ''}.</span>
        ) : (
          <>
            {perLine} · <span className="font-semibold text-ink" data-qty-kcal>{n0(kcal ?? 0)} kcal</span> en total
            {isPiece(value.unit) ? ` (${n0(base)} ${food.unit})` : ''}
          </>
        )}
      </p>
    </div>
  );
}
