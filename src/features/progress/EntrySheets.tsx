import { useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import type { MeasurementEntry, WeightEntry } from '../../types';
import { Sheet } from '../../components/ui/Sheet';
import { Badge, Button, IconButton, TextField } from '../../components/ui/primitives';
import { useData, useStore } from '../../store/AppStore';
import { useFeedback } from '../../components/ui/Feedback';
import { formatDate, todayISO } from '../../lib/dates';
import { n1, parseDecimal, uid } from '../../lib/format';

const MEASURES = [
  ['waist', 'Cintura'],
  ['hip', 'Cadera'],
  ['chest', 'Pecho'],
  ['arm', 'Brazo'],
  ['thigh', 'Muslo'],
] as const;
export { MEASURES };

export function WeightSheet({ open, onClose, entry }: { open: boolean; onClose: () => void; entry: WeightEntry | null }) {
  const { mutate } = useStore();
  const { toast } = useFeedback();
  const [date, setDate] = useState(todayISO());
  const [kg, setKg] = useState('');
  const [err, setErr] = useState<{ date?: string; kg?: string }>({});

  useEffect(() => {
    if (open) {
      setDate(entry?.date ?? todayISO());
      setKg(entry ? String(entry.kg).replace('.', ',') : '');
      setErr({});
    }
  }, [open, entry]);

  const save = () => {
    const v = parseDecimal(kg);
    const e: typeof err = {};
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > todayISO()) e.date = 'Elige una fecha que no sea futura.';
    if (!Number.isFinite(v) || v < 25 || v > 350) e.kg = 'Introduce un peso entre 25 y 350 kg.';
    setErr(e);
    if (Object.keys(e).length) return;
    mutate((d) => {
      if (entry) {
        const w = d.weights.find((x) => x.id === entry.id);
        if (w) Object.assign(w, { date, kg: Math.round(v * 10) / 10, demo: false });
      } else {
        d.weights = d.weights.filter((x) => x.date !== date);
        d.weights.push({ id: uid('w'), date, kg: Math.round(v * 10) / 10 });
      }
    });
    toast(entry ? 'Peso actualizado' : 'Peso registrado');
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title={entry ? 'Editar peso' : 'Registrar peso'} footer={<Button size="lg" onClick={save}>Guardar</Button>}>
      <div className="space-y-4">
        <TextField label="Peso" inputMode="decimal" suffix="kg" value={kg} onChange={(e) => setKg(e.target.value)} error={err.kg} placeholder="Por ejemplo: 68,4" data-autofocus />
        <TextField label="Fecha" type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} error={err.date} />
        <p className="text-[13px] leading-snug text-ink3">Para comparar mejor, pésate en condiciones parecidas (misma hora, misma báscula). El peso fluctúa a diario por agua, digestión y otros factores.</p>
      </div>
    </Sheet>
  );
}

export function MeasurementSheet({ open, onClose, entry }: { open: boolean; onClose: () => void; entry: MeasurementEntry | null }) {
  const { mutate } = useStore();
  const { toast } = useFeedback();
  const [date, setDate] = useState(todayISO());
  const [v, setV] = useState<Record<string, string>>({});
  const [err, setErr] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setDate(entry?.date ?? todayISO());
      setV(Object.fromEntries(MEASURES.map(([k]) => [k, entry?.[k] !== undefined ? String(entry[k]).replace('.', ',') : ''])));
      setErr({});
    }
  }, [open, entry]);

  const save = () => {
    const e: Record<string, string> = {};
    const out: Partial<MeasurementEntry> = {};
    for (const [k, label] of MEASURES) {
      if (!v[k]?.trim()) continue;
      const n = parseDecimal(v[k]);
      if (!Number.isFinite(n) || n < 10 || n > 250) e[k] = `${label}: entre 10 y 250 cm.`;
      else out[k] = Math.round(n * 10) / 10;
    }
    if (!Object.keys(out).length && !Object.keys(e).length) e.waist = 'Introduce al menos una medida.';
    if (date > todayISO()) e.date = 'La fecha no puede ser futura.';
    setErr(e);
    if (Object.keys(e).length) return;
    mutate((d) => {
      if (entry) {
        const m = d.measurements.find((x) => x.id === entry.id);
        if (m) {
          MEASURES.forEach(([k]) => delete m[k]);
          Object.assign(m, out, { date, demo: false });
        }
      } else d.measurements.push({ id: uid('m'), date, ...out });
    });
    toast('Medidas guardadas');
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title={entry ? 'Editar medidas' : 'Registrar medidas'} footer={<Button size="lg" onClick={save}>Guardar</Button>}>
      <div className="grid grid-cols-1 gap-3 xs:grid-cols-2">
        {MEASURES.map(([k, label], i) => (
          <TextField key={k} label={label} inputMode="decimal" suffix="cm" value={v[k] ?? ''} onChange={(e) => setV((x) => ({ ...x, [k]: e.target.value }))} error={err[k]} {...(i === 0 ? { 'data-autofocus': true } : {})} />
        ))}
        <TextField label="Fecha" type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} error={err.date} />
      </div>
      <p className="mt-3 text-[13px] text-ink3">Todos los campos son opcionales. Mide siempre en el mismo punto y con la cinta sin apretar.</p>
    </Sheet>
  );
}

/** Lista de registros con edición y eliminación (con deshacer). */
export function RecordsSheet({ open, onClose, kind, onEdit }: { open: boolean; onClose: () => void; kind: 'peso' | 'medidas'; onEdit: (e: WeightEntry | MeasurementEntry) => void }) {
  const data = useData();
  const { mutate } = useStore();
  const { toast } = useFeedback();
  const rows = (kind === 'peso' ? data.weights : data.measurements).slice().sort((a, b) => b.date.localeCompare(a.date));

  const remove = (row: WeightEntry | MeasurementEntry) => {
    mutate((d) => {
      if (kind === 'peso') d.weights = d.weights.filter((x) => x.id !== row.id);
      else d.measurements = d.measurements.filter((x) => x.id !== row.id);
    });
    toast('Registro eliminado', {
      action: {
        label: 'Deshacer',
        onClick: () => mutate((d) => (kind === 'peso' ? d.weights.push(row as WeightEntry) : d.measurements.push(row as MeasurementEntry))),
      },
    });
  };

  return (
    <Sheet open={open} onClose={onClose} title={kind === 'peso' ? 'Registros de peso' : 'Registros de medidas'} subtitle={`${rows.length} registros`}>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-[15px] text-ink2">Todavía no hay registros.</p>
      ) : (
        <ul className="divide-y divide-line/60">
          {rows.map((r) => (
            <li key={r.id} className="flex min-h-[56px] items-center gap-2 py-1.5">
              <div className="min-w-0 flex-1">
                <p className="tabular text-[16px] font-semibold">
                  {'kg' in r ? `${n1(r.kg)} kg` : MEASURES.filter(([k]) => (r as MeasurementEntry)[k] !== undefined).map(([k, l]) => `${l} ${n1((r as MeasurementEntry)[k]!)}`).join(' · ')}
                </p>
                <p className="flex items-center gap-1.5 text-[13px] text-ink3">{formatDate(r.date)} {r.demo && <Badge tone="warn">Demo</Badge>}</p>
              </div>
              <IconButton label="Editar registro" onClick={() => onEdit(r)}><Pencil size={17} /></IconButton>
              <IconButton label="Eliminar registro" onClick={() => remove(r)} className="text-danger"><Trash2 size={17} /></IconButton>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
