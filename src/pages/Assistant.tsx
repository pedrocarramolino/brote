import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowUp, Info, RotateCw, ShieldCheck, Sparkles, Trash2 } from 'lucide-react';
import type { ChatMessage } from '../types';
import { PageHeader } from '../components/layout/AppShell';
import { Badge, IconButton, Toggle, cx } from '../components/ui/primitives';
import { useFeedback } from '../components/ui/Feedback';
import { useData, useStore } from '../store/AppStore';
import { useAI } from '../hooks/useAI';
import { AIError } from '../services/ai';
import { buildAssistantContext } from '../services/ai/context';
import { todayISO } from '../lib/dates';
import { uid } from '../lib/format';

const SUGGESTIONS = [
  '¿Qué puedo cenar hoy con los ingredientes que tengo?',
  '¿Por qué puedo sustituir esta receta?',
  'Organízame las comidas de mañana',
  '¿Qué ingredientes me faltan para completar el menú?',
  'Resume cómo he cumplido el plan esta semana',
  '¿Cómo puedo organizar mejor las comidas si tengo poco tiempo?',
];

/** Markdown mínimo y seguro: negritas y listas con guion. Sin HTML. */
function RichText({ text }: { text: string }) {
  const bold = (s: string): ReactNode[] => s.split(/(\*\*[^*]+\*\*)/g).map((part, i) => (part.startsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>));
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) blocks.push(<ul key={`l${blocks.length}`} className="my-1 list-disc space-y-1 pl-5">{list.map((l, i) => <li key={i}>{bold(l)}</li>)}</ul>);
    list = [];
  };
  text.split('\n').forEach((line) => {
    if (line.startsWith('- ')) list.push(line.slice(2));
    else {
      flush();
      if (line.trim()) blocks.push(<p key={`p${blocks.length}`}>{bold(line)}</p>);
    }
  });
  flush();
  return <div className="space-y-2">{blocks}</div>;
}

