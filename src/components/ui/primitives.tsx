import { forwardRef, useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import { Minus, Plus } from 'lucide-react';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/* ---------------------------------- Botones ---------------------------------- */

type Variant = 'primary' | 'secondary' | 'tinted' | 'plain' | 'destructive' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-accentInk hover:brightness-[1.05] active:brightness-95',
  secondary: 'bg-surface2 text-ink hover:bg-line/70',
  tinted: 'bg-accentSoft text-accent-deep hover:brightness-[0.98]',
  plain: 'bg-transparent text-accent hover:bg-accentSoft/60',
  ghost: 'bg-transparent text-ink2 hover:bg-surface2',
  destructive: 'bg-danger/10 text-danger hover:bg-danger/15',
};
const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3 text-[15px] rounded-full gap-1.5',
  md: 'h-11 px-4 text-[16px] rounded-full gap-2',
  lg: 'h-[52px] px-6 text-[17px] rounded-2xl gap-2 w-full',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', icon, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(
        'press inline-flex select-none items-center justify-center font-semibold whitespace-nowrap disabled:opacity-40 disabled:pointer-events-none',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
});

/** Botón solo icono con etiqueta accesible obligatoria y área táctil de 44 px. */
export function IconButton({ label, children, className, variant = 'ghost', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; variant?: Variant }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx('press inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full disabled:opacity-40', VARIANTS[variant], className)}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ---------------------------------- Superficies ---------------------------------- */

export function Card({ className, children, as: As = 'section', ...rest }: { className?: string; children: ReactNode; as?: 'section' | 'div' | 'article'; [k: string]: unknown }) {
  return (
    <As className={cx('rounded-xl2 bg-surface shadow-card ring-1 ring-line/60', className)} {...rest}>
      {children}
    </As>
  );
}

export function SectionTitle({ children, action, id }: { children: ReactNode; action?: ReactNode; id?: string }) {
  return (
    <div className="mb-2 mt-7 flex items-end justify-between gap-3 px-1 first:mt-0">
      <h2 id={id} className="text-[20px] font-bold tracking-tight lg:text-[19px]">{children}</h2>
      {action}
    </div>
  );
}

export function Badge({ children, tone = 'neutral', className }: { children: ReactNode; tone?: 'neutral' | 'accent' | 'warn' | 'danger'; className?: string }) {
  const tones = {
    neutral: 'bg-surface2 text-ink2',
    accent: 'bg-accentSoft text-accent-deep',
    warn: 'bg-warnSoft text-warn',
    danger: 'bg-danger/10 text-danger',
  };
  return <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold leading-5', tones[tone], className)}>{children}</span>;
}

export function DemoBadge({ className }: { className?: string }) {
  return <Badge tone="warn" className={className}>Demo</Badge>;
}

/* ---------------------------------- Progreso ---------------------------------- */

