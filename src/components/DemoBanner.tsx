import { FlaskConical } from 'lucide-react';
import { useData } from '../store/AppStore';
import { navigate } from '../lib/router';

/** Aviso visible mientras se usan datos ficticios. */
export function DemoBanner() {
  const data = useData();
  if (!data.isDemo) return null;
  return (
    <div className="mb-5 flex items-center gap-3 rounded-[16px] bg-warnSoft px-4 py-2.5 text-[14px] text-warn">
      <FlaskConical size={18} className="shrink-0" aria-hidden="true" />
      <p className="min-w-0 flex-1 leading-snug">
        <span className="font-semibold">Datos de demostración.</span> El perfil, los registros y el historial son ficticios.
      </p>
      <button type="button" onClick={() => navigate('perfil', { s: 'datos' })} className="shrink-0 rounded-full px-2 py-1 font-semibold underline-offset-2 hover:underline">
        Gestionar
      </button>
    </div>
  );
}
