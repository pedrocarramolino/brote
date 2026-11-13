import { useDeferredValue, useMemo } from 'react';
import type { AppData } from '../../types';
import { BASE_FOODS, OFFICIAL_FOODS } from '../../data/foods';
import { FoodIndex } from '../../services/foodSearch';

/**
 * Búsqueda de alimentos para Hoy y el creador de platos: alimentos de la app, catálogo
 * genérico de BEDCA/USDA y alimentos creados por el usuario. Sin marcas comerciales.
 */
export function useFoodSearch(data: AppData, query: string) {
  const index = useMemo(() => {
    const idx = new FoodIndex();
    idx.add(BASE_FOODS, 6);
    idx.add(data.customFoods.filter((f) => !f.brand && f.source !== 'openfoodfacts'), 5);
    idx.add(OFFICIAL_FOODS, 4);
    return idx;
  }, [data.customFoods]);
  const deferred = useDeferredValue(query);
  const local = useMemo(() => index.search(deferred, { limit: 60 }), [index, deferred]);
  return { local, total: index.size };
}
