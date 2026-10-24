/**
 * Backend del asistente de Brote (Vercel Function, runtime Node.js).
 *
 * Credenciales (solo en el servidor, nunca en el navegador):
 *   1. Si existe ANTHROPIC_API_KEY, se llama directamente a la API de Anthropic.
 *   2. Si no, se usa Vercel AI Gateway con el token OIDC que Vercel inyecta en cada
 *      petición (cabecera x-vercel-oidc-token): no hace falta guardar ninguna clave.
 * - GET  /api/assistant  → { configured: boolean } (sin exponer ningún secreto)
 * - POST /api/assistant  → { task: 'chat', messages, context }      → { reply }
 *                         { task: 'analyze-meal', text, imageDataUrl } → { items }
 * - No se registra el contenido de las peticiones (datos de salud y alimentación).
 *
 * Variables de entorno (opcionales):
 *   ANTHROPIC_API_KEY   clave propia de Anthropic (si no, AI Gateway)
 *   ASSISTANT_MODEL     modelo (por defecto anthropic/claude-sonnet-5 en Gateway)
 *   ALLOWED_ORIGIN      restringe CORS, p. ej. https://brote.vercel.app
 */

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const GATEWAY_URL = 'https://ai-gateway.vercel.sh/v1/messages';

interface Credentials { url: string; headers: Record<string, string>; model: string }

function credentials(req: Request): Credentials | null {
  const key = process.env.ANTHROPIC_API_KEY;
  if (key) {
    return { url: ANTHROPIC_URL, headers: { 'x-api-key': key }, model: process.env.ASSISTANT_MODEL || 'claude-sonnet-5-5' };
  }
  const oidc = req.headers.get('x-vercel-oidc-token') || process.env.VERCEL_OIDC_TOKEN || process.env.AI_GATEWAY_API_KEY;
  if (oidc) {
    return { url: GATEWAY_URL, headers: { authorization: `Bearer ${oidc}` }, model: process.env.ASSISTANT_MODEL || 'anthropic/claude-sonnet-5' };
  }
  return null;
}

type Role = 'user' | 'assistant';
interface InMessage { role: Role; content: string }

const SYSTEM_CHAT = `Eres el asistente de Brote, una aplicación española de organización de la alimentación.
Respondes en español de España, con frases claras y breves, y usas listas con guiones cuando ayudan.
Usa el contexto JSON que recibes (menú, preferencias, alergias, cumplimiento, lista de la compra) para personalizar las respuestas. Si un dato no está en el contexto, dilo en lugar de inventarlo.
Límites estrictos:
- No diagnosticas enfermedades, no interpretas síntomas ni analíticas y no recomiendas iniciar, cambiar o dejar medicación.
- No propones dietas de muy bajas calorías, ayunos prolongados ni objetivos agresivos. Ante objetivos de peso, embarazo, lactancia, enfermedades o conductas alimentarias de riesgo, recomienda acudir a un dietista-nutricionista o a un profesional sanitario.
- Respeta siempre las alergias e intolerancias indicadas y avisa de que conviene revisar el etiquetado.
- No interpretes cambios de peso como cambios de grasa corporal.
- Si te piden algo ajeno a alimentación, organización de comidas, compra o actividad física general, indícalo amablemente.`;

const SYSTEM_MEAL = `Estimas la composición de una comida a partir de una foto y/o una descripción.
Devuelve EXCLUSIVAMENTE JSON válido con esta forma: {"items":[{"name":"...","grams":0,"kcal":0,"protein":0,"carbs":0,"fat":0}]}
- name en español, grams es la cantidad estimada de ese alimento y los macronutrientes corresponden a esa cantidad.
- Si no puedes identificar la comida, devuelve {"items":[]}.
- No añadas texto fuera del JSON.`;

function cors(origin: string | null): Record<string, string> {
  const allowed = process.env.ALLOWED_ORIGIN;
  return {
    'Access-Control-Allow-Origin': allowed ? (origin === allowed ? allowed : 'null') : origin ?? '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
}

const json = (body: unknown, status: number, headers: Record<string, string>) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers } });

function validMessages(v: unknown): v is InMessage[] {
  return Array.isArray(v) && v.length > 0 && v.length <= 20 && v.every((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.length <= 4000);
}

async function callModel(cred: Credentials, system: string, messages: unknown[], maxTokens: number): Promise<string> {
  const res = await fetch(cred.url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'anthropic-version': '2023-06-01', ...cred.headers },
    body: JSON.stringify({ model: cred.model, max_tokens: maxTokens, system, messages }),
  });
  if (res.status === 429) throw Object.assign(new Error('rate'), { status: 429 });
  if (!res.ok) {
    // Solo se registra el código de estado: nunca el contenido de la conversación.
    console.error('assistant_upstream_error', res.status);
    throw Object.assign(new Error('upstream'), { status: res.status === 402 || res.status === 403 ? 503 : 502 });
  }
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  return (data.content ?? []).filter((c) => c.type === 'text').map((c) => c.text).join('\n').trim();
}

