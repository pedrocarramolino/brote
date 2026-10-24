import { Check, ChevronRight, Minus, Plus } from 'lucide-react';
import type { ISODate } from '../../types';
import { useData, useStore } from '../../store/AppStore';
import { useFeedback } from '../../components/ui/Feedback';
import { dayHabits, type HabitState } from '../../services/habits';
import { HABIT_ICONS } from '../../components/ui/icons';
import { Card, ProgressBar, Ring, cx } from '../../components/ui/primitives';
import { navigate } from '../../lib/router';

export function HabitsCard({ date, onSteps }: { date: ISODate; onSteps: () => void }) {
  const data = useData();
  const { mutate } = useStore();
  const { toast } = useFeedback();
  const { states, done, total, pct } = dayHabits(data, date);

  const setLog = (habitId: string, value: number) =>
    mutate((d) => {
      d.habitLogs = d.habitLogs.filter((l) => !(l.date === date && l.habitId === habitId));
      if (value > 0) d.habitLogs.push({ date, habitId, value });
    });

  const toggle = (s: HabitState) => {
    const next = s.done ? 0 : 1;
    setLog(s.habit.id, next);
    if (next) toast(`${s.habit.name}: hecho`);
  };

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center gap-4">
        <Ring value={done} max={Math.max(total, 1)} size={52} stroke={6} label={`${pct} % de hábitos cumplidos`}>
          <span className="tabular text-[13px] font-bold">{pct}%</span>
        </Ring>
        <div className="min-w-0 flex-1">
          <h2 className="text-[19px] font-bold tracking-tight">Hábitos</h2>
          <p className="text-[14px] text-ink2">{done} de {total} cumplidos</p>
        </div>
        <button type="button" className="press h-10 rounded-full px-3 text-[14px] font-semibold text-accent hover:bg-accentSoft/60" onClick={() => navigate('perfil', { s: 'habitos' })}>
          Editar
        </button>
      </div>
      <ul className="divide-y divide-line/60">
        {states.map((s) => {
          const Icon = HABIT_ICONS[s.habit.icon];
          return (
            <li key={s.habit.id} className="flex min-h-[60px] items-center gap-3 py-2">
              <span className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] transition-colors', s.done ? 'bg-accent text-accentInk' : 'bg-surface2 text-ink2')}>
                <Icon size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold leading-tight">{s.habit.name}</p>
                <p className="tabular text-[13px] text-ink2">{s.label}</p>
                {s.habit.kind === 'agua' && <div className="mt-1.5 max-w-[180px]"><ProgressBar value={s.value} max={s.target} label="Vasos de agua" height={4} /></div>}
              </div>
              {s.habit.kind === 'agua' && (
                <div className="flex items-center gap-1" role="group" aria-label="Vasos de agua">
                  <button type="button" aria-label="Quitar un vaso" disabled={s.value <= 0} onClick={() => setLog(s.habit.id, Math.max(0, s.value - 1))} className="press flex h-10 w-10 items-center justify-center rounded-full bg-surface2 disabled:opacity-40">
                    <Minus size={17} />
                  </button>
                  <button
                    type="button"
                    aria-label="Añadir un vaso"
                    onClick={() => {
                      setLog(s.habit.id, s.value + 1);
                      if (s.value + 1 === s.target) toast('Objetivo de agua completado');
                    }}
                    className="press flex h-10 w-10 items-center justify-center rounded-full bg-accentSoft text-accent-deep"
                  >
                    <Plus size={17} />
                  </button>
                </div>
              )}
              {s.habit.kind === 'pasos' && (
                <button type="button" onClick={onSteps} className="press inline-flex h-10 items-center gap-1 rounded-full bg-surface2 px-3 text-[14px] font-semibold">
                  {s.value ? 'Editar' : 'Registrar'} <ChevronRight size={15} />
                </button>
              )}
              {s.habit.kind === 'comidas' && (
                <span className={cx('flex h-8 w-8 items-center justify-center rounded-full', s.done ? 'bg-accent text-accentInk' : 'ring-2 ring-inset ring-line')} aria-label={s.done ? 'Completado' : 'Pendiente'} role="img">
                  {s.done && <Check size={17} strokeWidth={3} />}
                </span>
              )}
              {(s.habit.kind === 'custom' || (s.habit.kind === 'actividad' && s.applicable)) && (
                <button
                  type="button"
                  aria-pressed={s.done}
                  aria-label={s.done ? `Desmarcar ${s.habit.name}` : `Marcar ${s.habit.name}`}
                  onClick={() => (s.habit.kind === 'actividad' && data.sessions.some((x) => x.date === date) ? navigate('actividad') : toggle(s))}
                  className="press -m-1.5 p-1.5"
                >
                  <span key={String(s.done)} className={cx('flex h-8 w-8 items-center justify-center rounded-full transition-colors', s.done ? 'anim-pop bg-accent text-accentInk' : 'ring-2 ring-inset ring-line hover:ring-accent/60')}>
                    {s.done && <Check size={17} strokeWidth={3} />}
                  </span>
                </button>
              )}
              {s.habit.kind === 'actividad' && !s.applicable && <span className="text-[13px] text-ink3">—</span>}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
