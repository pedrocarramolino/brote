import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AppData, ISODate, PlannedMeal } from '../types';
import { repository } from '../services/storage';
import { generateWeek } from '../services/planner';
import { createDemoData, DATA_VERSION } from '../data/demo';
import { DEFAULT_HABITS } from '../data/routines';
import { migrateFoodDb } from '../services/history';
import { startOfWeek, todayISO } from '../lib/dates';

interface StoreValue {
  data: AppData | null;
  ready: boolean;
  saveError: string | null;
  storageAvailable: boolean;
  /** Aplica un cambio sobre una copia de los datos y lo persiste. */
  mutate: (fn: (draft: AppData) => void) => void;
  replace: (data: AppData | null) => void;
  loadDemo: () => void;
  clearAll: () => Promise<void>;
}

const Ctx = createContext<StoreValue | null>(null);

function migrate(d: AppData): AppData {
  // Punto único para migraciones de versión del modelo de datos.
  const out = { ...d };
  if (!out.habits?.length) out.habits = DEFAULT_HABITS.map((h) => ({ ...h }));
  out.chat ??= [];
  out.favorites ??= { recipes: [], foods: [] };
  out.replacements ??= [];
  // base de alimentos con valores oficiales: congelar el historial anterior con sus valores originales
  migrateFoodDb(out, todayISO());
  out.shopping ??= {};
  // Revisión semanal: los datos anteriores a esta función empiezan con la semana actual revisada
  if (out.onboarded && !out.weeklyReview) out.weeklyReview = { lastCompleted: startOfWeek(todayISO()) };
  out.version = DATA_VERSION;
  return out;
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData | null>(null);
  const [ready, setReady] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const skipSave = useRef(true);

  useEffect(() => {
    repository.load().then((d) => {
      setData(d ? migrate(d) : null);
      setReady(true);
    });
  }, []);

  // Guardado con pequeño retardo para agrupar cambios seguidos
  useEffect(() => {
    if (!ready) return;
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    const t = setTimeout(() => {
      if (data) {
        repository
          .save(data)
          .then(() => setSaveError(null))
          .catch((e: Error) => setSaveError(e.message));
      } else {
        repository.clear();
      }
    }, 200);
    return () => clearTimeout(t);
  }, [data, ready]);

  const mutate = useCallback((fn: (draft: AppData) => void) => {
    setData((prev) => {
      if (!prev) return prev;
      const draft = structuredClone(prev);
      fn(draft);
      return draft;
    });
  }, []);

  const replace = useCallback((d: AppData | null) => setData(d), []);
  const loadDemo = useCallback(() => setData(createDemoData()), []);
  const clearAll = useCallback(async () => {
    await repository.clear();
    setData(null);
  }, []);

  const value = useMemo<StoreValue>(
    () => ({ data, ready, saveError, storageAvailable: (repository as { available?: boolean }).available !== false, mutate, replace, loadDemo, clearAll }),
    [data, ready, saveError, mutate, replace, loadDemo, clearAll],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): StoreValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore debe usarse dentro de AppStoreProvider');
  return v;
}

/** Datos garantizados (las páginas solo se montan cuando hay datos). */
export function useData(): AppData {
  const { data } = useStore();
  if (!data) throw new Error('Sin datos');
  return data;
}

/** Devuelve el menú de una semana y lo genera (y guarda) la primera vez que se consulta. */
export function useWeek(monday: ISODate): PlannedMeal[] {
  const { data, mutate } = useStore();
  const existing = data?.plan[monday];
  useEffect(() => {
    if (data && !data.plan[monday]) {
      mutate((d) => {
        if (!d.plan[monday]) d.plan[monday] = generateWeek(d, monday);
      });
    }
  }, [monday, data, mutate]);
  return existing ?? [];
}
