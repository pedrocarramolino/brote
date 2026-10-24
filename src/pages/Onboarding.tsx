import { useState } from 'react';
import { CalendarDays, ChevronLeft, ShieldCheck, ShoppingBasket, Sparkles } from 'lucide-react';
import type { Allergen, MealSlot, UserProfile } from '../types';
import { Button, Chip, Segmented, SelectField, TextField, Toggle, cx } from '../components/ui/primitives';
import { TagInput } from '../components/TagInput';
import { Logo } from '../components/layout/Logo';
import { useStore } from '../store/AppStore';
import { baseProfile, createUserData } from '../data/demo';
import { ALLERGEN_LABELS } from '../data/foods';
import { ALLERGENS, BUDGETS, COOK_TIMES, DIETS, DISLIKE_SUGGESTIONS, GOALS, LEVELS, REGIONS, TRAININGS } from '../data/options';
import { ALL_SLOTS, SLOT_META } from '../services/catalog';

const STEPS = ['Tú', 'Objetivo', 'Alimentación', 'Comidas', 'Cocina', 'Actividad', 'Listo'];

export function Onboarding() {
  const { replace, loadDemo } = useStore();
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [p, setP] = useState<UserProfile>(() => baseProfile());
  const [nameErr, setNameErr] = useState<string | null>(null);

  const up = <K extends keyof UserProfile>(k: K, v: UserProfile[K]) => setP((x) => ({ ...x, [k]: v }));

  if (!started) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-6 py-10">
        <div className="anim-page w-full max-w-md text-center">
          <div className="mx-auto mb-6 w-fit"><Logo size={76} /></div>
          <h1 className="text-[38px] font-bold leading-tight tracking-[-0.02em]">Brote</h1>
          <p className="mt-2 text-[18px] text-ink2">Tu alimentación organizada en un solo lugar.</p>
          <ul className="mx-auto mt-8 max-w-sm space-y-4 text-left">
            {[
              { icon: <CalendarDays size={20} />, t: 'Menú semanal a tu medida', d: 'Según tus gustos, alergias, horarios y tiempo para cocinar.' },
              { icon: <ShoppingBasket size={20} />, t: 'Compra automática', d: 'La lista se genera desde el menú y se actualiza si cambias un plato.' },
              { icon: <Sparkles size={20} />, t: 'Seguimiento sin agobios', d: 'Registra comidas, hábitos, actividad y progreso.' },
              { icon: <ShieldCheck size={20} />, t: 'Tus datos, en tu dispositivo', d: 'Sin cuentas: todo se guarda en este navegador.' },
            ].map((f) => (
              <li key={f.t} className="flex gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-accentSoft text-accent-deep">{f.icon}</span>
                <span><span className="block text-[16px] font-semibold">{f.t}</span><span className="block text-[14px] text-ink2">{f.d}</span></span>
              </li>
            ))}
          </ul>
          <div className="mt-10 space-y-2">
            <Button size="lg" onClick={() => setStarted(true)}>Crear mi plan</Button>
            <Button size="lg" variant="secondary" onClick={loadDemo}>Probar con datos de demostración</Button>
          </div>
          <p className="mt-4 text-[12px] text-ink3">Brote no sustituye a un dietista-nutricionista ni a un profesional sanitario.</p>
        </div>
      </div>
    );
  }

  const next = () => {
    if (step === 0 && !p.name.trim()) {
      setNameErr('Escribe tu nombre o un alias para continuar.');
      return;
    }
    if (step === STEPS.length - 1) {
      replace(createUserData({ ...p, name: p.name.trim() }));
      window.location.hash = '#/hoy';
      return;
    }
    setStep((s) => s + 1);
    window.scrollTo({ top: 0 });
  };
  const optional = step > 0 && step < STEPS.length - 1;

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-5 pb-6 pt-[max(20px,env(safe-area-inset-top))]">
      <div className="mb-6 flex items-center gap-2">
        <button type="button" aria-label="Atrás" onClick={() => (step ? setStep(step - 1) : setStarted(false))} className="press flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface2">
          <ChevronLeft size={22} />
        </button>
        <div className="flex flex-1 gap-1" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1} aria-label={`Paso ${step + 1} de ${STEPS.length}`}>
          {STEPS.map((s, i) => <span key={s} className={cx('h-1 flex-1 rounded-full transition-colors', i <= step ? 'bg-accent' : 'bg-line')} />)}
        </div>
        <span className="tabular w-11 text-right text-[13px] text-ink3">{step + 1}/{STEPS.length}</span>
      </div>

      <div key={step} className="anim-page flex-1">
        {step === 0 && (
          <>
            <h1 className="text-[28px] font-bold tracking-tight">¿Cómo te llamamos?</h1>
            <p className="mb-6 mt-1 text-[16px] text-ink2">Solo se usa para saludarte. Puede ser un alias.</p>
            <div className="space-y-4">
              <TextField label="Nombre o alias" value={p.name} onChange={(e) => { up('name', e.target.value); setNameErr(null); }} error={nameErr} maxLength={40} autoFocus autoComplete="nickname" onKeyDown={(e) => e.key === 'Enter' && next()} />
              <SelectField label="País o región" value={p.region} onChange={(e) => up('region', e.target.value)}>
                {REGIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </SelectField>
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <h1 className="text-[28px] font-bold tracking-tight">¿Qué te gustaría conseguir?</h1>
            <p className="mb-6 mt-1 text-[16px] text-ink2">Nos ayuda a ordenar las sugerencias. No generamos dietas clínicas.</p>
            <div className="grid gap-2">
              {GOALS.map((g) => (
                <button key={g.value} type="button" aria-pressed={p.goal === g.value} onClick={() => up('goal', g.value)} className={cx('press rounded-[16px] p-4 text-left ring-1', p.goal === g.value ? 'bg-accentSoft ring-2 ring-accent' : 'bg-surface ring-line')}>
                  <span className="block text-[17px] font-semibold">{g.label}</span>
                  <span className="block text-[14px] text-ink2">{g.hint}</span>
                </button>
              ))}
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <h1 className="text-[28px] font-bold tracking-tight">Tu alimentación</h1>
            <p className="mb-6 mt-1 text-[16px] text-ink2">El menú y las sustituciones respetarán estas preferencias.</p>
            <p className="mb-2 text-[14px] font-semibold text-ink2">Tipo de alimentación</p>
            <div className="mb-6 flex flex-wrap gap-2">{DIETS.map((d) => <Chip key={d.value} selected={p.dietType === d.value} onClick={() => up('dietType', d.value)}>{d.label}</Chip>)}</div>
            <p className="mb-2 text-[14px] font-semibold text-ink2">Alergias e intolerancias</p>
            <div className="mb-6 flex flex-wrap gap-2">
              {ALLERGENS.map((a) => (
                <Chip key={a} selected={p.allergies.includes(a)} onClick={() => up('allergies', p.allergies.includes(a) ? p.allergies.filter((x) => x !== a) : [...p.allergies, a as Allergen])}>{ALLERGEN_LABELS[a]}</Chip>
              ))}
            </div>
            <TagInput label="Alimentos que no te gustan" values={p.dislikes} onChange={(v) => up('dislikes', v)} suggestions={DISLIKE_SUGGESTIONS} placeholder="Escribe y pulsa Intro" />
          </>
        )}
        {step === 3 && (
          <>
            <h1 className="text-[28px] font-bold tracking-tight">Comidas y horarios</h1>
            <p className="mb-6 mt-1 text-[16px] text-ink2">Elige cuántas comidas haces y a qué hora sueles hacerlas.</p>
            <ul className="divide-y divide-line/60 rounded-[16px] bg-surface px-4 ring-1 ring-line/60">
              {ALL_SLOTS.map((s) => {
                const on = p.mealSlots.includes(s);
                return (
                  <li key={s} className="flex min-h-[60px] items-center gap-3">
                    <span className="flex-1 text-[17px] font-medium">{SLOT_META[s].label}</span>
                    <label htmlFor={`ob-${s}`} className="sr-only">Hora de {SLOT_META[s].label}</label>
                    <input id={`ob-${s}`} type="time" disabled={!on} value={p.schedule[s] ?? SLOT_META[s].time} onChange={(e) => e.target.value && up('schedule', { ...p.schedule, [s]: e.target.value })} className="tabular h-10 rounded-[10px] bg-surface2 px-2 text-[16px] disabled:opacity-40" />
                    <Toggle hideLabel label={`Incluir ${SLOT_META[s].label}`} checked={on} onChange={(v) => {
                      if (!v && p.mealSlots.length <= 1) return;
                      up('mealSlots', v ? ALL_SLOTS.filter((x) => x === s || p.mealSlots.includes(x)) : (p.mealSlots.filter((x) => x !== s) as MealSlot[]));
                    }} />
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 px-1 text-[13px] text-ink3">{p.mealSlots.length} comidas al día</p>
          </>
        )}
        {step === 4 && (
          <>
            <h1 className="text-[28px] font-bold tracking-tight">En la cocina</h1>
            <p className="mb-6 mt-1 text-[16px] text-ink2">Para proponerte recetas que encajen con tu día a día.</p>
            <p className="mb-2 text-[14px] font-semibold text-ink2">Tiempo máximo por receta</p>
            <Segmented label="Tiempo máximo por receta" value={String(p.cookingTime ?? 30)} onChange={(v) => up('cookingTime', Number(v) as UserProfile['cookingTime'])} options={COOK_TIMES.map((c) => ({ value: String(c.value), label: c.label }))} />
            <p className="mb-2 mt-6 text-[14px] font-semibold text-ink2">Presupuesto orientativo</p>
            <Segmented label="Presupuesto" value={p.budget ?? 'medio'} onChange={(v) => up('budget', v)} options={BUDGETS} />
          </>
        )}
        {step === 5 && (
          <>
            <h1 className="text-[28px] font-bold tracking-tight">Actividad</h1>
            <p className="mb-6 mt-1 text-[16px] text-ink2">No hace falta ir al gimnasio: adaptamos el plan a lo que prefieras.</p>
            <div className="mb-6 grid gap-2">
              {LEVELS.map((l) => (
                <button key={l.value} type="button" aria-pressed={p.activityLevel === l.value} onClick={() => up('activityLevel', l.value)} className={cx('press rounded-[16px] px-4 py-3 text-left ring-1', p.activityLevel === l.value ? 'bg-accentSoft ring-2 ring-accent' : 'bg-surface ring-line')}>
                  <span className="block text-[16px] font-semibold">{l.label}</span>
                  <span className="block text-[14px] text-ink2">{l.hint}</span>
                </button>
              ))}
            </div>
            <p className="mb-2 text-[14px] font-semibold text-ink2">¿Cómo prefieres moverte?</p>
            <div className="flex flex-wrap gap-2">{TRAININGS.map((t) => <Chip key={t.value} selected={p.training === t.value} onClick={() => up('training', t.value)}>{t.label}</Chip>)}</div>
          </>
        )}
        {step === 6 && (
          <>
            <h1 className="text-[28px] font-bold tracking-tight">Todo listo, {p.name.trim()}</h1>
            <p className="mb-6 mt-1 text-[16px] text-ink2">Crearemos tu menú de esta semana con estas preferencias. Puedes cambiarlas cuando quieras en Perfil.</p>
            <dl className="divide-y divide-line/60 rounded-[16px] bg-surface px-4 ring-1 ring-line/60">
              {[
                ['Objetivo', GOALS.find((g) => g.value === p.goal)?.label ?? 'Sin indicar'],
                ['Alimentación', DIETS.find((d) => d.value === p.dietType)?.label ?? 'Sin indicar'],
                ['Alergias', p.allergies.length ? p.allergies.map((a) => ALLERGEN_LABELS[a]).join(', ') : 'Ninguna'],
                ['No te gusta', p.dislikes.length ? p.dislikes.join(', ') : 'Nada en especial'],
                ['Comidas al día', String(p.mealSlots.length)],
                ['Tiempo de cocina', COOK_TIMES.find((c) => c.value === p.cookingTime)?.label ?? 'Sin límite'],
                ['Actividad', TRAININGS.find((t) => t.value === p.training)?.label ?? 'Caminar'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-3 text-[15px]"><dt className="text-ink2">{k}</dt><dd className="text-right font-medium">{v}</dd></div>
              ))}
            </dl>
            <p className="mt-4 rounded-[14px] bg-surface2 px-4 py-3 text-[13px] leading-snug text-ink2">
              No fijamos objetivos calóricos automáticamente. Si quieres, puedes añadirlos en Perfil › Objetivos nutricionales, idealmente con la ayuda de un profesional.
            </p>
          </>
        )}
      </div>

      <div className="safe-bottom sticky bottom-0 mt-8 space-y-2 bg-bg pt-3">
        <Button size="lg" onClick={next}>{step === STEPS.length - 1 ? 'Crear mi plan' : 'Continuar'}</Button>
        {optional && <Button size="lg" variant="plain" onClick={() => setStep((s) => s + 1)}>Omitir</Button>}
      </div>
    </div>
  );
}
