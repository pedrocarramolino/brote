import type { Allergen, Food, ShopCategory } from '../types';

/*
 * Base de alimentos local.
 * Valores por 100 g (o 100 ml) tomados como referencia general de tablas públicas
 * de composición (BEDCA / USDA FoodData Central), redondeados. Son valores medios:
 * pueden variar según marca, variedad y preparación. Por eso cada alimento lleva
 * `source: 'referencia'` y la interfaz lo indica como "valor de referencia".
 */

type Row = [
  id: string,
  name: string,
  unit: 'g' | 'ml',
  kcal: number,
  protein: number,
  carbs: number,
  fat: number,
  category: ShopCategory,
  allergens?: Allergen[],
  portion?: [string, number],
  tags?: Food['tags'],
];

const rows: Row[] = [
  // Verduras y frutas
  ['tomate', 'Tomate', 'g', 18, 0.9, 3.9, 0.2, 'verduras', [], ['1 mediano', 120]],
  ['lechuga', 'Lechuga', 'g', 15, 1.4, 2.9, 0.2, 'verduras', [], ['1 plato', 80]],
  ['espinacas', 'Espinacas frescas', 'g', 23, 2.9, 3.6, 0.4, 'verduras', [], ['1 puñado', 40]],
  ['rucula', 'Rúcula', 'g', 25, 2.6, 3.7, 0.7, 'verduras', [], ['1 puñado', 30]],
  ['brocoli', 'Brócoli', 'g', 34, 2.8, 6.6, 0.4, 'verduras', [], ['1 ración', 150]],
  ['calabacin', 'Calabacín', 'g', 17, 1.2, 3.1, 0.3, 'verduras', [], ['1 mediano', 250]],
  ['berenjena', 'Berenjena', 'g', 25, 1, 5.9, 0.2, 'verduras', [], ['1 mediana', 300]],
  ['cebolla', 'Cebolla', 'g', 40, 1.1, 9.3, 0.1, 'verduras', [], ['1 mediana', 110]],
  ['ajo', 'Ajo', 'g', 149, 6.4, 33, 0.5, 'verduras', [], ['1 diente', 5]],
  ['pimiento', 'Pimiento rojo', 'g', 31, 1, 6, 0.3, 'verduras', [], ['1 mediano', 150]],
  ['zanahoria', 'Zanahoria', 'g', 41, 0.9, 9.6, 0.2, 'verduras', [], ['1 mediana', 70]],
  ['pepino', 'Pepino', 'g', 15, 0.7, 3.6, 0.1, 'verduras', [], ['1/2 unidad', 120]],
  ['champinones', 'Champiñones', 'g', 22, 3.1, 3.3, 0.3, 'verduras', [], ['1 bandeja', 250]],
  ['judias_verdes', 'Judías verdes', 'g', 31, 1.8, 7, 0.2, 'verduras', [], ['1 ración', 150]],
  ['patata', 'Patata', 'g', 77, 2, 17, 0.1, 'verduras', [], ['1 mediana', 170]],
  ['boniato', 'Boniato', 'g', 86, 1.6, 20, 0.1, 'verduras', [], ['1 mediano', 200]],
  ['aguacate', 'Aguacate', 'g', 160, 2, 8.5, 14.7, 'verduras', [], ['1/2 unidad', 70]],
  ['platano', 'Plátano', 'g', 89, 1.1, 22.8, 0.3, 'verduras', [], ['1 mediano', 120]],
  ['manzana', 'Manzana', 'g', 52, 0.3, 13.8, 0.2, 'verduras', [], ['1 mediana', 180]],
  ['naranja', 'Naranja', 'g', 47, 0.9, 11.8, 0.1, 'verduras', [], ['1 mediana', 160]],
  ['kiwi', 'Kiwi', 'g', 61, 1.1, 14.7, 0.5, 'verduras', [], ['1 unidad', 75]],
  ['fresas', 'Fresas', 'g', 32, 0.7, 7.7, 0.3, 'verduras', [], ['1 taza', 150]],
  ['frutos_rojos', 'Arándanos', 'g', 57, 0.7, 14.5, 0.3, 'verduras', [], ['1 puñado', 80]],
  ['limon', 'Limón', 'g', 29, 1.1, 9.3, 0.3, 'verduras', [], ['1/2 unidad', 30]],

  // Carnes, pescados y otras proteínas
  ['pollo', 'Pechuga de pollo', 'g', 120, 22.5, 0, 2.6, 'proteinas', [], ['1 filete', 150], ['animal', 'carne']],
  ['pavo', 'Pechuga de pavo', 'g', 114, 23.7, 0, 1.5, 'proteinas', [], ['1 filete', 150], ['animal', 'carne']],
  ['pavo_fiambre', 'Pavo en lonchas', 'g', 105, 19, 2, 2, 'proteinas', [], ['3 lonchas', 40], ['animal', 'carne']],
  ['ternera', 'Ternera magra', 'g', 150, 21, 0, 7, 'proteinas', [], ['1 filete', 130], ['animal', 'carne']],
  ['salmon', 'Salmón', 'g', 208, 20, 0, 13, 'proteinas', ['pescado'], ['1 lomo', 130], ['animal', 'pescado']],
  ['merluza', 'Merluza', 'g', 77, 17.7, 0, 0.7, 'proteinas', ['pescado'], ['1 lomo', 160], ['animal', 'pescado']],
  ['langostinos', 'Langostinos pelados', 'g', 85, 20, 0.2, 0.5, 'proteinas', ['marisco'], ['1 ración', 120], ['animal', 'pescado']],
  ['huevo', 'Huevo', 'g', 143, 12.6, 0.7, 9.5, 'proteinas', ['huevo'], ['1 unidad (M)', 55], ['animal', 'huevo']],
  ['tofu', 'Tofu firme', 'g', 144, 15.8, 2.8, 8.7, 'proteinas', ['soja'], ['1/2 bloque', 120]],

  // Lácteos y alternativas
  ['yogur', 'Yogur natural', 'g', 61, 3.5, 4.7, 3.3, 'lacteos', ['lactosa'], ['1 unidad', 125], ['animal', 'lacteo']],
  ['yogur_griego', 'Yogur griego 0 %', 'g', 59, 10.3, 3.6, 0.4, 'lacteos', ['lactosa'], ['1 bol', 170], ['animal', 'lacteo']],
  ['queso_batido', 'Queso fresco batido 0 %', 'g', 46, 8, 3.5, 0.2, 'lacteos', ['lactosa'], ['1 tarrina', 150], ['animal', 'lacteo']],
  ['queso_fresco', 'Queso fresco', 'g', 174, 12, 3, 13, 'lacteos', ['lactosa'], ['1 loncha gruesa', 50], ['animal', 'lacteo']],
  ['mozzarella', 'Mozzarella', 'g', 250, 18, 2, 19, 'lacteos', ['lactosa'], ['1/2 bola', 60], ['animal', 'lacteo']],
  ['parmesano', 'Parmesano', 'g', 431, 38, 4.1, 29, 'lacteos', ['lactosa'], ['1 cucharada', 10], ['animal', 'lacteo']],
  ['leche', 'Leche semidesnatada', 'ml', 46, 3.3, 4.8, 1.6, 'lacteos', ['lactosa'], ['1 vaso', 250], ['animal', 'lacteo']],
  ['bebida_soja', 'Bebida de soja', 'ml', 39, 3.3, 2.5, 1.8, 'lacteos', ['soja'], ['1 vaso', 250]],
  ['bebida_avena', 'Bebida de avena', 'ml', 45, 1, 6.5, 1.5, 'lacteos', ['gluten'], ['1 vaso', 250]],

  // Cereales, pasta, arroz y pan
  ['avena', 'Copos de avena', 'g', 379, 13, 67.7, 6.5, 'cereales', ['gluten'], ['1 bol', 50]],
  ['pan_integral', 'Pan integral', 'g', 247, 13, 41, 3.4, 'cereales', ['gluten'], ['2 rebanadas', 60]],
  ['arroz_integral', 'Arroz integral (crudo)', 'g', 362, 7.5, 76, 2.7, 'cereales', [], ['1 ración', 70]],
  ['arroz', 'Arroz blanco (crudo)', 'g', 360, 6.6, 79, 0.6, 'cereales', [], ['1 ración', 70]],
  ['pasta_integral', 'Pasta integral (cruda)', 'g', 348, 13, 72, 2.5, 'cereales', ['gluten'], ['1 ración', 80]],
  ['quinoa', 'Quinoa (cruda)', 'g', 368, 14.1, 64, 6.1, 'cereales', [], ['1 ración', 60]],
  ['cuscus', 'Cuscús (crudo)', 'g', 376, 12.8, 77, 0.6, 'cereales', ['gluten'], ['1 ración', 60]],
  ['tortilla_trigo', 'Tortilla de trigo integral', 'g', 300, 8.5, 50, 7.5, 'cereales', ['gluten'], ['1 unidad', 60]],
  ['tortitas_arroz', 'Tortitas de arroz', 'g', 387, 8, 81, 2.8, 'cereales', [], ['2 unidades', 20]],

  // Conservas y productos básicos
  ['garbanzos', 'Garbanzos cocidos', 'g', 164, 8.9, 27.4, 2.6, 'conservas', [], ['1 bote escurrido', 240]],
  ['lentejas', 'Lentejas cocidas', 'g', 116, 9, 20.1, 0.4, 'conservas', [], ['1 bote escurrido', 250]],
  ['alubias', 'Alubias cocidas', 'g', 127, 8.7, 22.8, 0.5, 'conservas', [], ['1 bote escurrido', 250]],
  ['atun', 'Atún al natural (escurrido)', 'g', 116, 25.5, 0, 0.8, 'conservas', ['pescado'], ['1 lata', 56], ['animal', 'pescado']],
  ['tomate_triturado', 'Tomate triturado', 'g', 32, 1.6, 7, 0.3, 'conservas', [], ['1/4 bote', 100]],
  ['hummus', 'Hummus', 'g', 166, 7.9, 14.3, 9.6, 'conservas', ['sesamo'], ['2 cucharadas', 40]],
  ['aceite', 'Aceite de oliva virgen extra', 'g', 884, 0, 0, 100, 'conservas', [], ['1 cucharada', 10]],
  ['caldo', 'Caldo de verduras', 'ml', 6, 0.2, 1, 0.1, 'conservas', ['apio'], ['1 taza', 250]],
  ['salsa_soja', 'Salsa de soja', 'ml', 53, 8, 4.9, 0.6, 'conservas', ['soja', 'gluten'], ['1 cucharada', 15]],
  ['miel', 'Miel', 'g', 304, 0.3, 82, 0, 'conservas', [], ['1 cucharadita', 8], ['animal']],
  ['crema_cacahuete', 'Crema de cacahuete', 'g', 588, 25, 20, 50, 'conservas', ['cacahuete'], ['1 cucharada', 15]],
  ['nueces', 'Nueces', 'g', 654, 15.2, 13.7, 65.2, 'otros', ['frutos_secos'], ['1 puñado', 20]],
  ['almendras', 'Almendras', 'g', 579, 21, 21.6, 49.9, 'otros', ['frutos_secos'], ['1 puñado', 20]],
  ['chia', 'Semillas de chía', 'g', 486, 16.5, 42, 30.7, 'otros', [], ['1 cucharada', 10]],
  ['cafe', 'Café solo', 'ml', 2, 0.1, 0, 0, 'otros', [], ['1 taza', 60]],
  ['chocolate', 'Chocolate negro 85 %', 'g', 580, 11, 19, 50, 'otros', ['lactosa'], ['2 onzas', 20]],
];

