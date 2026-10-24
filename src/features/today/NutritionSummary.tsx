import { Info } from 'lucide-react';
import type { DayTotals } from '../../services/nutrition';
import type { NutritionTargets } from '../../types';
import { Card, ProgressBar, Ring } from '../../components/ui/primitives';
import { n0 } from '../../lib/format';
import { navigate } from '../../lib/router';

const ORIGIN_LABEL: Record<NonNullable<NutritionTargets['origin']>, string> = {
  usuario: 'Objetivos definidos por ti',
  referencia: 'Referencia general de etiquetado (UE), no personalizada',
  profesional: 'Objetivos pautados por un profesional',
  demo: 'Objetivos de demostración',
};

function MacroRow({ label, value, target, color, cls }: { label: string; value: number; target?: number; color: string; cls: string }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-[14px] font-semibold">{label}</span>
        <span className="tabular text-[14px] text-ink2">
          <span className={`font-bold ${cls}`}>{n0(value)}</span>
          {target ? ` / ${n0(target)} g` : ' g'}
        </span>
      </div>
      <ProgressBar value={value} max={target || Math.max(value, 1)} color={target ? color : 'rgb(var(--line))'} label={label} />
    </div>
  );
}

export function NutritionSummary({ totals, targets, title = 'Resumen nutricional' }: { totals: DayTotals; targets: NutritionTargets; title?: string }) {
  const c = totals.consumed;
  const hasKcal = !!targets.kcal;
  const remaining = hasKcal ? targets.kcal! - c.kcal : 0;
  return (
    <Card className="p-5">
      <h2 className="sr-only">{title}</h2>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-7">
        <div className="flex items-center gap-5">
          <Ring
            value={c.kcal}
            max={targets.kcal || Math.max(c.kcal, 1)}
            size={132}
            stroke={13}
            color={hasKcal ? (c.kcal > targets.kcal! * 1.1 ? 'rgb(var(--warn))' : 'rgb(var(--accent))') : 'rgb(var(--line))'}
            label={`${n0(c.kcal)} kilocalorías consumidas${hasKcal ? ` de ${n0(targets.kcal!)}` : ''}`}
          >
            <span className="tabular text-[28px] font-bold leading-none tracking-tight">{n0(c.kcal)}</span>
            <span className="mt-1 text-[12px] font-medium text-ink2">{hasKcal ? `de ${n0(targets.kcal!)} kcal` : 'kcal'}</span>
          </Ring>
          <div className="sm:hidden">
            {hasKcal ? (
              <>
                <p className="tabular text-[22px] font-bold leading-tight">{n0(Math.abs(remaining))}</p>
                <p className="text-[14px] text-ink2">{remaining >= 0 ? 'kcal restantes' : 'kcal por encima del objetivo'}</p>
              </>
            ) : (
              <button type="button" className="text-left text-[14px] font-semibold text-accent" onClick={() => navigate('perfil', { s: 'objetivos' })}>
                Sin objetivo calórico. Configurar
              </button>
            )}
            <p className="mt-2 text-[13px] text-ink3">{totals.doneMeals} de {totals.totalMeals} comidas · {totals.logCount} registros</p>
          </div>
        </div>
        <div className="flex-1 space-y-3.5">
          <div className="hidden items-baseline justify-between sm:flex">
            {hasKcal ? (
              <p className="text-[15px] text-ink2">
                <span className="tabular text-[20px] font-bold text-ink">{n0(Math.abs(remaining))}</span> {remaining >= 0 ? 'kcal restantes' : 'kcal por encima'}
              </p>
            ) : (
              <button type="button" className="text-[14px] font-semibold text-accent" onClick={() => navigate('perfil', { s: 'objetivos' })}>
                Sin objetivo calórico · Configurar
              </button>
            )}
            <span className="text-[13px] text-ink3">{totals.doneMeals} de {totals.totalMeals} comidas · {totals.logCount} registros</span>
          </div>
          <MacroRow label="Proteínas" value={c.protein} target={targets.protein} color="rgb(var(--protein))" cls="text-protein" />
          <MacroRow label="Hidratos" value={c.carbs} target={targets.carbs} color="rgb(var(--carbs))" cls="text-carbs" />
          <MacroRow label="Grasas" value={c.fat} target={targets.fat} color="rgb(var(--fat))" cls="text-fat" />
        </div>
      </div>
      {(targets.origin || totals.unknownDone > 0) && (
        <p className="mt-4 flex items-start gap-1.5 border-t border-line/60 pt-3 text-[12px] leading-snug text-ink3">
          <Info size={14} className="mt-[1px] shrink-0" />
          <span>
            {targets.origin && ORIGIN_LABEL[targets.origin]}
            {targets.origin && totals.unknownDone > 0 && '. '}
            {totals.unknownDone > 0 && `${totals.unknownDone} plato(s) sin datos verificados no se suman al total.`}
          </span>
        </p>
      )}
    </Card>
  );
}
