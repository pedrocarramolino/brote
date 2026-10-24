import { useId, useState } from 'react';
import { X } from 'lucide-react';

/** Lista de etiquetas libres (p. ej. alimentos que no gustan). */
export function TagInput({ label, values, onChange, suggestions = [], placeholder }: { label: string; values: string[]; onChange: (v: string[]) => void; suggestions?: string[]; placeholder?: string }) {
  const id = useId();
  const [text, setText] = useState('');
  const add = (v: string) => {
    const t = v.trim().toLowerCase();
    if (t.length < 2 || values.includes(t) || values.length >= 30) return;
    onChange([...values, t]);
    setText('');
  };
  const rest = suggestions.filter((s) => !values.includes(s));
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[14px] font-semibold text-ink2">{label}</label>
      <div className="flex flex-wrap items-center gap-1.5 rounded-[12px] bg-surface2 p-2 focus-within:ring-2 focus-within:ring-accent">
        {values.map((v) => (
          <span key={v} className="inline-flex h-8 items-center gap-1 rounded-full bg-surface pl-3 pr-1 text-[14px] font-medium ring-1 ring-line">
            {v}
            <button type="button" aria-label={`Quitar ${v}`} onClick={() => onChange(values.filter((x) => x !== v))} className="flex h-7 w-7 items-center justify-center rounded-full text-ink3 hover:bg-surface2">
              <X size={14} />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              add(text);
            } else if (e.key === 'Backspace' && !text && values.length) onChange(values.slice(0, -1));
          }}
          onBlur={() => text && add(text)}
          placeholder={values.length ? '' : placeholder}
          className="h-8 min-w-[120px] flex-1 bg-transparent px-1 text-[16px] placeholder:text-ink3 focus:outline-none"
          enterKeyHint="done"
        />
      </div>
      {rest.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {rest.slice(0, 8).map((s) => (
            <button key={s} type="button" onClick={() => add(s)} className="press h-8 rounded-full px-3 text-[13px] font-medium text-ink2 ring-1 ring-line hover:bg-surface2">
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
