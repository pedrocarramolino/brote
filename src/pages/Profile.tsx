import { useEffect, useState, type ReactNode } from 'react';
import { Activity, ChevronRight, ClipboardCopy, Cloud, Database, Download, FlaskConical, Globe, Plus, RefreshCw, Sparkles, Trash2 } from 'lucide-react';
import type { Allergen, Habit, MealSlot, UserProfile } from '../types';
import { PageHeader } from '../components/layout/AppShell';
import { Badge, Button, Card, Chip, IconButton, Segmented, SelectField, Stepper, TextField, Toggle, cx } from '../components/ui/primitives';
import { TagInput } from '../components/TagInput';
import { useFeedback } from '../components/ui/Feedback';
import { useData, useStore } from '../store/AppStore';
import { useAI } from '../hooks/useAI';
import { navigate } from '../lib/router';
import { n0, parseDecimal, uid } from '../lib/format';
import { todayISO } from '../lib/dates';
import { ALL_SLOTS, SLOT_META } from '../services/catalog';
import { EU_REFERENCE_INTAKE } from '../services/nutrition';
import { regenerateFrom } from '../services/planner';
import { defaultActivityPlan } from '../data/routines';
import { ALLERGEN_LABELS } from '../data/foods';
import { ALLERGENS, BUDGETS, COOK_TIMES, DIETS, DISLIKE_SUGGESTIONS, GOALS, LEVELS, REGIONS, TRAININGS } from '../data/options';
import { HABIT_ICONS } from '../components/ui/icons';

