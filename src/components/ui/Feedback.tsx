import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Info } from 'lucide-react';
import { Button, cx } from './primitives';

/* ---------------------------------- Avisos (toasts) ---------------------------------- */

interface ToastOptions {
  action?: { label: string; onClick: () => void };
  tone?: 'success' | 'info';
  duration?: number;
}
interface ToastItem extends ToastOptions {
  id: number;
  message: string;
}

/* ---------------------------------- Confirmaciones ---------------------------------- */

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel: string;
  destructive?: boolean;
}

interface FeedbackValue {
  toast: (message: string, opts?: ToastOptions) => void;
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const Ctx = createContext<FeedbackValue | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [dialog, setDialog] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const counter = useRef(0);

  const toast = useCallback((message: string, opts: ToastOptions = {}) => {
    const id = ++counter.current;
    setToasts((t) => [...t.slice(-2), { id, message, ...opts }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), opts.duration ?? (opts.action ? 5000 : 2600));
  }, []);

  const confirm = useCallback((opts: ConfirmOptions) => new Promise<boolean>((resolve) => setDialog({ ...opts, resolve })), []);

  const close = (v: boolean) => {
    dialog?.resolve(v);
    setDialog(null);
  };

  return (
    <Ctx.Provider value={{ toast, confirm }}>
      {children}
      {createPortal(
        <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(88px+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6">
          {toasts.map((t) => (
            <div key={t.id} className="anim-toast pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl bg-[rgb(30_32_29)] py-2.5 pl-4 pr-2 text-[15px] text-white shadow-float">
              {t.tone === 'info' ? <Info size={18} className="shrink-0 opacity-80" /> : <CheckCircle2 size={18} className="shrink-0 text-[rgb(120_205_150)]" />}
              <span className="py-1">{t.message}</span>
              {t.action && (
                <button
                  type="button"
                  className="ml-1 h-9 rounded-full px-3 font-semibold text-[rgb(120_205_150)] hover:bg-white/10"
                  onClick={() => {
                    t.action!.onClick();
                    setToasts((x) => x.filter((y) => y.id !== t.id));
                  }}
                >
                  {t.action.label}
                </button>
              )}
              {!t.action && <span className="w-2" />}
            </div>
          ))}
        </div>,
        document.body,
      )}
      {dialog && <ConfirmDialog {...dialog} onClose={close} />}
    </Ctx.Provider>
  );
}

function ConfirmDialog({ title, message, confirmLabel, destructive, onClose }: ConfirmOptions & { onClose: (v: boolean) => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
      <div className="anim-fade absolute inset-0 bg-black/40" onClick={() => onClose(false)} />
      <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-msg" className="anim-pop-in relative w-full max-w-[320px] rounded-[20px] bg-surface p-5 text-center shadow-float">
        <h2 id="confirm-title" className="text-[17px] font-semibold">{title}</h2>
        {message && <p id="confirm-msg" className="mt-1.5 text-[14px] leading-snug text-ink2">{message}</p>}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button ref={cancelRef} variant="secondary" onClick={() => onClose(false)}>Cancelar</Button>
          <Button variant={destructive ? 'destructive' : 'primary'} className={cx(destructive && '!bg-danger !text-white')} onClick={() => onClose(true)}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function useFeedback(): FeedbackValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useFeedback fuera de FeedbackProvider');
  return v;
}
