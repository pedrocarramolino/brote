import { useMemo, useState } from 'react';
import { Footprints, Info, List, ListChecks, Plus, Ruler, Scale, Timer, Utensils } from 'lucide-react';
import type { MeasurementEntry, WeightEntry } from '../types';
import { PageHeader } from '../components/layout/AppShell';
import { Button, Card, DemoBadge, EmptyState, Segmented, cx } from '../components/ui/primitives';
import { useData } from '../store/AppStore';
import { addDays, formatDate, formatShort, formatWeekdayNarrow, rangeDays, startOfWeek, todayISO } from '../lib/dates';
import { n0, n1 } from '../lib/format';
import { dayHabits, mealAdherence } from '../services/habits';
import { HABIT_ICONS } from '../components/ui/icons';
import { Bars, TrendLine, type Point } from '../features/progress/Charts';
import { MeasurementSheet, MEASURES, RecordsSheet, WeightSheet } from '../features/progress/EntrySheets';

type Period = '7' | '30' | '90' | '180';
const PERIODS: { value: Period; label: string }[] = [
  { value: '7', label: '7 días' },
  { value: '30', label: '1 mes' },
  { value: '90', label: '3 meses' },
  { value: '180', label: '6 meses' },
];

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

function ChartCard({ title, icon, children, demo, aside, footer }: { title: string; icon: React.ReactNode; children: React.ReactNode; demo?: boolean; aside?: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[17px] font-bold">
          <span className="text-ink2">{icon}</span>
          {title}
          {demo && <DemoBadge />}
        </h2>
        {aside}
      </div>
      {children}
      {footer && <div className="mt-3 border-t border-line/60 pt-3">{footer}</div>}
    </Card>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="text-[13px] font-medium text-ink2">{label}</p>
      <p className="tabular text-[22px] font-bold leading-tight tracking-tight">{value}</p>
      {sub && <p className="text-[12px] text-ink3">{sub}</p>}
    </div>
  );
}

