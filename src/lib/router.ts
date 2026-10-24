import { useCallback, useEffect, useState } from 'react';

export type Route = 'hoy' | 'plan' | 'progreso' | 'compra' | 'perfil' | 'asistente' | 'actividad';
const ROUTES: Route[] = ['hoy', 'plan', 'progreso', 'compra', 'perfil', 'asistente', 'actividad'];

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

export function navigate(route: Route, params?: Record<string, string>) {
  const q = params ? `?${new URLSearchParams(params).toString()}` : '';
  const next = `#/${route}${q}`;
  if (window.location.hash !== next) window.location.hash = next;
}

export function useNavigate() {
  return useCallback(navigate, []);
}