export function AssistantPage() {
  const data = useData();
  const { mutate } = useStore();
  const { confirm } = useFeedback();
  const { provider, status } = useAI();
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [lastError, setLastError] = useState<{ msg: string; retry: boolean } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const messages = data.chat;
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, pending]);
  useEffect(() => () => abortRef.current?.abort(), []);

  const run = async (history: ChatMessage[]) => {
    if (!provider) return;
    setPending(true);
    setLastError(null);
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const reply = await provider.chat(
        { messages: history.map((m) => ({ role: m.role, content: m.content })), context: buildAssistantContext(data, todayISO()), data },
        ac.signal,
      );
      mutate((d) => void d.chat.push({ id: uid('msg'), role: 'assistant', content: reply, createdAt: new Date().toISOString(), mode: provider.mode }));
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      const err = e instanceof AIError ? e : new AIError('Ha ocurrido un error inesperado.', true);
      setLastError({ msg: err.message, retry: err.retryable });
    } finally {
      setPending(false);
    }
  };

  const send = (text: string) => {
    const t = text.trim();
    if (!t || pending || !provider) return;
    const msg: ChatMessage = { id: uid('msg'), role: 'user', content: t.slice(0, 1000), createdAt: new Date().toISOString() };
    mutate((d) => void d.chat.push(msg));
    setInput('');
    run([...messages, msg]);
  };

  const clear = async () => {
    if (await confirm({ title: '¿Borrar la conversación?', message: 'Se eliminarán todos los mensajes guardados en este dispositivo.', confirmLabel: 'Borrar', destructive: true })) {
      mutate((d) => void (d.chat = []));
      setLastError(null);
    }
  };

  const isDemo = status?.mode !== 'ia';

  return (
    <div className="mx-auto flex max-w-3xl flex-col">
      <PageHeader
        title="Asistente"
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-2">
            Dudas sobre tu plan, recetas y compra
            {status && <Badge tone={isDemo ? 'warn' : 'accent'}>{isDemo ? 'Modo demostración' : 'IA conectada'}</Badge>}
          </span>
        }
        actions={messages.length > 0 && <IconButton label="Borrar conversación" onClick={clear}><Trash2 size={19} /></IconButton>}
      />

      <div className="mb-4 space-y-2 rounded-[16px] bg-surface p-4 text-[13px] leading-snug text-ink2 ring-1 ring-line/60">
        <p className="flex items-start gap-2">
          <Info size={16} className="mt-[1px] shrink-0 text-ink3" />
          {isDemo
            ? `${status?.reason ?? 'Comprobando…'} Las respuestas son predefinidas y se calculan con reglas a partir de los datos guardados en este dispositivo; no hay un modelo de IA detrás.`
            : 'Las respuestas las genera un modelo de lenguaje a través del servidor de Brote y pueden contener errores.'}
        </p>
        <p className="flex items-start gap-2">
          <ShieldCheck size={16} className="mt-[1px] shrink-0 text-ink3" />
          No diagnostica enfermedades, no recomienda cambios de medicación y no sustituye a un dietista-nutricionista ni a un profesional sanitario.
        </p>
        {!isDemo && (
          <div className="border-t border-line/60 pt-1">
            <Toggle
              checked={data.profile.shareContextWithAI}
              onChange={(v) => mutate((d) => void (d.profile.shareContextWithAI = v))}
              label="Compartir mi plan con el asistente"
              description="Envía tu menú, preferencias, alergias, cumplimiento semanal y lista de la compra. Nunca se envían peso ni medidas."
            />
          </div>
        )}
      </div>

      <div className="flex-1 space-y-3 pb-4" role="log" aria-live="polite" aria-label="Conversación">
        {messages.length === 0 && (
          <div className="py-6 text-center">
            <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-accentSoft text-accent-deep"><Sparkles size={26} /></span>
            <h2 className="text-[19px] font-bold">¿En qué te ayudo?</h2>
            <p className="mt-1 text-[15px] text-ink2">Elige una pregunta o escribe la tuya.</p>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={cx('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div
              className={cx(
                'max-w-[85%] rounded-[20px] px-4 py-2.5 text-[16px] leading-relaxed',
                m.role === 'user' ? 'rounded-br-[6px] bg-accent text-accentInk' : 'rounded-bl-[6px] bg-surface shadow-card ring-1 ring-line/60',
              )}
            >
              {m.role === 'assistant' ? <RichText text={m.content} /> : m.content}
              {m.role === 'assistant' && m.mode === 'demo' && <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-ink3">Respuesta predefinida · demo</p>}
            </div>
          </div>
        ))}
        {pending && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-[20px] rounded-bl-[6px] bg-surface px-4 py-3.5 shadow-card ring-1 ring-line/60" aria-label="El asistente está escribiendo">
              {[0, 1, 2].map((i) => <span key={i} className="anim-shimmer h-2 w-2 rounded-full bg-ink3" style={{ animationDelay: `${i * 0.15}s` }} />)}
            </div>
          </div>
        )}
        {lastError && (
          <div className="flex items-center justify-between gap-3 rounded-[16px] bg-danger/10 px-4 py-3 text-[14px] text-danger">
            <span>{lastError.msg}</span>
            {lastError.retry && (
              <button type="button" className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-surface px-3 font-semibold text-ink" onClick={() => run(messages)}>
                <RotateCw size={15} /> Reintentar
              </button>
            )}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="no-scrollbar -mx-4 mb-2 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {SUGGESTIONS.map((s) => (
          <button key={s} type="button" disabled={pending || !provider} onClick={() => send(s)} className="press shrink-0 rounded-full bg-surface px-3.5 py-2 text-[14px] font-medium ring-1 ring-line hover:bg-surface2 disabled:opacity-50">
            {s}
          </button>
        ))}
      </div>

      <form
        className="sticky bottom-[calc(72px+env(safe-area-inset-bottom))] z-10 flex items-end gap-2 rounded-[24px] bg-surface p-1.5 pl-4 shadow-float ring-1 ring-line/70 lg:bottom-4"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <label htmlFor="chat-input" className="sr-only">Escribe tu pregunta</label>
        <textarea
          id="chat-input"
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          maxLength={1000}
          placeholder="Escribe tu pregunta"
          className="max-h-32 min-h-[44px] flex-1 resize-none bg-transparent py-2.5 text-[17px] placeholder:text-ink3 focus:outline-none"
        />
        <IconButton type="submit" label="Enviar" variant="primary" disabled={!input.trim() || pending || !provider}>
          <ArrowUp size={20} strokeWidth={2.5} />
        </IconButton>
      </form>
    </div>
  );
}
