import type { Food } from '../types';

export const SOURCE_LABEL: Record<Food['source'], string> = {
  bedca: 'BEDCA (AESAN)',
  usda: 'USDA FoodData Central',
  referencia: 'Valor estimado',
  usuario: 'Introducido por ti',
  openfoodfacts: 'Media de etiquetas',
  estimacion: 'Estimación',
};
