import { useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import type { BurnEntry, ISODate } from '../../types';
import { Sheet } from '../../components/ui/Sheet';
import { Button, IconButton, ProgressBar, TextField } from '../../components/ui/primitives';
import { useData, useStore } from '../../store/AppStore';
import { useFeedback } from '../../components/ui/Feedback';
import { relativeDayLabel } from '../../lib/dates';
import { n0, uid } from '../../lib/format';
import { BURN_LIMITS, burnProgress } from '../../services/burn';

/**
 * Registro manual de calorías quemadas con actividad, como el de pasos: se escribe la cifra
 * (la del reloj o la app de ejercicio) y se guarda. Se pueden anotar varias en el mismo día,
 * editarlas o borrarlas. Cada día empieza en 0 y los días anteriores se conservan.
 */
export function BurnSheet({ open, onClose, date }: { open: boolean; onClose: () => void; date: ISODate }) {
  const data = useData();
  const { mutate } = useStore();
  const { toast } = useFeedback();
  const entries = (data.burned ?? []).filter((b) => b.date === date).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const p = burnProgress(data, date);
  const [kcal, setKcal] = useState('');
  const [note, setNote] = useState('');
  const [editing, setEditing] = useState<BurnEntry | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setKcal('');
      setNote('');
      setEditing(null);
      setError(null);
    }
  }, [open, date]);

  const save = () => {
    const n = Number(kcal.replace(/\./g, '').trim());
    const [lo, hi] = BURN_LIMITS.entry;
    if (!Number.isInteger(n) || n < lo || n > hi) {
      setError(`Introduce un número entero entre ${lo} y ${n0(hi)}.`);
      return;
    }
    const text = note.trim().slice(0, 40) || undefined;
    if (editing) {
      mutate((d) => {
        const e = d.burned.find((x) => x.id === editing.id);
        if (e) Object.assign(e, { kcal: n, note: text });
      });
      toast('Registro actualizado');
    } else {
      mutate((d) => void d.burned.push({ id: uid('burn'), date, kcal: n, note: text, createdAt: new Date().toISOString() }));
      toast(`${n0(n)} kcal quemadas añadidas`);
    }
    setKcal('');
    setNote('');
    setEditing(null);
  };

  const edit = (e: BurnEntry) => {
    setEditing(e);
    setKcal(String(e.kcal));
    setNote(e.note ?? '');
    setError(null);
  };

  const remove = (e: BurnEntry) => {
    mutate((d) => void (d.burned = d.burned.filter((x) => x.id !== e.id)));
    if (editing?.id === e.id) { setEditing(null); setKcal(''); setNote(''); }
    toast('Registro eliminado', { action: { label: 'Deshacer', onClick: () => mutate((d) => void d.burned.push(e)) } });
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Calorías quemadas"
      subtitle={relativeDayLabel(date)}
      footer={
        <div className="flex gap-2">
          {editing && <Button variant="secondary" onClick={() => { setEditing(null); setKcal(''); setNote(''); setError(null); }}>Cancelar</Button>}
          <Button className="flex-1" onClick={save} data-save-burn>{editing ? 'Guardar cambio' : 'Añadir'}</Button>
        </div>
      }
    >
      <div className="mb-4 rounded-[16px] bg-surface2/70 px-4 py-3" data-burn-summary>
        <p className="tabular text-[24px] font-bold leading-none">{n0(p.burned)} <span className="text-[15px] font-semibold text-ink3">kcal{p.target !== null ? ` de ${n0(p.target)}` : ''}</span></p>
        {p.target ? (
          <>
            <div className="mt-2"><ProgressBar value={p.burned} max={p.target} label="Calorías quemadas" height={5} /></div>
            <p className="tabular mt-1.5 text-[13px] text-ink2">{p.remaining ? `Faltan ${n0(p.remaining)} kcal` : 'Objetivo cumplido'} · {p.percent} %</p>
          </>
        ) : (
          <p className="mt-1 text-[13px] text-ink3">{p.target === 0 ? 'Con tu ingesta objetivo ya consigues el déficit: lo que quemes es margen extra.' : 'Sin objetivo. Puedes fijarlo en Perfil › Actividad.'}</p>
        )}
      </div>

      <div className="grid grid-cols-[1fr_1.2fr] gap-2">
        <TextField
          label={editing ? 'Editar kcal' : 'Kcal quemadas'}
          inputMode="numeric"
          value={kcal}
          onChange={(e) => { setKcal(e.target.value); setError(null); }}
          placeholder="Ej.: 320"
          error={error}
          data-autofocus
          onKeyDown={(e) => e.key === 'Enter' && save()}
          data-burn-input
        />
        <TextField label="Actividad (opcional)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Correr, pádel…" maxLength={40} onKeyDown={(e) => e.key === 'Enter' && save()} data-burn-note />
      </div>

      {entries.length > 0 && (
        <ul className="mt-4 divide-y divide-line/60 rounded-[16px] ring-1 ring-line/60" data-burn-entries>
          {entries.map((e) => (
            <li key={e.id} className="flex min-h-[52px] items-center gap-2 px-3" data-burn-entry={e.id}>
              <span className="min-w-0 flex-1">
                <span className="tabular block text-[16px] font-semibold">{n0(e.kcal)} kcal</span>
                <span className="block truncate text-[13px] text-ink3">{e.note ?? 'Actividad'} · {new Date(e.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
              </span>
              <IconButton label={`Editar ${n0(e.kcal)} kcal`} onClick={() => edit(e)} data-edit-burn><Pencil size={17} /></IconButton>
              <IconButton label={`Eliminar ${n0(e.kcal)} kcal`} onClick={() => remove(e)} className="text-danger" data-remove-burn><Trash2 size={17} /></IconButton>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-[13px] text-ink3">
        Anota solo lo quemado con actividad (las «calorías activas» de tu reloj o app de ejercicio), no el gasto total del día. Estas calorías no se suman a las que puedes comer. Brote no está conectado a Salud de Apple ni a Google Fit.
      </p>
    </Sheet>
  );
}
