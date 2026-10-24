import { useEffect, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Dumbbell, Footprints, Home, Moon, Pencil, Plus, Trash2, TreePine } from 'lucide-react';
import type { ActivitySession, ActivityType, ISODate } from '../types';
import { PageHeader } from '../components/layout/AppShell';
import { Badge, Button, Card, DemoBadge, IconButton, ProgressBar, SectionTitle, Segmented, SelectField, TextField, cx } from '../components/ui/primitives';
import { Sheet } from '../components/ui/Sheet';
import { useFeedback } from '../components/ui/Feedback';
import { useData, useStore } from '../store/AppStore';
import { addDays, formatLong, formatWeekRange, formatWeekdayShort, fromISO, startOfWeek, todayISO, weekDates, weekdayIndex } from '../lib/dates';
import { n0, uid } from '../lib/format';
import { navigate } from '../lib/router';
import { DEMO_ROUTINES } from '../data/routines';
import { StepsSheet } from '../features/activity/StepsSheet';

const TYPE_META: Record<ActivityType, { label: string; icon: typeof Home }> = {
  casa: { label: 'En casa', icon: Home },
  gimnasio: { label: 'Gimnasio', icon: Dumbbell },
  general: { label: 'Actividad general', icon: TreePine },
  descanso: { label: 'Descanso', icon: Moon },
};

const PREF_LABEL = { casa: 'entrenar en casa', gimnasio: 'ir al gimnasio', caminar: 'caminar', mixto: 'combinar actividades', ninguno: 'sin plan de actividad' } as const;

