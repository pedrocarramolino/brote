import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { IconButton, cx } from './primitives';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** acción en la cabecera, a la derecha del título */
  headerAction?: ReactNode;
  size?: 'md' | 'lg';
}

let openCount = 0;

/**
 * Hoja modal: en móvil sube desde abajo con asa y se cierra deslizando hacia abajo;
 * en tableta y escritorio se presenta centrada. Escape, fondo y botón cierran.
 */
export function Sheet({ open, onClose, title, subtitle, children, footer, headerAction, size = 'md' }: SheetProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const [drag, setDrag] = useState(0);
  const startY = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    lastFocus.current = document.activeElement as HTMLElement;
    openCount++;
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => {
      const el = panelRef.current?.querySelector<HTMLElement>('[data-autofocus]') ?? panelRef.current;
      el?.focus({ preventScroll: true });
    }, 50);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
      if (e.key === 'Tab' && panelRef.current) {
        const f = panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled]),[href],input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      openCount--;
      if (openCount <= 0) document.body.style.overflow = '';
      lastFocus.current?.focus?.({ preventScroll: true });
    };
  }, [open, onClose]);

  if (!open) return null;

  const onPointerDown = (e: React.PointerEvent) => {
    startY.current = e.clientY;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (startY.current === null) return;
    setDrag(Math.max(0, e.clientY - startY.current));
  };
  const onPointerUp = () => {
    if (drag > 110) onClose();
    setDrag(0);
    startY.current = null;
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6">
      <div className="anim-fade absolute inset-0 bg-black/35" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cx(
          'anim-sheet md:anim-pop-in relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[22px] bg-surface shadow-float focus:outline-none md:max-h-[86vh] md:rounded-[22px]',
          size === 'lg' ? 'md:max-w-2xl' : 'md:max-w-lg',
        )}
        style={drag ? { transform: `translateY(${drag}px)`, transition: 'none' } : undefined}
      >
        <div
          className="flex cursor-grab touch-none justify-center pb-1 pt-2 md:hidden"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          aria-hidden="true"
        >
          <span className="h-[5px] w-9 rounded-full bg-line" />
        </div>
        <header className="flex items-start gap-2 px-5 pb-3 pt-1 md:pt-5">
          <div className="min-w-0 flex-1 pt-1.5">
            <h2 id={titleId} className="text-[20px] font-bold leading-tight tracking-tight">{title}</h2>
            {subtitle && <div className="mt-1 text-[14px] text-ink2">{subtitle}</div>}
          </div>
          {headerAction}
          <IconButton label="Cerrar" onClick={onClose} variant="secondary" className="!h-9 !w-9">
            <X size={18} />
          </IconButton>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">{children}</div>
        {footer && <div className="safe-bottom border-t border-line/70 bg-surface px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