export function OPTIONS(req: Request): Response {
  return new Response(null, { status: 204, headers: cors(req.headers.get('origin')) });
}

let probe: { ok: boolean; at: number; status?: number } | null = null;

/** Comprueba (como mucho cada 10 min) que el modelo responde de verdad, con una petición mínima. */
async function modelReachable(cred: Credentials): Promise<boolean> {
  if (probe && Date.now() - probe.at < 600_000) return probe.ok;
  try {
    const res = await fetch(cred.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'anthropic-version': '2023-06-01', ...cred.headers },
      body: JSON.stringify({ model: cred.model, max_tokens: 1, messages: [{ role: 'user', content: 'ok' }] }),
    });
    if (!res.ok) console.error('assistant_probe_error', res.status, (await res.text()).slice(0, 300));
    probe = { ok: res.ok, at: Date.now(), status: res.status };
  } catch {
    probe = { ok: false, at: Date.now() };
  }
  return probe.ok;
}

export async function GET(req: Request): Promise<Response> {
  const cred = credentials(req);
  const configured = cred ? await modelReachable(cred) : false;
  return json({ configured, provider: cred ? (cred.url === GATEWAY_URL ? 'gateway' : 'anthropic') : null, probeStatus: probe?.status ?? null }, 200, cors(req.headers.get('origin')));
}

export async function POST(req: Request): Promise<Response> {
  const headers = cors(req.headers.get('origin'));
  const cred = credentials(req);
  if (!cred) return json({ error: 'El asistente no está configurado en el servidor.' }, 503, headers);

  const raw = await req.text();
  if (raw.length > 2_000_000) return json({ error: 'La petición es demasiado grande.' }, 413, headers);
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: 'Petición no válida.' }, 400, headers);
  }

  try {
    if (body.task === 'chat') {
      if (!validMessages(body.messages)) return json({ error: 'Mensajes no válidos.' }, 400, headers);
      const ctx = JSON.stringify(body.context ?? {}).slice(0, 20_000);
      const msgs = body.messages as InMessage[];
      // El contexto se antepone al primer mensaje del usuario para que el modelo lo tenga presente.
      const first = msgs.findIndex((m) => m.role === 'user');
      const withCtx = msgs.map((m, i) => (i === first ? { role: m.role, content: `Contexto del usuario (JSON):\n${ctx}\n\nPregunta:\n${m.content}` } : m));
      // La API exige empezar por un mensaje del usuario.
      const trimmed = withCtx.slice(Math.max(0, first));
      const reply = await callModel(cred, SYSTEM_CHAT, trimmed, 900);
      return json({ reply: reply || 'No he podido generar una respuesta. Inténtalo de nuevo.' }, 200, headers);
    }

    if (body.task === 'analyze-meal') {
      const text = typeof body.text === 'string' ? body.text.slice(0, 400) : '';
      const img = typeof body.imageDataUrl === 'string' ? body.imageDataUrl : '';
      const m = img.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
      if (!text && !m) return json({ error: 'Añade una foto o una descripción.' }, 400, headers);
      const content: unknown[] = [];
      if (m) content.push({ type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } });
      content.push({ type: 'text', text: text ? `Descripción: ${text}` : 'Estima la comida de la foto.' });
      const out = await callModel(cred, SYSTEM_MEAL, [{ role: 'user', content }], 700);
      const jsonText = out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1);
      const parsed = JSON.parse(jsonText) as { items?: Record<string, unknown>[] };
      const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0);
      const items = (parsed.items ?? [])
        .filter((i) => typeof i.name === 'string' && num(i.grams) > 0)
        .slice(0, 12)
        .map((i) => ({ name: String(i.name).slice(0, 60), grams: num(i.grams), kcal: num(i.kcal), protein: num(i.protein), carbs: num(i.carbs), fat: num(i.fat) }));
      return json({ items }, 200, headers);
    }

    return json({ error: 'Tarea desconocida.' }, 400, headers);
  } catch (e) {
    const status = (e as { status?: number }).status;
    if (status === 429) return json({ error: 'El servicio de IA está saturado. Inténtalo en unos segundos.' }, 429, headers);
    if (status === 503) return json({ error: 'El servicio de IA no está disponible para esta cuenta (créditos o permisos).' }, 503, headers);
    return json({ error: 'El servicio de IA no ha respondido correctamente.' }, 502, headers);
  }
}

declare const process: { env: Record<string, string | undefined> };