export function ProgressBar({ value, max, color = 'rgb(var(--accent))', label, height = 6 }: { value: number; max: number; color?: string; label?: string; height?: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={Math.round(max)} aria-valuenow={Math.round(value)} className="w-full overflow-hidden rounded-full bg-surface2" style={{ height }}>
      <div className="h-full rounded-full transition-[width] duration-500 ease-out" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function Ring({ value, max, size = 120, stroke = 12, color = 'rgb(var(--accent))', track = 'rgb(var(--surface-2))', children, label }: {
  value: number; max: number; size?: number; stroke?: number; color?: string; track?: string; children?: ReactNode; label?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: 'stroke-dashoffset .7s cubic-bezier(.2,.8,.2,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

/* ---------------------------------- Controles ---------------------------------- */

export function Segmented<T extends string>({ value, onChange, options, label, className, size = 'md' }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string; className?: string; size?: 'sm' | 'md';
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cx('flex rounded-[12px] bg-surface2 p-[3px]', className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cx(
              'flex-1 rounded-[9px] px-3 font-semibold transition-all duration-200',
              size === 'sm' ? 'h-8 text-[13px]' : 'h-9 text-[14px]',
              active ? 'bg-[rgb(var(--raised))] text-ink shadow-[0_1px_3px_rgb(0_0_0/0.12)]' : 'text-ink2 hover:text-ink',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Chip({ selected, onClick, children, className }: { selected: boolean; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cx(
        'press inline-flex min-h-[40px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-[15px] font-medium ring-1 transition-colors',
        selected ? 'bg-accent text-accentInk ring-accent' : 'bg-surface text-ink ring-line hover:bg-surface2',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Stepper({ value, onChange, min = 0, max = 999, step = 1, label, format = (v: number) => String(v) }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; label: string; format?: (v: number) => string;
}) {
  return (
    <div className="inline-flex items-center rounded-full bg-surface2" role="group" aria-label={label}>
      <IconButton label={`Reducir ${label}`} onClick={() => onChange(Math.max(min, +(value - step).toFixed(2)))} disabled={value <= min}>
        <Minus size={18} />
      </IconButton>
      <span className="tabular min-w-[56px] text-center text-[16px] font-semibold" aria-live="polite">{format(value)}</span>
      <IconButton label={`Aumentar ${label}`} onClick={() => onChange(Math.min(max, +(value + step).toFixed(2)))} disabled={value >= max}>
        <Plus size={18} />
      </IconButton>
    </div>
  );
}

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  hideLabel?: boolean;
  disabled?: boolean;
  /** Texto de estado visible bajo la etiqueta (p. ej. «Activado»). */
  showState?: boolean;
}

/**
 * Interruptor accesible: un checkbox nativo con role="switch" envuelto en un <label>,
 * de modo que toda la fila es pulsable, funciona con Espacio y lo anuncian los lectores
 * de pantalla. El estado no depende solo del color: el tirador muestra una marca al activarse
 * y el borde del estado apagado tiene contraste 3:1.
 */
export function Toggle({ checked, onChange, label, description, hideLabel, disabled, showState }: ToggleProps) {
  const id = useId();
  const descId = `${id}-desc`;
  return (
    <label
      htmlFor={id}
      className={cx(
        'switch-row group flex select-none items-center justify-between gap-4',
        !hideLabel && 'min-h-[52px] py-2',
        disabled ? 'cursor-not-allowed' : 'cursor-pointer',
      )}
    >
      <span className={cx('min-w-0', hideLabel && 'sr-only')}>
        <span className={cx('block text-[16px] font-medium', disabled && 'text-ink3')}>{label}</span>
        {description && <span id={descId} className="mt-0.5 block text-[13px] leading-snug text-ink3">{description}</span>}
        {showState && <span className={cx('mt-0.5 block text-[13px] font-semibold', checked ? 'text-accent-deep' : 'text-ink3')}>{checked ? 'Activado' : 'Desactivado'}</span>}
      </span>
      <span className="relative inline-flex shrink-0">
        <input
          id={id}
          type="checkbox"
          role="switch"
          className="switch-input sr-only"
          checked={checked}
          disabled={disabled}
          aria-describedby={description ? descId : undefined}
          onChange={(e) => {
            onChange(e.target.checked);
            try {
              navigator.vibrate?.(8);
            } catch {
              /* sin vibración */
            }
          }}
        />
        <span className="switch" aria-hidden="true">
          <span className="switch-knob">
            <svg viewBox="0 0 16 16" width="14" height="14" className="switch-check">
              <path d="M3.5 8.4 6.6 11.4 12.5 4.8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </span>
      </span>
    </label>
  );
}

/* ---------------------------------- Formularios ---------------------------------- */

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string | null;
  suffix?: string;
}

export const TextField = forwardRef<HTMLInputElement, FieldProps>(function TextField({ label, hint, error, suffix, className, id, ...rest }, ref) {
  const autoId = useId();
  const fid = id ?? autoId;
  return (
    <div className={className}>
      <label htmlFor={fid} className="mb-1.5 block text-[14px] font-semibold text-ink2">{label}</label>
      <div className={cx('flex items-center rounded-[12px] bg-surface2 ring-1 transition-shadow focus-within:ring-2', error ? 'ring-danger' : 'ring-transparent focus-within:ring-accent')}>
        <input
          ref={ref}
          id={fid}
          aria-invalid={!!error}
          aria-describedby={error ? `${fid}-err` : hint ? `${fid}-hint` : undefined}
          className="h-12 w-full min-w-0 rounded-[12px] bg-transparent px-3.5 text-[17px] text-ink placeholder:text-ink3 focus:outline-none"
          {...rest}
        />
        {suffix && <span className="pr-3.5 text-[15px] text-ink3">{suffix}</span>}
      </div>
      {error ? (
        <p id={`${fid}-err`} className="mt-1 text-[13px] font-medium text-danger">{error}</p>
      ) : hint ? (
        <p id={`${fid}-hint`} className="mt-1 text-[13px] text-ink3">{hint}</p>
      ) : null}
    </div>
  );
});

export function SelectField({ label, children, className, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-[14px] font-semibold text-ink2">{label}</label>
      <select id={id} className="h-12 w-full rounded-[12px] bg-surface2 px-3 text-[17px] text-ink focus:outline-none focus:ring-2 focus:ring-accent" {...rest}>
        {children}
      </select>
    </div>
  );
}

/* ---------------------------------- Estados ---------------------------------- */

export function EmptyState({ icon, title, children, action }: { icon: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-surface2 text-ink3">{icon}</div>
      <h3 className="text-[17px] font-semibold">{title}</h3>
      {children && <p className="mt-1 max-w-sm text-[15px] text-ink2">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('anim-shimmer rounded-xl bg-surface2', className)} />;
}