function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-t`} className="scroll-mt-6">
      <h2 id={`${id}-t`} className="mb-1 mt-8 px-1 text-[20px] font-bold tracking-tight">{title}</h2>
      {description && <p className="mb-3 px-1 text-[14px] text-ink2">{description}</p>}
      <Card className="p-5">{children}</Card>
    </section>
  );
}

export function ProfilePage({ section }: { section: string | null }) {
  const data = useData();
  const { mutate, loadDemo, clearAll } = useStore();
  const { toast, confirm } = useFeedback();
  const { status } = useAI();
  const p = data.profile;
  const [prefsChanged, setPrefsChanged] = useState(false);

  useEffect(() => {
    if (section) setTimeout(() => document.getElementById(section)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  }, [section]);

  const set = <K extends keyof UserProfile>(k: K, v: UserProfile[K], affectsPlan = false) => {
    mutate((d) => void (d.profile[k] = v));
    if (affectsPlan) setPrefsChanged(true);
  };

  const regenerate = async () => {
    const ok = await confirm({ title: '¿Actualizar el menú?', message: 'Se volverán a elegir los platos pendientes desde hoy según tus preferencias actuales. Lo ya marcado como hecho u omitido no cambia.', confirmLabel: 'Actualizar' });
    if (!ok) return;
    mutate((d) => regenerateFrom(d, todayISO()));
    setPrefsChanged(false);
    toast('Menú actualizado con tus preferencias');
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brote-datos-${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Archivo de datos descargado');
  };

  const restoreDemo = async () => {
    const ok = await confirm({ title: '¿Restaurar los datos de demostración?', message: 'Se sustituirán todos los datos actuales de este navegador por el perfil ficticio. Esta acción no se puede deshacer.', confirmLabel: 'Restaurar', destructive: true });
    if (ok) {
      loadDemo();
      toast('Datos de demostración restaurados');
      navigate('hoy');
    }
  };

  const deleteAll = async () => {
    const ok = await confirm({ title: '¿Borrar todos los datos?', message: 'Se eliminarán tu perfil, registros, menú y conversaciones de este navegador. Esta acción no se puede deshacer.', confirmLabel: 'Borrar todo', destructive: true });
    if (ok) {
      await clearAll();
      window.location.hash = '#/hoy';
    }
  };

  const goal = GOALS.find((g) => g.value === p.goal);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Perfil" subtitle="Preferencias, objetivos y ajustes" />

      <Card className="flex items-center gap-4 p-5">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accentSoft text-[26px] font-bold text-accent-deep">{(p.name || '?').charAt(0).toUpperCase()}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[21px] font-bold">{p.name || 'Sin nombre'}</p>
          <p className="text-[14px] text-ink2">{[goal?.label, DIETS.find((x) => x.value === p.dietType)?.label].filter(Boolean).join(' · ') || 'Completa tus preferencias'}</p>
          {data.isDemo && <Badge tone="warn" className="mt-1.5">Perfil de demostración</Badge>}
        </div>
      </Card>

      <Card as="div" className="mt-4 divide-y divide-line/60">
        {[
          { label: 'Asistente nutricional', sub: status?.mode === 'ia' ? 'IA conectada' : 'Modo demostración', icon: <Sparkles size={19} />, to: 'asistente' as const },
          { label: 'Actividad física', sub: 'Plan semanal, sesiones y pasos', icon: <Activity size={19} />, to: 'actividad' as const },
        ].map((r) => (
          <button key={r.to} type="button" onClick={() => navigate(r.to)} className="flex min-h-[60px] w-full items-center gap-3 px-4 text-left hover:bg-surface2/50">
            <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-accentSoft text-accent-deep">{r.icon}</span>
            <span className="flex-1"><span className="block text-[16px] font-semibold">{r.label}</span><span className="block text-[13px] text-ink2">{r.sub}</span></span>
            <ChevronRight size={18} className="text-ink3" />
          </button>
        ))}
      </Card>

      {prefsChanged && (
        <div className="sticky top-3 z-20 mt-4 flex items-center gap-3 rounded-[16px] bg-ink px-4 py-3 text-surface shadow-float">
          <RefreshCw size={18} className="shrink-0" />
          <p className="flex-1 text-[14px]">Has cambiado preferencias que afectan al menú. Los días ya generados no cambian hasta que los actualices.</p>
          <Button size="sm" variant="primary" onClick={regenerate}>Actualizar menú</Button>
        </div>
      )}

      <Section id="datos-basicos" title="Datos básicos">
        <div className="space-y-4">
          <NameField value={p.name} onSave={(v) => set('name', v)} />
          <SelectField label="País o región" value={p.region} onChange={(e) => set('region', e.target.value)}>
            {REGIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </SelectField>
          <p className="text-[13px] text-ink3">Fechas y números con formato español; cantidades en gramos y mililitros.</p>
        </div>
      </Section>

      <Section id="objetivo" title="Objetivo principal">
        <div className="grid gap-2 sm:grid-cols-2">
          {GOALS.map((g) => (
            <button key={g.value} type="button" aria-pressed={p.goal === g.value} onClick={() => set('goal', p.goal === g.value ? undefined : g.value)} className={cx('press rounded-[14px] p-3 text-left ring-1', p.goal === g.value ? 'bg-accentSoft ring-accent' : 'ring-line hover:bg-surface2')}>
              <span className={cx('block text-[15px] font-semibold', p.goal === g.value && 'text-accent-deep')}>{g.label}</span>
              <span className="block text-[13px] text-ink2">{g.hint}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section id="alimentacion" title="Alimentación" description="Se usa para generar el menú y filtrar las sustituciones.">
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-[14px] font-semibold text-ink2">Tipo de alimentación</p>
            <div className="flex flex-wrap gap-2">
              {DIETS.map((d) => <Chip key={d.value} selected={p.dietType === d.value} onClick={() => set('dietType', d.value, true)}>{d.label}</Chip>)}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[14px] font-semibold text-ink2">Alergias e intolerancias</p>
            <div className="flex flex-wrap gap-2">
              {ALLERGENS.map((a) => (
                <Chip key={a} selected={p.allergies.includes(a)} onClick={() => set('allergies', p.allergies.includes(a) ? p.allergies.filter((x) => x !== a) : [...p.allergies, a as Allergen], true)}>
                  {ALLERGEN_LABELS[a]}
                </Chip>
              ))}
            </div>
            <p className="mt-2 text-[12px] text-ink3">Brote filtra recetas según los alérgenos de sus ingredientes en la base, pero no puede garantizar la ausencia de trazas. Revisa siempre el etiquetado.</p>
          </div>
          <TagInput label="Alimentos que no te gustan" values={p.dislikes} onChange={(v) => set('dislikes', v, true)} suggestions={DISLIKE_SUGGESTIONS} placeholder="Escribe y pulsa Intro" />
          <TagInput label="Alimentos que te gustan (opcional)" values={p.likes} onChange={(v) => set('likes', v)} placeholder="Escribe y pulsa Intro" />
        </div>
      </Section>

      <Section id="comidas" title="Comidas y horarios">
        <ul className="divide-y divide-line/60">
          {ALL_SLOTS.map((s) => {
            const on = p.mealSlots.includes(s);
            return (
              <li key={s} className="flex min-h-[56px] items-center gap-2 py-1 xs:gap-3">
                <span className="min-w-0 flex-1 text-[16px] font-medium">{SLOT_META[s].label}</span>
                <label className="sr-only" htmlFor={`time-${s}`}>Hora de {SLOT_META[s].label}</label>
                <input
                  id={`time-${s}`}
                  type="time"
                  value={p.schedule[s] ?? SLOT_META[s].time}
                  disabled={!on}
                  onChange={(e) => e.target.value && set('schedule', { ...p.schedule, [s]: e.target.value })}
                  className="tabular h-10 w-[104px] shrink-0 rounded-[10px] bg-surface2 px-2 text-[16px] disabled:opacity-40"
                />
                <Toggle
                  hideLabel
                  checked={on}
                  label={`Incluir ${SLOT_META[s].label}`}
                  onChange={(v) => {
                    if (!v && p.mealSlots.length <= 1) return toast('Debe quedar al menos una comida', { tone: 'info' });
                    set('mealSlots', v ? ALL_SLOTS.filter((x) => x === s || p.mealSlots.includes(x)) : p.mealSlots.filter((x) => x !== s) as MealSlot[], true);
                  }}
                />
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-[13px] text-ink3">{p.mealSlots.length} comidas al día.</p>
      </Section>

      <Section id="cocina" title="Cocina y presupuesto">
        <p className="mb-2 text-[14px] font-semibold text-ink2">Tiempo máximo por receta</p>
        <Segmented label="Tiempo máximo por receta" value={String(p.cookingTime ?? 60)} onChange={(v) => set('cookingTime', Number(v) as UserProfile['cookingTime'], true)} options={COOK_TIMES.map((c) => ({ value: String(c.value), label: c.label }))} />
        <p className="mb-2 mt-5 text-[14px] font-semibold text-ink2">Presupuesto orientativo</p>
        <Segmented label="Presupuesto" value={p.budget ?? 'medio'} onChange={(v) => set('budget', v)} options={BUDGETS} />
        <p className="mt-2 text-[12px] text-ink3">El presupuesto se guarda para futuras recomendaciones; todavía no hay precios en la base de alimentos.</p>
      </Section>

      <TargetsSection />

      <Section id="actividad-pref" title="Actividad">
        <div className="space-y-5">
          <SelectField label="Nivel habitual de actividad" value={p.activityLevel ?? ''} onChange={(e) => set('activityLevel', (e.target.value || undefined) as UserProfile['activityLevel'])}>
            <option value="">Sin indicar</option>
            {LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label} — {l.hint}</option>)}
          </SelectField>
          <div>
            <p className="mb-2 text-[14px] font-semibold text-ink2">Preferencia de entrenamiento</p>
            <div className="flex flex-wrap gap-2">
              {TRAININGS.map((t) => <Chip key={t.value} selected={p.training === t.value} onClick={() => set('training', t.value)}>{t.label}</Chip>)}
            </div>
            <Button
              size="sm"
              variant="tinted"
              className="mt-3"
              onClick={async () => {
                if (await confirm({ title: '¿Aplicar al plan de actividad?', message: 'Se sustituirá tu plan semanal de actividad por uno basado en esta preferencia. Las sesiones registradas no cambian.', confirmLabel: 'Aplicar' })) {
                  mutate((d) => void (d.activityPlan = defaultActivityPlan(d.profile.training)));
                  toast('Plan de actividad actualizado');
                }
              }}
            >
              Aplicar al plan de actividad
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-[16px] font-medium">Objetivo de pasos</p><p className="text-[13px] text-ink2">Pasos al día</p></div>
            <Stepper label="objetivo de pasos" value={p.stepsTarget} min={2000} max={25000} step={500} format={(v) => n0(v)} onChange={(v) => set('stepsTarget', v)} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-[16px] font-medium">Objetivo de agua</p><p className="text-[13px] text-ink2">Vasos de 250 ml</p></div>
            <Stepper label="objetivo de agua" value={p.waterTarget} min={1} max={16} onChange={(v) => set('waterTarget', v)} />
          </div>
        </div>
      </Section>

      <HabitsSection />

      <Section id="datos" title="Privacidad y datos">
        <div className="space-y-1">
          <Toggle
            showState
            checked={p.shareContextWithAI}
            onChange={(v) => set('shareContextWithAI', v)}
            label="Compartir mi plan con el asistente IA"
            description="Solo se aplica cuando hay un servicio de IA conectado. Envía menú, preferencias, alergias, cumplimiento y lista de la compra; nunca peso ni medidas."
          />
          <Toggle
            showState
            checked={p.useOpenFoodFacts}
            onChange={(v) => set('useOpenFoodFacts', v)}
            label="Buscar en Open Food Facts"
            description="Al buscar un alimento, el texto de búsqueda se envía a world.openfoodfacts.org. No se envía ningún dato personal."
          />
        </div>
        <div className="mt-4 rounded-[14px] bg-surface2 px-4 py-3 text-[13px] leading-snug text-ink2">
          Tus datos de alimentación, peso y medidas se guardan únicamente en este navegador. No hay cuentas ni sincronización con servidores, y Brote no envía estadísticas de uso.
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Button variant="secondary" icon={<Download size={18} />} onClick={exportData}>Descargar datos</Button>
          <Button
            variant="secondary"
            icon={<ClipboardCopy size={18} />}
            onClick={() =>
              navigator.clipboard
                .writeText(JSON.stringify(data, null, 2))
                .then(() => toast('Datos copiados al portapapeles en formato JSON'))
                .catch(() => toast('Este navegador no permite copiar al portapapeles', { tone: 'info' }))
            }
          >
            Copiar datos (JSON)
          </Button>
          <Button variant="secondary" icon={<FlaskConical size={18} />} onClick={restoreDemo}>Restaurar demo</Button>
          <Button variant="destructive" icon={<Trash2 size={18} />} onClick={deleteAll}>Borrar todo</Button>
        </div>
        {data.isDemo && (
          <Button className="mt-3 w-full" onClick={async () => {
            if (await confirm({ title: '¿Crear tu propio perfil?', message: 'Se borrarán los datos de demostración y empezarás el cuestionario de bienvenida.', confirmLabel: 'Empezar', destructive: true })) {
              await clearAll();
              window.location.hash = '#/hoy';
            }
          }}>
            Dejar la demo y crear mi perfil
          </Button>
        )}
      </Section>

      <Section id="integraciones" title="Integraciones">
        <ul className="divide-y divide-line/60">
          {[
            { icon: <Sparkles size={18} />, name: 'Asistente con IA', state: status?.mode === 'ia' ? 'Conectado' : 'No configurado · modo demostración', ok: status?.mode === 'ia' },
            { icon: <Globe size={18} />, name: 'Open Food Facts', state: p.useOpenFoodFacts ? 'Activado' : 'Desactivado', ok: p.useOpenFoodFacts },
            { icon: <Cloud size={18} />, name: 'Cuenta y sincronización (Supabase)', state: 'No configurado · datos solo en este navegador', ok: false },
            { icon: <Database size={18} />, name: 'Salud de Apple / Google Fit', state: 'No disponible en la versión web', ok: false },
          ].map((i) => (
            <li key={i.name} className="flex min-h-[56px] items-center gap-3 py-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-surface2 text-ink2">{i.icon}</span>
              <span className="flex-1"><span className="block text-[15px] font-semibold">{i.name}</span><span className="block text-[13px] text-ink2">{i.state}</span></span>
              <span className={cx('h-2.5 w-2.5 rounded-full', i.ok ? 'bg-accent' : 'bg-line')} aria-hidden="true" />
            </li>
          ))}
        </ul>
      </Section>

      <p className="mb-6 mt-8 px-1 text-center text-[12px] leading-relaxed text-ink3">
        Brote es una herramienta de organización. No ofrece diagnóstico ni tratamiento y no sustituye el consejo de un dietista-nutricionista o de un profesional sanitario.
      </p>
    </div>
  );
}

function NameField({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(value);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    setV(value);
  }, [value]);
  const commit = () => {
    const t = v.trim();
    if (!t) return setErr('El nombre o alias no puede quedar vacío.');
    setErr(null);
    if (t !== value) onSave(t.slice(0, 40));
  };
  return <TextField label="Nombre o alias" value={v} onChange={(e) => setV(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && commit()} error={err} maxLength={40} autoComplete="nickname" />;
}

function TargetsSection() {
  const data = useData();
  const { mutate } = useStore();
  const { toast } = useFeedback();
  const t = data.profile.targets;
  const [v, setV] = useState({ kcal: '', protein: '', carbs: '', fat: '' });
  const [origin, setOrigin] = useState<NonNullable<typeof t.origin>>('usuario');
  const [err, setErr] = useState<Record<string, string>>({});

  useEffect(() => {
    setV({ kcal: t.kcal ? String(t.kcal) : '', protein: t.protein ? String(t.protein) : '', carbs: t.carbs ? String(t.carbs) : '', fat: t.fat ? String(t.fat) : '' });
    setOrigin(t.origin && t.origin !== 'demo' ? t.origin : 'usuario');
  }, [t.kcal, t.protein, t.carbs, t.fat, t.origin]);

  const kcalNum = parseDecimal(v.kcal);
  const lowWarning = Number.isFinite(kcalNum) && kcalNum > 0 && kcalNum < 1500;

  const save = () => {
    const e: Record<string, string> = {};
    const out: typeof t = { origin };
    const ranges = { kcal: [800, 6000], protein: [10, 400], carbs: [20, 900], fat: [10, 300] } as const;
    (Object.keys(ranges) as (keyof typeof ranges)[]).forEach((k) => {
      if (!v[k].trim()) return;
      const n = parseDecimal(v[k]);
      if (!Number.isFinite(n) || n < ranges[k][0] || n > ranges[k][1]) e[k] = `Entre ${ranges[k][0]} y ${n0(ranges[k][1])}.`;
      else out[k] = Math.round(n);
    });
    setErr(e);
    if (Object.keys(e).length) return;
    const hasAny = out.kcal || out.protein || out.carbs || out.fat;
    mutate((d) => void (d.profile.targets = hasAny ? out : {}));
    toast(hasAny ? 'Objetivos guardados' : 'Objetivos eliminados');
  };

  return (
    <Section id="objetivos" title="Objetivos nutricionales" description="Opcionales. Brote no calcula dietas ni objetivos calóricos por ti.">
      <div className="mb-4 rounded-[14px] bg-warnSoft px-4 py-3 text-[13px] leading-snug text-warn">
        Si tienes un objetivo de peso, una condición de salud, estás embarazada o en periodo de lactancia, o haces deporte de competición, define estos valores con un dietista-nutricionista.
      </div>
      {t.origin === 'demo' && <Badge tone="warn" className="mb-3">Valores de demostración</Badge>}
      <div className="grid grid-cols-1 gap-3 xs:grid-cols-2">
        <TextField label="Energía" inputMode="numeric" suffix="kcal" value={v.kcal} onChange={(e) => setV({ ...v, kcal: e.target.value })} error={err.kcal} placeholder="Opcional" />
        <TextField label="Proteínas" inputMode="numeric" suffix="g" value={v.protein} onChange={(e) => setV({ ...v, protein: e.target.value })} error={err.protein} placeholder="Opcional" />
        <TextField label="Hidratos" inputMode="numeric" suffix="g" value={v.carbs} onChange={(e) => setV({ ...v, carbs: e.target.value })} error={err.carbs} placeholder="Opcional" />
        <TextField label="Grasas" inputMode="numeric" suffix="g" value={v.fat} onChange={(e) => setV({ ...v, fat: e.target.value })} error={err.fat} placeholder="Opcional" />
      </div>
      {lowWarning && <p className="mt-2 text-[13px] font-medium text-warn">Es un objetivo bajo para un adulto. Te recomendamos fijarlo con supervisión profesional.</p>}
      <SelectField label="Origen de los objetivos" className="mt-4" value={origin} onChange={(e) => setOrigin(e.target.value as typeof origin)}>
        <option value="usuario">Los he decidido yo</option>
        <option value="profesional">Me los ha pautado un profesional</option>
        <option value="referencia">Referencia general (UE)</option>
      </SelectField>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={save}>Guardar objetivos</Button>
        <Button
          variant="secondary"
          onClick={() => {
            setV({ kcal: String(EU_REFERENCE_INTAKE.kcal), protein: String(EU_REFERENCE_INTAKE.protein), carbs: String(EU_REFERENCE_INTAKE.carbs), fat: String(EU_REFERENCE_INTAKE.fat) });
            setOrigin('referencia');
          }}
        >
          Rellenar con la referencia UE
        </Button>
        <Button variant="ghost" onClick={() => setV({ kcal: '', protein: '', carbs: '', fat: '' })}>Vaciar</Button>
      </div>
      <p className="mt-3 text-[12px] leading-snug text-ink3">La referencia UE (2.000 kcal, 50 g de proteínas, 260 g de hidratos y 70 g de grasas) es la ingesta de referencia de un adulto medio que se usa en el etiquetado (Reglamento 1169/2011). No es una recomendación personal.</p>
    </Section>
  );
}

function HabitsSection() {
  const data = useData();
  const { mutate } = useStore();
  const { toast, confirm } = useFeedback();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<Habit['icon']>('leaf');
  const [err, setErr] = useState<string | null>(null);

  const add = () => {
    const t = name.trim();
    if (t.length < 2) return setErr('Escribe el nombre del hábito.');
    if (data.habits.filter((h) => h.active).length >= 10) return setErr('Puedes tener hasta 10 hábitos activos.');
    mutate((d) => void d.habits.push({ id: uid('h'), name: t.slice(0, 40), kind: 'custom', icon, active: true }));
    setName('');
    setErr(null);
    toast('Hábito añadido');
  };

  const icons: Habit['icon'][] = ['leaf', 'moon', 'book', 'sun', 'check', 'droplet'];

  return (
    <Section id="habitos" title="Hábitos">
      <ul className="divide-y divide-line/60">
        {data.habits.map((h) => {
          const Icon = HABIT_ICONS[h.icon];
          return (
            <li key={h.id} className="flex min-h-[56px] items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-surface2 text-ink2"><Icon size={18} /></span>
              <span className="min-w-0 flex-1 text-[16px] font-medium">{h.name}</span>
              {h.kind === 'custom' && (
                <IconButton
                  label={`Eliminar ${h.name}`}
                  className="text-danger"
                  onClick={async () => {
                    if (await confirm({ title: `¿Eliminar «${h.name}»?`, message: 'También se borrará su historial.', confirmLabel: 'Eliminar', destructive: true })) {
                      mutate((d) => {
                        d.habits = d.habits.filter((x) => x.id !== h.id);
                        d.habitLogs = d.habitLogs.filter((l) => l.habitId !== h.id);
                      });
                    }
                  }}
                >
                  <Trash2 size={17} />
                </IconButton>
              )}
              <Toggle hideLabel checked={h.active} label={`Mostrar ${h.name}`} onChange={(v) => mutate((d) => void (d.habits.find((x) => x.id === h.id)!.active = v))} />
            </li>
          );
        })}
      </ul>
      <div className="mt-4 border-t border-line/60 pt-4">
        <TextField label="Nuevo hábito" value={name} onChange={(e) => { setName(e.target.value); setErr(null); }} error={err} placeholder="Por ejemplo: comer fruta de postre" maxLength={40} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <div className="mt-3 flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Icono del hábito">
          {icons.map((i) => {
            const Icon = HABIT_ICONS[i];
            return (
              <button key={i} type="button" role="radio" aria-checked={icon === i} aria-label={`Icono ${i}`} onClick={() => setIcon(i)} className={cx('press flex h-11 w-11 items-center justify-center rounded-[12px] ring-1', icon === i ? 'bg-accentSoft text-accent-deep ring-accent' : 'ring-line text-ink2')}>
                <Icon size={18} />
              </button>
            );
          })}
          <Button className="ml-auto" icon={<Plus size={18} />} onClick={add}>Añadir</Button>
        </div>
      </div>
    </Section>
  );
}
