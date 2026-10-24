import { AIError, type AIProvider, type MealEstimateItem } from './types';
import { demoProvider } from './demoProvider';

/**
 * Capa de servicio del asistente. El frontend NUNCA llama directamente a la API de
 * un modelo ni conoce claves: habla con un backend propio (api/assistant.ts) que
 * guarda la clave en variables de entorno del servidor.
 */

const ENDPOINT = (import.meta.env.VITE_ASSISTANT_ENDPOINT as string | undefined)?.trim() || '';

async function post<T>(body: unknown, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new AIError('No se ha podido conectar con el asistente. Revisa tu conexión.', true);
  }
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    if (res.status === 503) throw new AIError(j.error ?? 'El asistente no está configurado en el servidor.', false);
    if (res.status === 429) throw new AIError('Demasiadas consultas seguidas. Espera un momento y vuelve a intentarlo.', true);
    throw new AIError(j.error ?? `El asistente ha devuelto un error (${res.status}).`, res.status >= 500);
  }
  return (await res.json()) as T;
}

const remoteProvider: AIProvider = {
  mode: 'ia',
  async chat({ messages, context }, signal) {
    const r = await post<{ reply: string }>({ task: 'chat', messages: messages.slice(-12), context }, signal);
    return r.reply;
  },
  async analyzeMeal(input, signal) {
    const r = await post<{ items: MealEstimateItem[] }>({ task: 'analyze-meal', ...input }, signal);
    return r.items;
  },
};

export interface AIStatus {
  mode: 'demo' | 'ia';
  reason: string;
}

/** Comprueba si existe un backend configurado. Si no, se usa el modo demostración. */
export async function resolveProvider(): Promise<{ provider: AIProvider; status: AIStatus }> {
  if (!ENDPOINT) return { provider: demoProvider, status: { mode: 'demo', reason: 'No hay ningún servicio de IA conectado.' } };
  try {
    const res = await fetch(ENDPOINT, { method: 'GET' });
    const j = (await res.json()) as { configured?: boolean };
    if (res.ok && j.configured) return { provider: remoteProvider, status: { mode: 'ia', reason: 'Conectado al backend del asistente.' } };
    return { provider: demoProvider, status: { mode: 'demo', reason: 'El servidor del asistente no tiene la IA activada.' } };
  } catch {
    return { provider: demoProvider, status: { mode: 'demo', reason: 'No se ha podido contactar con el servidor del asistente.' } };
  }
}

export { AIError };
export type { AIProvider, MealEstimateItem };

let cached: ReturnType<typeof resolveProvider> | null = null;
/** Resuelve el proveedor una sola vez por sesión. */
export function getProvider() {
  cached ??= resolveProvider();
  return cached;
}
