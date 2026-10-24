import { useEffect, useState } from 'react';
import type { ISODate } from '../../types';
import { Sheet } from '../../components/ui/Sheet';
import { Button, TextField } from '../../components/ui/primitives';
import { useData, useStore } from '../../store/AppStore';
import { useFeedback } from '../../components/ui/Feedback';
import { relativeDayLabel } from '../../lib/dates';
import { n0 } from '../../lib/format';

export function StepsSheet({ open, onClose, date }: { open: boolean; onClose: () => void; date: ISODate }) {
  const data = useData();
  const { mutate } = useStore();
  const { toast } = useFeedback();
  const current = data.steps.find((s) => s.date === date);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValue(current ? String(current.steps) : '');
      setError(null);
    }
  }, [open, current]);

  const save = () => {
    const n = Number(value.replace(/\./g, '').trim());
    if (!Number.isInteger(n) || n < 0 || n > 100000) {
      setError('Introduce un número entero entre 0 y 100.000.');
      return;
    }
    mutate((d) => {
      d.steps = d.steps.filter((s) => s.date !== date);
      d.steps.push({ date, steps: n });
    });
    toast(`${n0(n)} pasos guardados`);
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Pasos"
      subtitle={relativeDayLabel(date)}
      footer={
        <div className="flex gap-2">
          {current && (
            <Button
              variant="destructive"
              onClick={() => {
                mutate((d) => void (d.steps = d.steps.filter((s) => s.date !== date)));
                toast('Registro de pasos eliminado');
                onClose();
              }}
            >
              Eliminar
            </Button>
          )}
          <Button className="flex-1" onClick={save}>Guardar</Button>
        </div>
      }
    >
      <TextField
        label="Pasos del día"
        inputMode="numeric"
        value={value}
        onChange={(e) => { setValue(e.target.value); setError(null); }}
        placeholder="Por ejemplo: 7500"
        error={error}
        hint={`Tu objetivo: ${n0(data.profile.stepsTarget)} pasos. Puedes copiar la cifra de tu móvil o reloj.`}
        data-autofocus
        onKeyDown={(e) => e.key === 'Enter' && save()}
      />
      <p className="mt-4 text-[13px] text-ink3">Brote no está conectado a Salud de Apple ni a Google Fit: los pasos se introducen manualmente.</p>
    </Sheet>
  );
}