export function ProgressPage() {
  const data = useData();
  const today = todayISO();
  const [period, setPeriod] = useState<Period>('30');
  const days = Number(period);
  const from = addDays(today, -(days - 1));
  const range = rangeDays(from, today);
  const weekly = days > 30;

  const [weightSheet, setWeightSheet] = useState<{ entry: WeightEntry | null } | null>(null);
  const [measureSheet, setMeasureSheet] = useState<{ entry: MeasurementEntry | null } | null>(null);
  const [records, setRecords] = useState<'peso' | 'medidas' | null>(null);

  /** Agrupa por día o por semana (media) según el periodo. */
  const series = (get: (d: string) => number | null, digits = 0): Point[] => {
    if (!weekly) return range.map((d) => ({ label: days <= 7 ? formatWeekdayNarrow(d) : formatShort(d).split(' ')[0], full: formatDate(d), value: get(d) }));
    const weeks = new Map<string, number[]>();
    range.forEach((d) => {
      const v = get(d);
      const k = startOfWeek(d);
      if (!weeks.has(k)) weeks.set(k, []);
      if (v !== null) weeks.get(k)!.push(v);
    });
    return [...weeks.entries()].map(([k, vs]) => ({ label: formatShort(k), full: `Semana del ${formatDate(k)}`, value: vs.length ? Number(avg(vs).toFixed(digits)) : null }));
  };

  // Peso
  const weights = useMemo(() => [...data.weights].sort((a, b) => a.date.localeCompare(b.date)), [data.weights]);
  const wInRange = weights.filter((w) => w.date >= from);
  const wPoints: Point[] = wInRange.map((w) => ({ label: formatShort(w.date), full: formatDate(w.date), value: w.kg }));
  const wChange = wInRange.length >= 2 ? wInRange[wInRange.length - 1].kg - wInRange[0].kg : null;
  const lastW = weights[weights.length - 1];

  // Cumplimiento y hábitos
  const adherence = series((d) => mealAdherence(data, d));
  const advVals = range.map((d) => mealAdherence(data, d)).filter((v): v is number => v !== null);
  const habitPct = series((d) => (d <= today ? dayHabits(data, d).pct : null));

  // Pasos
  const stepsMap = new Map(data.steps.map((s) => [s.date, s.steps]));
  const stepsSeries = series((d) => stepsMap.get(d) ?? null);
  const stepVals = range.map((d) => stepsMap.get(d)).filter((v): v is number => v !== undefined);

  // Actividad: minutos por semana
  const sessionsIn = data.sessions.filter((s) => s.date >= from && s.date <= today);
  const actWeeks = new Map<string, number>();
  rangeDays(startOfWeek(from), today).forEach((d) => actWeeks.set(startOfWeek(d), 0));
  sessionsIn.forEach((s) => actWeeks.set(startOfWeek(s.date), (actWeeks.get(startOfWeek(s.date)) ?? 0) + s.minutes));
  const actSeries: Point[] = [...actWeeks.entries()].map(([k, v]) => ({ label: formatShort(k), full: `Semana del ${formatDate(k)}`, value: v }));

  // Semana actual frente a la anterior
  const thisMon = startOfWeek(today);
  const cmp = (fromD: string, toD: string) => {
    const ds = rangeDays(fromD, toD);
    const adh = ds.map((d) => mealAdherence(data, d)).filter((v): v is number => v !== null);
    const st = ds.map((d) => stepsMap.get(d)).filter((v): v is number => v !== undefined);
    return {
      adh: adh.length ? Math.round(avg(adh)) : null,
      habits: Math.round(avg(ds.map((d) => dayHabits(data, d).pct))),
      steps: st.length ? Math.round(avg(st)) : null,
      minutes: data.sessions.filter((s) => s.date >= fromD && s.date <= toD).reduce((a, s) => a + s.minutes, 0),
    };
  };
  const cur = cmp(thisMon, today);
  const prev = cmp(addDays(thisMon, -7), addDays(thisMon, -1));
  const monthStart = today.slice(0, 8) + '01';
  const month = cmp(monthStart, today);

  const demoSteps = data.steps.some((s) => s.demo && s.date >= from);
  const demoWeights = wInRange.some((w) => w.demo);
  const latestM = [...data.measurements].sort((a, b) => b.date.localeCompare(a.date));
  const habits = data.habits.filter((h) => h.active);
  const gridDays = rangeDays(addDays(today, -Math.min(days, 28) + 1), today);

  return (
    <>
      <PageHeader title="Progreso" subtitle="Tendencias de tus registros" />

      <Segmented className="mb-5 max-w-md" label="Periodo" value={period} onChange={setPeriod} options={PERIODS} />

      {/* Resumen semanal y mensual */}
      <Card className="mb-5 p-5">
        <h2 className="mb-3 text-[17px] font-bold">Esta semana <span className="font-medium text-ink3">· frente a la anterior</span></h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Plan cumplido" value={cur.adh !== null ? `${cur.adh} %` : '—'} sub={prev.adh !== null ? `Anterior: ${prev.adh} %` : undefined} />
          <Stat label="Hábitos" value={`${cur.habits} %`} sub={`Anterior: ${prev.habits} %`} />
          <Stat label="Pasos / día" value={cur.steps !== null ? n0(cur.steps) : '—'} sub={prev.steps !== null ? `Anterior: ${n0(prev.steps)}` : undefined} />
          <Stat label="Minutos activos" value={n0(cur.minutes)} sub={`Anterior: ${n0(prev.minutes)}`} />
        </div>
        <p className="mt-4 border-t border-line/60 pt-3 text-[13px] text-ink2">
          En lo que va de mes: plan cumplido {month.adh ?? '—'} % · hábitos {month.habits} % · {n0(month.minutes)} min de actividad.
        </p>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Peso */}
        <ChartCard
          title="Peso"
          icon={<Scale size={18} />}
          demo={demoWeights}
          aside={<Button size="sm" variant="tinted" icon={<Plus size={16} />} onClick={() => setWeightSheet({ entry: null })}>Registrar</Button>}
          footer={
            <div className="flex items-start justify-between gap-3">
              <p className="flex items-start gap-1.5 text-[12px] leading-snug text-ink3">
                <Info size={14} className="mt-[1px] shrink-0" />
                El peso refleja agua, digestión y masa muscular, no solo grasa. Fíjate en la tendencia, no en un día suelto.
              </p>
              <Button size="sm" variant="ghost" icon={<List size={16} />} onClick={() => setRecords('peso')}>Registros</Button>
            </div>
          }
        >
          {wPoints.length >= 2 ? (
            <>
              <div className="mb-2 flex gap-6">
                <Stat label="Último" value={`${n1(lastW.kg)} kg`} sub={formatDate(lastW.date)} />
                {wChange !== null && <Stat label="Cambio en el periodo" value={`${wChange > 0 ? '+' : wChange < 0 ? '−' : ''}${n1(Math.abs(wChange))} kg`} sub={`${wInRange.length} registros`} />}
              </div>
              <TrendLine data={wPoints} unit="kg" />
            </>
          ) : (
            <EmptyState icon={<Scale size={24} />} title="Datos insuficientes">
              {weights.length ? 'Necesitas al menos dos registros en este periodo para ver la tendencia.' : 'Registra tu peso para empezar a ver su evolución.'}
            </EmptyState>
          )}
        </ChartCard>

        {/* Medidas */}
        <ChartCard
          title="Medidas corporales"
          icon={<Ruler size={18} />}
          demo={latestM.some((m) => m.demo)}
          aside={<Button size="sm" variant="tinted" icon={<Plus size={16} />} onClick={() => setMeasureSheet({ entry: null })}>Registrar</Button>}
          footer={latestM.length > 0 && <div className="flex justify-end"><Button size="sm" variant="ghost" icon={<List size={16} />} onClick={() => setRecords('medidas')}>Registros</Button></div>}
        >
          {latestM.length ? (
            <>
              <p className="mb-3 text-[13px] text-ink3">Último registro: {formatDate(latestM[0].date)}{latestM[1] ? ` · comparado con ${formatDate(latestM[1].date)}` : ''}</p>
              <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {MEASURES.map(([k, label]) => {
                  const v = latestM[0][k];
                  const p = latestM.slice(1).find((m) => m[k] !== undefined)?.[k];
                  if (v === undefined) return null;
                  const d = p !== undefined ? v - p : null;
                  return (
                    <div key={k} className="rounded-[14px] bg-surface2 px-3 py-2.5">
                      <dt className="text-[12px] font-medium text-ink2">{label}</dt>
                      <dd className="tabular text-[18px] font-bold">{n1(v)} <span className="text-[12px] font-semibold text-ink3">cm</span></dd>
                      {d !== null && <dd className="tabular text-[12px] text-ink3">{d === 0 ? 'Sin cambios' : `${d > 0 ? '+' : '−'}${n1(Math.abs(d))} cm`}</dd>}
                    </div>
                  );
                })}
              </dl>
            </>
          ) : (
            <EmptyState icon={<Ruler size={24} />} title="Sin medidas">Registra cintura, cadera u otras medidas si te resultan útiles. Son opcionales.</EmptyState>
          )}
        </ChartCard>

        {/* Cumplimiento del plan */}
        <ChartCard title="Cumplimiento del plan" icon={<Utensils size={18} />} demo={data.isDemo} aside={<span className="tabular text-[14px] font-semibold text-ink2">{advVals.length ? `${Math.round(avg(advVals))} % de media` : ''}</span>}>
          {advVals.length ? <Bars data={adherence} unit="%" max={100} /> : <EmptyState icon={<Utensils size={24} />} title="Sin datos">Marca tus comidas como hechas para ver el cumplimiento.</EmptyState>}
          <p className="mt-2 text-[12px] text-ink3">Porcentaje de comidas del plan marcadas como hechas{weekly ? ' (media semanal)' : ''}.</p>
        </ChartCard>

        {/* Consistencia de hábitos */}
        <ChartCard title="Consistencia de hábitos" icon={<ListChecks size={18} />} demo={data.isDemo}>
          <div className="no-scrollbar overflow-x-auto">
            <table className="w-full border-separate border-spacing-[3px] text-[12px]">
              <caption className="sr-only">Hábitos cumplidos en los últimos {gridDays.length} días</caption>
              <tbody>
                {habits.map((h) => {
                  const Icon = HABIT_ICONS[h.icon];
                  return (
                    <tr key={h.id}>
                      <th scope="row" className="pr-2 text-left font-medium text-ink2">
                        <span className="flex items-center gap-1.5 whitespace-nowrap"><Icon size={14} /> <span className="hidden sm:inline">{h.name}</span></span>
                      </th>
                      {gridDays.map((d) => {
                        const s = dayHabits(data, d).states.find((x) => x.habit.id === h.id);
                        const state = !s || !s.applicable ? 'na' : s.done ? 'ok' : 'no';
                        return (
                          <td key={d} title={`${h.name} · ${formatDate(d)}: ${state === 'ok' ? 'hecho' : state === 'na' ? 'no aplica' : 'no hecho'}`}>
                            <span className={cx('block h-3.5 w-full min-w-[8px] rounded-[4px]', state === 'ok' ? 'bg-accent' : state === 'na' ? 'bg-transparent ring-1 ring-inset ring-line' : 'bg-surface2')} />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-[12px] text-ink3">
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-[3px] bg-accent" /> Hecho</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-[3px] bg-surface2 ring-1 ring-inset ring-line/50" /> No hecho</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-[3px] ring-1 ring-inset ring-line" /> No aplica</span>
            <span>Últimos {gridDays.length} días</span>
          </div>
          <div className="mt-4"><Bars data={habitPct} unit="%" max={100} height={120} /></div>
        </ChartCard>

        {/* Pasos */}
        <ChartCard title="Pasos" icon={<Footprints size={18} />} demo={demoSteps} aside={<span className="tabular text-[14px] font-semibold text-ink2">{stepVals.length ? `${n0(avg(stepVals))} / día` : ''}</span>}>
          {stepVals.length ? (
            <><Bars data={stepsSeries} unit="pasos" target={data.profile.stepsTarget} /><p className="mt-2 text-[12px] text-ink3">La línea discontinua marca tu objetivo de {n0(data.profile.stepsTarget)} pasos.</p></>
          ) : (
            <EmptyState icon={<Footprints size={24} />} title="Sin pasos registrados">Añade tus pasos desde Hoy o Actividad.</EmptyState>
          )}
        </ChartCard>

        {/* Actividad */}
        <ChartCard title="Actividad física" icon={<Timer size={18} />} demo={sessionsIn.some((s) => s.demo)} aside={<span className="tabular text-[14px] font-semibold text-ink2">{sessionsIn.length} sesiones</span>}>
          {sessionsIn.length ? (
            <Bars data={actSeries} unit="min" />
          ) : (
            <EmptyState icon={<Timer size={24} />} title="Sin sesiones">Registra tus sesiones en Actividad física.</EmptyState>
          )}
          <p className="mt-2 text-[12px] text-ink3">Minutos de actividad registrados por semana.</p>
        </ChartCard>
      </div>

      <WeightSheet open={!!weightSheet} entry={weightSheet?.entry ?? null} onClose={() => setWeightSheet(null)} />
      <MeasurementSheet open={!!measureSheet} entry={measureSheet?.entry ?? null} onClose={() => setMeasureSheet(null)} />
      <RecordsSheet
        open={!!records}
        kind={records ?? 'peso'}
        onClose={() => setRecords(null)}
        onEdit={(e) => {
          setRecords(null);
          if ('kg' in e) setWeightSheet({ entry: e });
          else setMeasureSheet({ entry: e });
        }}
      />
    </>
  );
}
