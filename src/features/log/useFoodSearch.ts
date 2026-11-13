import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import type { AppData, Food } from '../../types';
import { openFoodFactsProvider } from '../../services/foodDatabase';
import { BASE_FOODS, OFFICIAL_FOODS } from '../../data/foods';
import { FoodIndex, loadBranded, type FoodKind } from '../../services/foodSearch';

export interface RemoteState {
  status: 'idle' | 'loading' | 'error' | 'done';
  items: Food[];
  error?: string;
}

/**
 * Búsqueda de alimentos para Hoy y el creador de platos:
 * alimentos de la app + catálogo BEDCA/USDA + productos de marca (cargados al primer uso)
 * + alimentos propios. Opcionalmente, Open Food Facts en línea si el usuario lo activó.
 */
export function useFoodSearch(data: AppData, query: string, active: boolean, kind: FoodKind | 'todos' = 'todos') {
  const [branded, setBranded] = useState<Food[] | null>(null);
  useEffect(() => {
    if (!active || branded) return;
    let alive = true;
    loadBranded().then((b) => alive && setBranded(b)).catch(() => alive && setBranded([]));
    return () => {
      alive = false;
    };
  }, [active, branded]);

  const index = useMemo(() => {
    const idx = new FoodIndex();
    idx.add(BASE_FOODS, 6);
    idx.add(data.customFoods.filter((f) => f.source === 'usuario'), 5);
    idx.add(OFFICIAL_FOODS, 4);
    idx.add(data.customFoods.filter((f) => f.source !== 'usuario'), 0.5);
    if (branded) idx.add(branded, 0);
    return idx;
  }, [data.customFoods, branded]);

  const deferred = useDeferredValue(query);
  const local = useMemo(() => index.search(deferred, { kind, limit: 60 }), [index, deferred, kind]);

  // Open Food Facts en línea (opcional): solo si el usuario lo activó en Perfil
  const [remote, setRemote] = useState<RemoteState>({ status: 'idle', items: [] });
  const [tick, setTick] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const enabled = active && data.profile.useOpenFoodFacts && kind !== 'generico';
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
        .then((items) => setRemote({ status: 'done', items: items.filter((f) => !index.has(f.id)) }))
        .catch((e: Error) => {
          if (e.name === 'AbortError') return;
          setRemote({ status: 'error', items: [], error: 'No se ha podido consultar Open Food Facts. Comprueba la conexión e inténtalo de nuevo.' });
        });
    }, 450);
    return () => clearTimeout(t);
  }, [query, enabled, tick, index]);

  return { local, remote, remoteEnabled: enabled, retry: () => setTick((t) => t + 1), brandedReady: !!branded, total: index.size };
}
