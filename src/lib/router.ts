import { useCallback, useEffect, useState } from 'react';

export type Route = 'hoy' | 'plan' | 'progreso' | 'compra' | 'perfil' | 'asistente' | 'actividad' | 'recetas';
const ROUTES: Route[] = ['hoy', 'plan', 'progreso', 'compra', 'perfil', 'asistente', 'actividad', 'recetas'];

export interface Location {
  route: Route;
  params: URLSearchParams;
}

function parse(): Location {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const [path, query = ''] = raw.split('?');
  const route = (ROUTES.includes(path as Route) ? path : 'hoy') as Route;
  return { route, params: new URLSearchParams(query) };
}

/** Router mínimo basado en hash: funciona en cualquier alojamiento estático y conserva la sección al recargar. */
export function useHashRouter() {
  const [loc, setLoc] = useState<Location>(parse);
  useEffect(() => {
    const on = () => setLoc(parse());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return loc;
}

/**
 * Navegación interna. Por defecto REEMPLAZA la entrada del historial en lugar de añadir una:
 * las pestañas de una app no forman una pila de «atrás». Así el gesto atrás del navegador
 * (borde izquierdo en Safari, gesto del trackpad) no recorre las secciones visitadas.
 */
export function navigate(route: Route, params?: Record<string, string>, opts: { push?: boolean } = {}) {
  const q = params ? `?${new URLSearchParams(params).toString()}` : '';
  const next = `#/${route}${q}`;
  if (window.location.hash === next) return;
  if (opts.push) {
    window.location.hash = next;
    return;
  }
  try {
    history.replaceState(history.state, '', next);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } catch {
    window.location.hash = next;
  }
}

/** Orden de las categorías principales para la navegación por gestos. */
export const TAB_ORDER: Route[] = ['hoy', 'plan', 'progreso', 'compra', 'perfil'];
/** Asistente y Actividad cuelgan de Perfil en la barra inferior. */
export const tabOf = (r: Route): Route => (r === 'asistente' || r === 'actividad' ? 'perfil' : r === 'recetas' ? 'plan' : r);

export function useNavigate() {
  return useCallback(navigate, []);
}