export const BASE_FOODS: Food[] = rows.map(([id, name, unit, kcal, protein, carbs, fat, category, allergens, portion, tags]) => ({
  id,
  name,
  unit,
  per100: { kcal, protein, carbs, fat },
  category,
  allergens: allergens ?? [],
  source: 'referencia',
  portion: portion ? { label: portion[0], amount: portion[1] } : undefined,
  tags,
}));

/** Grupos de intercambio para calcular equivalencias por el macronutriente dominante */
export const EXCHANGE_GROUPS: { id: string; label: string; basis: 'carbs' | 'protein' | 'fat' | 'kcal'; foods: string[] }[] = [
  { id: 'hidratos', label: 'Hidratos', basis: 'carbs', foods: ['arroz', 'arroz_integral', 'pasta_integral', 'quinoa', 'cuscus', 'patata', 'boniato', 'pan_integral', 'avena', 'tortitas_arroz', 'tortilla_trigo'] },
  { id: 'proteinas', label: 'Proteína', basis: 'protein', foods: ['pollo', 'pavo', 'ternera', 'salmon', 'merluza', 'atun', 'langostinos', 'huevo', 'tofu', 'pavo_fiambre'] },
  { id: 'legumbres', label: 'Legumbres', basis: 'protein', foods: ['garbanzos', 'lentejas', 'alubias', 'tofu'] },
  { id: 'lacteos', label: 'Lácteos', basis: 'protein', foods: ['yogur', 'yogur_griego', 'queso_batido', 'leche', 'bebida_soja'] },
  { id: 'grasas', label: 'Grasas', basis: 'fat', foods: ['aceite', 'aguacate', 'nueces', 'almendras', 'crema_cacahuete'] },
  { id: 'fruta', label: 'Fruta', basis: 'kcal', foods: ['platano', 'manzana', 'naranja', 'kiwi', 'fresas', 'frutos_rojos'] },
  { id: 'verdura', label: 'Verdura', basis: 'kcal', foods: ['brocoli', 'calabacin', 'berenjena', 'judias_verdes', 'espinacas', 'champinones', 'pimiento'] },
];

export const ALLERGEN_LABELS: Record<Allergen, string> = {
  gluten: 'Gluten',
  lactosa: 'Lactosa / leche',
  huevo: 'Huevo',
  frutos_secos: 'Frutos secos',
  cacahuete: 'Cacahuete',
  soja: 'Soja',
  pescado: 'Pescado',
  marisco: 'Marisco',
  sesamo: 'Sésamo',
  apio: 'Apio',
  mostaza: 'Mostaza',
  sulfitos: 'Sulfitos',
};

export const CATEGORY_LABELS: Record<ShopCategory, string> = {
  verduras: 'Verduras y frutas',
  proteinas: 'Carnes, pescados y otras proteínas',
  lacteos: 'Lácteos y alternativas',
  cereales: 'Cereales, pasta, arroz y pan',
  conservas: 'Conservas y productos básicos',
  otros: 'Otros ingredientes',
};

export const CATEGORY_ORDER: ShopCategory[] = ['verduras', 'proteinas', 'lacteos', 'cereales', 'conservas', 'otros'];
