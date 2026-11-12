import { useEffect, useMemo, useRef, useState } from 'react';
import type { AppData, Food } from '../../types';
import { openFoodFactsProvider, searchLocal } from '../../services/foodDatabase';

export interface RemoteState {
  status: 'idle' | 'loading' | 'error' | 'done';
  items: Food[];
  error?: string;
}

/**
 * Búsqueda de alimentos: base local (siempre) + Open Food Facts solo si el usuario lo activó.
 * Devuelve resultados locales al instante y los remotos con un pequeño retardo.
 */
export function useFoodSearch(data: AppData, query: string, active: boolean) {
  const local = useMemo(() => searchLocal(data, query).slice(0, 40), [data, query]);
  const [remote, setRemote] = useState<RemoteState>({ status: 'idle', items: [] });
  const [tick, setTick] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const enabled = active && data.profile.useOpenFoodFacts;

  useEffect(() => {
    const q = query.trim();
    if (!enabled || q.length < 3) {
      setRemote({ status: 'idle', items: [] });
      return;
    }
    const t = setTimeout(() => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setRemote({ status: 'loading', items: [] });
      openFoodFactsProvider
        .search(q, ac.signal)
        .then((items) => setRemote({ status: 'done', items }))
        .catch((e: Error) => {
          if (e.name === 'AbortError') return;
          setRemote({ status: 'error', items: [], error: 'No se ha podido consultar Open Food Facts. Comprueba la conexión e inténtalo de nuevo.' });
        });
    }, 450);
    return () => clearTimeout(t);
  }, [query, enabled, tick]);

  return { local, remote, remoteEnabled: enabled, retry: () => setTick((t) => t + 1) };
}