export function ActivityPage({ weekParam }: { weekParam: string | null }) {
  const data = useData();
  const today = todayISO();
  const monday = startOfWeek(weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam) ? weekParam : today);
  const [planDay, setPlanDay] = useState<number | null>(null);
  const [session, setSession] = useState<{ date: ISODate; entry: ActivitySession | null } | null>(null);
  const [stepsDate, setStepsDate] = useState<ISODate | null>(null);
  const [routineId, setRoutineId] = useState<string | null>(null);

  const weekSessions = data.sessions.filter((s) => s.date >= monday && s.date <= addDays(monday, 6));
  const minutes = weekSessions.reduce((a, s) => a + s.minutes, 0);
  const plannedMin = data.activityPlan.reduce((a, d) => a + d.minutes, 0);
  const stepsWeek = weekDates(monday).map((d) => data.steps.find((s) => s.date === d)?.steps ?? 0);
  const maxSteps = Math.max(data.profile.stepsTarget, ...stepsWeek);

  return (
    <>
      <PageHeader
        title="Actividad física"
        subtitle={data.profile.training ? `Plan basado en tu preferencia: ${PREF_LABEL[data.profile.training]}` : 'Organiza tu actividad semanal'}
        actions={<IconButton label="Registrar sesión" variant="primary" onClick={() => setSession({ date: today, entry: null })}><Plus size={22} /></IconButton>}
      />

      <div className="mb-5 flex items-center justify-between gap-2">
        <IconButton label="Semana anterior" onClick={() => navigate('actividad', { w: addDays(monday, -7) })}><ChevronLeft size={20} /></IconButton>
        <div className="text-center">
          <p className="text-[16px] font-bold">{formatWeekRange(monday)}</p>
          {monday !== startOfWeek(today) ? <button type="button" className="text-[13px] font-semibold text-accent" onClick={() => navigate('actividad')}>Esta semana</button> : <p className="text-[13px] text-ink3">Esta semana</p>}
        </div>
        <IconButton label="Semana siguiente" onClick={() => navigate('actividad', { w: addDays(monday, 7) })}><ChevronRight size={20} /></IconButton>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <ul className="space-y-2">
            {weekDates(monday).map((d) => {
              const p = data.activityPlan.find((x) => x.weekday === weekdayIndex(d))!;
              const ses = data.sessions.filter((s) => s.date === d);
              const Icon = TYPE_META[p.type].icon;
              const done = ses.length > 0;
              const past = d < today;
              return (
                <li key={d}>
                  <Card as="article" className={cx('flex items-center gap-3 p-3', d === today && 'ring-2 ring-accent/50')}>
                    <div className="w-11 shrink-0 text-center">
                      <p className={cx('text-[12px] font-semibold', d === today ? 'text-accent' : 'text-ink3')}>{formatWeekdayShort(d)}</p>
                      <p className="tabular text-[19px] font-bold leading-none">{fromISO(d).getDate()}</p>
                    </div>
                    <button type="button" onClick={() => setPlanDay(weekdayIndex(d))} className="flex min-w-0 flex-1 items-center gap-3 rounded-[12px] p-1 text-left hover:bg-surface2/50">
                      <span className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px]', done ? 'bg-accent text-accentInk' : 'bg-surface2 text-ink2')}>
                        {done ? <Check size={19} strokeWidth={2.6} /> : <Icon size={19} />}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[15px] font-semibold">{done ? ses.map((s) => s.title).join(' · ') : p.title}</span>
                        <span className="block text-[13px] text-ink2">
                          {done ? `Completada · ${ses.reduce((a, s) => a + s.minutes, 0)} min` : p.type === 'descanso' ? 'Recuperación' : `${TYPE_META[p.type].label} · ${p.minutes} min${past ? ' · no registrada' : ''}`}
                        </span>
                      </span>
                    </button>
                    {p.type !== 'descanso' && !done && d <= today && (
                      <Button size="sm" variant="tinted" onClick={() => setSession({ date: d, entry: null })}>Registrar</Button>
                    )}
                    {done && (
                      <IconButton label="Editar sesión" onClick={() => setSession({ date: d, entry: ses[0] })}><Pencil size={17} /></IconButton>
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 px-1 text-[13px] text-ink3">Toca un día para cambiar lo planificado. Las rutinas incluidas son de demostración.</p>

          <SectionTitle>Sesiones de la semana</SectionTitle>
          {weekSessions.length === 0 ? (
            <Card><p className="p-5 text-[15px] text-ink2">Aún no hay sesiones registradas esta semana.</p></Card>
          ) : (
            <Card as="div" className="divide-y divide-line/60">
              {weekSessions.sort((a, b) => a.date.localeCompare(b.date)).map((s) => (
                <div key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold">{s.title} {s.demo && <DemoBadge className="ml-1" />}</p>
                    <p className="text-[13px] text-ink2">{formatLong(s.date)} · {s.minutes} min · {TYPE_META[s.type].label}</p>
                    {s.notes && <p className="mt-0.5 text-[13px] italic text-ink3">{s.notes}</p>}
                  </div>
                  <IconButton label="Editar sesión" onClick={() => setSession({ date: s.date, entry: s })}><Pencil size={17} /></IconButton>
                </div>
              ))}
            </Card>
          )}
        </div>

        <aside className="space-y-4">
          <Card className="p-5">
            <h2 className="text-[15px] font-semibold text-ink2">Minutos activos</h2>
            <p className="tabular text-[30px] font-bold leading-tight">{n0(minutes)} <span className="text-[15px] font-semibold text-ink3">de {n0(plannedMin)} planificados</span></p>
            <div className="mt-2"><ProgressBar value={minutes} max={Math.max(plannedMin, 1)} label="Minutos activos" /></div>
            <p className="mt-2 text-[13px] text-ink3">{weekSessions.length} sesión(es) registrada(s)</p>
          </Card>
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-[15px] font-semibold"><Footprints size={17} /> Pasos de la semana</h2>
              <span className="text-[12px] text-ink3">Obj. {n0(data.profile.stepsTarget)}</span>
            </div>
            <div className="flex h-28 items-end gap-1.5">
              {weekDates(monday).map((d, i) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => d <= today && setStepsDate(d)}
                  disabled={d > today}
                  aria-label={`${formatLong(d)}: ${stepsWeek[i] ? `${n0(stepsWeek[i])} pasos` : 'sin registrar'}. Editar`}
                  className="group flex h-full flex-1 flex-col items-center justify-end gap-1 disabled:opacity-40"
                >
                  <span className="relative w-full flex-1">
                    <span
                      className={cx('absolute bottom-0 w-full rounded-t-[4px] transition-all', stepsWeek[i] >= data.profile.stepsTarget ? 'bg-accent' : 'bg-accent/45', 'group-hover:brightness-110')}
                      style={{ height: `${(stepsWeek[i] / maxSteps) * 100}%`, minHeight: stepsWeek[i] ? 3 : 0 }}
                    />
                  </span>
                  <span className={cx('text-[11px] font-semibold', d === today ? 'text-accent' : 'text-ink3')}>{formatWeekdayShort(d).slice(0, 1)}</span>
                </button>
              ))}
            </div>
            <Button className="mt-3 w-full" size="sm" variant="secondary" onClick={() => setStepsDate(today)}>Registrar pasos de hoy</Button>
          </Card>
          <Card className="p-5">
            <h2 className="mb-2 text-[15px] font-semibold">Rutinas <DemoBadge className="ml-1" /></h2>
            <ul className="space-y-1">
              {DEMO_ROUTINES.map((r) => (
                <li key={r.id}>
                  <button type="button" onClick={() => setRoutineId(r.id)} className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-[10px] px-2 text-left text-[14px] hover:bg-surface2">
                    <span className="font-medium">{r.name}</span>
                    <span className="text-ink3">{r.minutes} min</span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>

      <PlanDaySheet weekday={planDay} onClose={() => setPlanDay(null)} />
      <SessionSheet open={!!session} date={session?.date ?? today} entry={session?.entry ?? null} onClose={() => setSession(null)} />
      <StepsSheet open={!!stepsDate} date={stepsDate ?? today} onClose={() => setStepsDate(null)} />
      <RoutineSheet id={routineId} onClose={() => setRoutineId(null)} />
    </>
  );
}

const WEEKDAYS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

function PlanDaySheet({ weekday, onClose }: { weekday: number | null; onClose: () => void }) {
  const data = useData();
  const { mutate } = useStore();
  const { toast } = useFeedback();
  const current = weekday !== null ? data.activityPlan.find((d) => d.weekday === weekday) : undefined;
  const [type, setType] = useState<ActivityType>('general');
  const [routine, setRoutine] = useState<string>('');
  const [title, setTitle] = useState('');
  const [minutes, setMinutes] = useState('30');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (current) {
      setType(current.type);
      setRoutine(current.routineId ?? '');
      setTitle(current.title);
      setMinutes(String(current.minutes || 30));
      setErr(null);
    }
  }, [current, weekday]);

  if (weekday === null || !current) return null;
  const routines = DEMO_ROUTINES.filter((r) => r.type === type);

  const save = () => {
    const m = Number(minutes);
    if (type !== 'descanso' && (!Number.isInteger(m) || m < 5 || m > 300)) {
      setErr('Duración entre 5 y 300 minutos.');
      return;
    }
    const r = DEMO_ROUTINES.find((x) => x.id === routine);
    mutate((d) => {
      const day = d.activityPlan.find((x) => x.weekday === weekday)!;
      day.type = type;
      day.routineId = type === 'descanso' ? undefined : r?.id;
      day.title = type === 'descanso' ? 'Descanso' : title.trim() || r?.name || TYPE_META[type].label;
      day.minutes = type === 'descanso' ? 0 : m;
    });
    toast(`Plan del ${WEEKDAYS[weekday]} actualizado`);
    onClose();
  };

  return (
    <Sheet open onClose={onClose} title={`Plan de los ${WEEKDAYS[weekday]}`} subtitle="Se aplica a todas las semanas" footer={<Button size="lg" onClick={save}>Guardar</Button>}>
      <div className="space-y-4">
        <div>
          <p className="mb-1.5 text-[14px] font-semibold text-ink2">Tipo</p>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(TYPE_META) as ActivityType[]).map((t) => {
              const Icon = TYPE_META[t].icon;
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={type === t}
                  onClick={() => {
                    setType(t);
                    const first = DEMO_ROUTINES.find((r) => r.type === t);
                    setRoutine(first?.id ?? '');
                    setTitle(first?.name ?? TYPE_META[t].label);
                    if (first) setMinutes(String(first.minutes));
                  }}
                  className={cx('press flex min-h-[52px] items-center gap-2 rounded-[14px] px-3 text-[15px] font-semibold ring-1', type === t ? 'bg-accentSoft text-accent-deep ring-accent' : 'bg-surface ring-line')}
                >
                  <Icon size={18} /> {TYPE_META[t].label}
                </button>
              );
            })}
          </div>
        </div>
        {type !== 'descanso' && (
          <>
            {routines.length > 0 && (
              <SelectField label="Rutina (demostración)" value={routine} onChange={(e) => {
                setRoutine(e.target.value);
                const r = DEMO_ROUTINES.find((x) => x.id === e.target.value);
                if (r) { setTitle(r.name); setMinutes(String(r.minutes)); }
              }}>
                <option value="">Sin rutina concreta</option>
                {routines.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </SelectField>
            )}
            <TextField label="Nombre" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={50} />
            <TextField label="Duración" inputMode="numeric" suffix="min" value={minutes} onChange={(e) => { setMinutes(e.target.value); setErr(null); }} error={err} />
          </>
        )}
      </div>
    </Sheet>
  );
}

function SessionSheet({ open, date: initialDate, entry, onClose }: { open: boolean; date: ISODate; entry: ActivitySession | null; onClose: () => void }) {
  const data = useData();
  const { mutate } = useStore();
  const { toast } = useFeedback();
  const [date, setDate] = useState(initialDate);
  const [type, setType] = useState<Exclude<ActivityType, 'descanso'>>('general');
  const [title, setTitle] = useState('');
  const [minutes, setMinutes] = useState('30');
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    const p = data.activityPlan.find((x) => x.weekday === weekdayIndex(initialDate));
    setDate(entry?.date ?? initialDate);
    setType(entry?.type ?? (p && p.type !== 'descanso' ? p.type : 'general'));
    setTitle(entry?.title ?? (p && p.type !== 'descanso' ? p.title : 'Paseo'));
    setMinutes(String(entry?.minutes ?? (p?.minutes || 30)));
    setNotes(entry?.notes ?? '');
    setErr({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, entry, initialDate]);

  const save = () => {
    const e: Record<string, string> = {};
    const m = Number(minutes);
    if (!Number.isInteger(m) || m < 1 || m > 600) e.minutes = 'Entre 1 y 600 minutos.';
    if (title.trim().length < 2) e.title = 'Escribe un nombre para la sesión.';
    if (date > todayISO()) e.date = 'No puedes registrar sesiones futuras.';
    setErr(e);
    if (Object.keys(e).length) return;
    mutate((d) => {
      if (entry) {
        const s = d.sessions.find((x) => x.id === entry.id);
        if (s) Object.assign(s, { date, type, title: title.trim(), minutes: m, notes: notes.trim() || undefined, demo: false });
      } else d.sessions.push({ id: uid('ses'), date, type, title: title.trim(), minutes: m, notes: notes.trim() || undefined });
    });
    toast(entry ? 'Sesión actualizada' : 'Sesión registrada');
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={entry ? 'Editar sesión' : 'Registrar sesión'}
      footer={
        <div className="flex gap-2">
          {entry && (
            <Button variant="destructive" icon={<Trash2 size={18} />} onClick={() => {
              mutate((d) => void (d.sessions = d.sessions.filter((s) => s.id !== entry.id)));
              toast('Sesión eliminada', { action: { label: 'Deshacer', onClick: () => mutate((d) => void d.sessions.push(entry)) } });
              onClose();
            }}>Eliminar</Button>
          )}
          <Button className="flex-1" onClick={save}>Guardar</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Segmented label="Tipo" value={type} onChange={setType} options={[{ value: 'casa', label: 'Casa' }, { value: 'gimnasio', label: 'Gimnasio' }, { value: 'general', label: 'General' }]} />
        <TextField label="Actividad" value={title} onChange={(e) => setTitle(e.target.value)} error={err.title} maxLength={50} data-autofocus />
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Duración" inputMode="numeric" suffix="min" value={minutes} onChange={(e) => setMinutes(e.target.value)} error={err.minutes} />
          <TextField label="Fecha" type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} error={err.date} />
        </div>
        <div>
          <label htmlFor="ses-notes" className="mb-1.5 block text-[14px] font-semibold text-ink2">Observaciones (opcional)</label>
          <textarea id="ses-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} placeholder="Cómo te has sentido, cargas, ritmo…" className="w-full resize-none rounded-[12px] bg-surface2 px-3.5 py-3 text-[17px] placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-accent" />
        </div>
      </div>
    </Sheet>
  );
}

function RoutineSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const r = DEMO_ROUTINES.find((x) => x.id === id);
  if (!r) return null;
  return (
    <Sheet open onClose={onClose} title={r.name} subtitle={<span className="inline-flex items-center gap-2">{TYPE_META[r.type].label} · {r.minutes} min <Badge tone="warn">Demo</Badge></span>}>
      <ol className="divide-y divide-line/60">
        {r.exercises.map((e, i) => (
          <li key={i} className="flex min-h-[52px] items-center justify-between gap-3 py-2">
            <span className="text-[16px] font-medium">{e.name}</span>
            <span className="tabular text-[14px] text-ink2">{e.detail}</span>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-[13px] leading-snug text-ink3">Rutina orientativa de demostración. Adapta la intensidad a tu nivel y consulta con un profesional si tienes lesiones o dudas.</p>
    </Sheet>
  );
}
