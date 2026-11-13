import type { Allergen, Food, Macros, ShopCategory } from '../types';
import OFFICIAL from './foodDb/official.json';
import CURATED_JSON from './foodDb/curated.json';

/*
 * Base de alimentos local.
 * Valores por 100 g (o 100 ml) de alimento crudo salvo que el nombre diga otra cosa
 * (p. ej. «cocidos», «lata»). Son valores MEDIOS APROXIMADOS del orden de los que
 * recogen las tablas públicas de composición; NO se han contrastado uno a uno con
 * BEDCA, AESAN ni otra base concreta, así que no se atribuyen a ninguna. Por eso
 * cada alimento lleva `source: 'referencia'` y la interfaz los presenta como
 * «valores estimados»: pueden variar según marca, variedad y preparación.
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

  // ---- Ampliación de la base (v2): verduras de temporada ----
  ['coliflor', 'Coliflor', 'g', 25, 1.9, 5, 0.3, 'verduras', [], ['1 ración', 200]],
  ['puerro', 'Puerro', 'g', 61, 1.5, 14, 0.3, 'verduras', [], ['1 unidad', 120]],
  ['apio', 'Apio', 'g', 16, 0.7, 3, 0.2, 'verduras', ['apio'], ['1 rama', 40]],
  ['calabaza', 'Calabaza', 'g', 26, 1, 6.5, 0.1, 'verduras', [], ['1 ración', 200]],
  ['esparragos', 'Espárragos verdes', 'g', 20, 2.2, 3.9, 0.1, 'verduras', [], ['1 manojo', 200]],
  ['guisantes', 'Guisantes (congelados)', 'g', 81, 5.4, 14, 0.4, 'verduras', [], ['1 ración', 100]],
  ['alcachofa', 'Alcachofa', 'g', 47, 3.3, 10.5, 0.2, 'verduras', [], ['2 unidades', 200]],
  ['col_lombarda', 'Col lombarda', 'g', 31, 1.4, 7.4, 0.2, 'verduras', [], ['1 ración', 150]],
  ['repollo', 'Repollo', 'g', 25, 1.3, 5.8, 0.1, 'verduras', [], ['1 ración', 150]],
  ['kale', 'Kale', 'g', 49, 4.3, 8.8, 0.9, 'verduras', [], ['1 puñado', 50]],
  ['acelgas', 'Acelgas', 'g', 19, 1.8, 3.7, 0.2, 'verduras', [], ['1 ración', 200]],
  ['remolacha', 'Remolacha cocida', 'g', 44, 1.7, 10, 0.2, 'verduras', [], ['1 unidad', 100]],
  ['cebolla_morada', 'Cebolla morada', 'g', 40, 1.1, 9.3, 0.1, 'verduras', [], ['1/2 unidad', 60]],
  ['setas', 'Setas de cardo', 'g', 33, 3.3, 6, 0.4, 'verduras', [], ['1 bandeja', 200]],
  ['pimiento_verde', 'Pimiento verde', 'g', 20, 0.9, 4.6, 0.2, 'verduras', [], ['1 mediano', 140]],
  ['tomate_cherry', 'Tomates cherry', 'g', 18, 0.9, 3.9, 0.2, 'verduras', [], ['1 puñado', 100]],
  ['canonigos', 'Canónigos', 'g', 21, 2, 3.6, 0.4, 'verduras', [], ['1 puñado', 40]],
  ['rabanos', 'Rábanos', 'g', 16, 0.7, 3.4, 0.1, 'verduras', [], ['4 unidades', 40]],
  ['jengibre', 'Jengibre fresco', 'g', 80, 1.8, 18, 0.8, 'verduras', [], ['1 trocito', 5]],
  ['perejil', 'Perejil fresco', 'g', 36, 3, 6.3, 0.8, 'verduras', [], ['1 cucharada picada', 4]],

  // ---- Frutas de temporada y habituales ----
  ['pera', 'Pera', 'g', 57, 0.4, 15, 0.1, 'verduras', [], ['1 mediana', 170]],
  ['melocoton', 'Melocotón', 'g', 39, 0.9, 9.5, 0.3, 'verduras', [], ['1 mediano', 150]],
  ['mango', 'Mango', 'g', 60, 0.8, 15, 0.4, 'verduras', [], ['1/2 unidad', 150]],
  ['pina', 'Piña', 'g', 50, 0.5, 13, 0.1, 'verduras', [], ['2 rodajas', 150]],
  ['uvas', 'Uvas', 'g', 69, 0.7, 18, 0.2, 'verduras', [], ['1 racimo pequeño', 120]],
  ['sandia', 'Sandía', 'g', 30, 0.6, 7.6, 0.2, 'verduras', [], ['1 tajada', 250]],
  ['melon', 'Melón', 'g', 34, 0.8, 8.2, 0.2, 'verduras', [], ['1 tajada', 200]],
  ['granada', 'Granada', 'g', 83, 1.7, 18.7, 1.2, 'verduras', [], ['1/2 unidad', 100]],
  ['higos', 'Higos', 'g', 74, 0.8, 19, 0.3, 'verduras', [], ['2 unidades', 100]],
  ['mandarina', 'Mandarina', 'g', 53, 0.8, 13.3, 0.3, 'verduras', [], ['1 unidad', 80]],
  ['ciruela', 'Ciruela', 'g', 46, 0.7, 11.4, 0.3, 'verduras', [], ['2 unidades', 120]],
  ['cerezas', 'Cerezas', 'g', 63, 1.1, 16, 0.2, 'verduras', [], ['1 puñado', 120]],
  ['frambuesas', 'Frambuesas', 'g', 52, 1.2, 12, 0.7, 'verduras', [], ['1 tarrina', 125]],
  ['caqui', 'Caqui', 'g', 70, 0.6, 18.6, 0.2, 'verduras', [], ['1 unidad', 180]],
  ['datiles', 'Dátiles', 'g', 282, 2.5, 75, 0.4, 'otros', [], ['2 unidades', 16]],
  ['pasas', 'Uvas pasas', 'g', 299, 3.1, 79, 0.5, 'otros', ['sulfitos'], ['1 cucharada', 15]],

  // ---- Carnes ----
  ['pollo_contramuslo', 'Contramuslo de pollo sin piel', 'g', 135, 19, 0, 6.5, 'proteinas', [], ['2 unidades', 180], ['animal', 'carne']],
  ['ternera_picada', 'Carne picada de ternera', 'g', 170, 20, 0, 10, 'proteinas', [], ['1 ración', 120], ['animal', 'carne']],
  ['lomo_cerdo', 'Lomo de cerdo', 'g', 143, 21, 0, 6, 'proteinas', [], ['2 filetes', 130], ['animal', 'carne']],
  ['solomillo_cerdo', 'Solomillo de cerdo', 'g', 120, 21, 0, 3.5, 'proteinas', [], ['1 ración', 140], ['animal', 'carne']],
  ['jamon_serrano', 'Jamón serrano', 'g', 241, 31, 0, 13, 'proteinas', [], ['2 lonchas', 25], ['animal', 'carne']],
  ['jamon_cocido', 'Jamón cocido extra', 'g', 110, 18, 1.5, 3.5, 'proteinas', [], ['3 lonchas', 45], ['animal', 'carne']],

  // ---- Pescados y mariscos ----
  ['bacalao', 'Bacalao fresco o desalado', 'g', 82, 18, 0, 0.7, 'proteinas', ['pescado'], ['1 lomo', 160], ['animal', 'pescado']],
  ['lubina', 'Lubina', 'g', 97, 18.4, 0, 2.6, 'proteinas', ['pescado'], ['1 filete', 150], ['animal', 'pescado']],
  ['dorada', 'Dorada', 'g', 100, 19, 0, 3, 'proteinas', ['pescado'], ['1 filete', 150], ['animal', 'pescado']],
  ['sardinas', 'Sardinas frescas', 'g', 140, 19, 0, 7, 'proteinas', ['pescado'], ['1 ración', 150], ['animal', 'pescado']],
  ['caballa', 'Caballa', 'g', 205, 18.6, 0, 13.9, 'proteinas', ['pescado'], ['1 filete', 120], ['animal', 'pescado']],
  ['atun_fresco', 'Atún fresco', 'g', 130, 23, 0, 4, 'proteinas', ['pescado'], ['1 filete', 140], ['animal', 'pescado']],
  ['salmon_ahumado', 'Salmón ahumado', 'g', 117, 18, 0, 4.3, 'proteinas', ['pescado'], ['3 lonchas', 50], ['animal', 'pescado']],
  ['gambas', 'Gambas peladas', 'g', 85, 18, 0.9, 1, 'proteinas', ['marisco'], ['1 ración', 120], ['animal', 'pescado']],
  ['mejillones', 'Mejillones (carne)', 'g', 86, 12, 3.7, 2.2, 'proteinas', ['marisco'], ['1 ración', 120], ['animal', 'pescado']],
  ['calamar', 'Calamar', 'g', 92, 15.6, 3, 1.4, 'proteinas', ['marisco'], ['1 ración', 150], ['animal', 'pescado']],
  ['sepia', 'Sepia', 'g', 79, 16, 0.8, 0.7, 'proteinas', ['marisco'], ['1 ración', 150], ['animal', 'pescado']],

  // ---- Huevo y proteína vegetal ----
  ['claras', 'Claras de huevo', 'g', 52, 10.9, 0.7, 0.2, 'proteinas', ['huevo'], ['2 claras', 70], ['animal', 'huevo']],
  ['tempeh', 'Tempeh', 'g', 192, 20, 7.6, 10.8, 'proteinas', ['soja'], ['1 ración', 100]],
  ['soja_texturizada', 'Soja texturizada (seca)', 'g', 330, 50, 30, 1, 'proteinas', ['soja'], ['1 ración', 40]],
  ['edamame', 'Edamame', 'g', 121, 11.9, 8.9, 5.2, 'proteinas', ['soja'], ['1 ración', 100]],
  ['seitan', 'Seitán', 'g', 140, 25, 6, 2, 'proteinas', ['gluten'], ['1 ración', 120]],

  // ---- Lácteos y quesos ----
  ['requeson', 'Requesón', 'g', 98, 11, 3.4, 4.3, 'lacteos', ['lactosa'], ['1 tarrina', 100], ['animal', 'lacteo']],
  ['skyr', 'Skyr natural', 'g', 63, 11, 4, 0.2, 'lacteos', ['lactosa'], ['1 tarrina', 150], ['animal', 'lacteo']],
  ['kefir', 'Kéfir', 'ml', 60, 3.4, 4, 3.3, 'lacteos', ['lactosa'], ['1 vaso', 200], ['animal', 'lacteo']],
  ['queso_curado', 'Queso curado', 'g', 400, 26, 0.5, 33, 'lacteos', ['lactosa'], ['2 lonchas', 20], ['animal', 'lacteo']],
  ['queso_cabra', 'Queso de cabra (rulo)', 'g', 290, 19, 1, 24, 'lacteos', ['lactosa'], ['2 rodajas', 40], ['animal', 'lacteo']],
  ['feta', 'Queso feta', 'g', 264, 14, 4, 21, 'lacteos', ['lactosa'], ['1 ración', 40], ['animal', 'lacteo']],
  ['queso_rallado', 'Queso rallado', 'g', 380, 28, 0, 30, 'lacteos', ['lactosa'], ['1 puñado', 20], ['animal', 'lacteo']],
  ['yogur_soja', 'Yogur de soja natural', 'g', 54, 4, 2.5, 2.8, 'lacteos', ['soja'], ['1 unidad', 125]],
  ['bebida_almendra', 'Bebida de almendra sin azúcar', 'ml', 15, 0.5, 0.3, 1.1, 'lacteos', ['frutos_secos'], ['1 vaso', 250]],

  // ---- Cereales, pan y harinas ----
  ['pasta', 'Pasta (cruda)', 'g', 357, 12.5, 74, 1.5, 'cereales', ['gluten'], ['1 ración', 80]],
  ['fideos_arroz', 'Fideos de arroz (crudos)', 'g', 364, 6, 80, 0.6, 'cereales', [], ['1 ración', 70]],
  ['bulgur', 'Bulgur (crudo)', 'g', 342, 12.3, 76, 1.3, 'cereales', ['gluten'], ['1 ración', 60]],
  ['pan', 'Pan de barra', 'g', 270, 9, 53, 1.5, 'cereales', ['gluten'], ['1 bocadillo', 80]],
  ['pan_centeno', 'Pan de centeno', 'g', 259, 8.5, 48, 3.3, 'cereales', ['gluten'], ['2 rebanadas', 60]],
  ['pan_pita', 'Pan de pita', 'g', 275, 9, 55, 1.2, 'cereales', ['gluten'], ['1 unidad', 60]],
  ['tortilla_maiz', 'Tortilla de maíz', 'g', 218, 5.7, 44.6, 2.9, 'cereales', [], ['2 unidades', 50]],
  ['harina', 'Harina de trigo', 'g', 364, 10, 76, 1, 'cereales', ['gluten'], ['1 cucharada', 10]],
  ['harina_integral', 'Harina integral de trigo', 'g', 340, 13, 72, 2.5, 'cereales', ['gluten'], ['1 cucharada', 10]],
  ['muesli', 'Muesli sin azúcar añadido', 'g', 365, 10, 66, 6, 'cereales', ['gluten', 'frutos_secos'], ['1 bol', 40]],
  ['granola', 'Granola', 'g', 450, 10, 64, 17, 'cereales', ['gluten', 'frutos_secos'], ['1 puñado', 30]],
  ['copos_maiz', 'Copos de maíz', 'g', 357, 7.5, 84, 0.4, 'cereales', ['gluten'], ['1 bol', 30]],
  ['maiz', 'Maíz dulce (lata, escurrido)', 'g', 86, 3.3, 19, 1.2, 'conservas', [], ['1 lata pequeña', 70]],

  // ---- Conservas, salsas y despensa ----
  ['aceitunas', 'Aceitunas', 'g', 145, 1, 4, 15, 'conservas', [], ['8 unidades', 30]],
  ['piquillos', 'Pimientos del piquillo', 'g', 30, 1, 6, 0.3, 'conservas', [], ['3 unidades', 60]],
  ['mostaza', 'Mostaza', 'g', 66, 4.4, 5.8, 3.3, 'conservas', ['mostaza'], ['1 cucharadita', 5]],
  ['vinagre', 'Vinagre', 'ml', 20, 0, 0.6, 0, 'conservas', ['sulfitos'], ['1 cucharada', 10]],
  ['tahini', 'Tahini (crema de sésamo)', 'g', 595, 17, 21, 54, 'conservas', ['sesamo'], ['1 cucharada', 15]],
  ['leche_coco', 'Leche de coco (lata)', 'ml', 197, 2, 3, 21, 'conservas', [], ['1/4 lata', 100]],
  ['caldo_pollo', 'Caldo de pollo', 'ml', 8, 0.6, 0.3, 0.4, 'conservas', ['apio'], ['1 taza', 250], ['animal', 'carne']],
  ['caldo_pescado', 'Caldo de pescado', 'ml', 8, 1, 0.3, 0.3, 'conservas', ['pescado'], ['1 taza', 250], ['animal', 'pescado']],
  ['tomate_frito', 'Tomate frito casero', 'g', 80, 1.5, 9, 4, 'conservas', [], ['2 cucharadas', 40]],
  ['cacao', 'Cacao puro en polvo', 'g', 360, 23, 12, 11, 'otros', [], ['1 cucharada', 8]],
  ['coco_rallado', 'Coco rallado', 'g', 660, 6.9, 24, 64, 'otros', [], ['1 cucharada', 8]],
  ['pipas_girasol', 'Pipas de girasol peladas', 'g', 584, 21, 20, 51, 'otros', [], ['1 cucharada', 10]],
  ['sesamo', 'Semillas de sésamo', 'g', 573, 17.7, 23, 49.7, 'otros', ['sesamo'], ['1 cucharada', 10]],
  ['lino', 'Semillas de lino', 'g', 534, 18.3, 29, 42, 'otros', [], ['1 cucharada', 10]],
  ['pistachos', 'Pistachos pelados', 'g', 562, 20, 28, 45, 'otros', ['frutos_secos'], ['1 puñado', 20]],
  ['avellanas', 'Avellanas', 'g', 628, 15, 17, 61, 'otros', ['frutos_secos'], ['1 puñado', 20]],
  ['anacardos', 'Anacardos', 'g', 553, 18, 30, 44, 'otros', ['frutos_secos'], ['1 puñado', 20]],
  ['crema_almendras', 'Crema de almendras', 'g', 614, 21, 19, 56, 'otros', ['frutos_secos'], ['1 cucharada', 15]],
  ['canela', 'Canela molida', 'g', 247, 4, 81, 1.2, 'otros', [], ['1 pizca', 1]],
  ['levadura_quimica', 'Levadura química', 'g', 53, 0, 28, 0, 'otros', [], ['1 sobre', 8]],
  // ---- Ampliación de la base (v3): más pescados, mariscos, hierbas y despensa ----
  ['rape', 'Rape', 'g', 76, 16, 0, 1.5, 'proteinas', ['pescado'], ['1 ración', 150], ['animal', 'pescado']],
  ['boquerones', 'Boquerones frescos', 'g', 131, 20, 0, 4.8, 'proteinas', ['pescado'], ['1 ración', 150], ['animal', 'pescado']],
  ['trucha', 'Trucha', 'g', 141, 20, 0, 6.6, 'proteinas', ['pescado'], ['1 filete', 150], ['animal', 'pescado']],
  ['emperador', 'Pez espada (emperador)', 'g', 144, 20, 0, 6.7, 'proteinas', ['pescado'], ['1 rodaja', 150], ['animal', 'pescado']],
  ['pulpo', 'Pulpo cocido', 'g', 140, 25, 3.7, 1.8, 'proteinas', ['marisco'], ['1 ración', 120], ['animal', 'pescado']],
  ['almejas', 'Almejas (carne)', 'g', 86, 15, 3.6, 1, 'proteinas', ['marisco'], ['1 ración', 100], ['animal', 'pescado']],
  ['tofu_sedoso', 'Tofu sedoso', 'g', 55, 4.8, 2.9, 2.7, 'proteinas', ['soja'], ['1/2 bloque', 150]],
  ['habas', 'Habas baby (congeladas)', 'g', 88, 7.9, 17.6, 0.6, 'verduras', [], ['1 ración', 120]],
  ['tirabeques', 'Tirabeques', 'g', 42, 2.8, 7.6, 0.2, 'verduras', [], ['1 puñado', 80]],
  ['brotes_soja', 'Brotes de soja (judía mungo)', 'g', 30, 3, 6, 0.2, 'verduras', [], ['1 puñado', 60]],
  ['pak_choi', 'Pak choi', 'g', 13, 1.5, 2.2, 0.2, 'verduras', [], ['1 unidad', 100]],
  ['endivias', 'Endivias', 'g', 17, 1.3, 4, 0.2, 'verduras', [], ['1 unidad', 80]],
  ['cebolleta', 'Cebolleta', 'g', 32, 1.8, 7.3, 0.2, 'verduras', [], ['1 unidad', 50]],
  ['albahaca', 'Albahaca fresca', 'g', 23, 3.2, 2.7, 0.6, 'verduras', [], ['1 puñado', 5]],
  ['cilantro', 'Cilantro fresco', 'g', 23, 2.1, 3.7, 0.5, 'verduras', [], ['1 cucharada picada', 4]],
  ['lima', 'Lima', 'g', 30, 0.7, 10.5, 0.2, 'verduras', [], ['1 unidad', 60]],
  ['albaricoque', 'Albaricoque', 'g', 48, 1.4, 11, 0.4, 'verduras', [], ['2 unidades', 80]],
  ['orejones', 'Orejones de albaricoque', 'g', 241, 3.4, 63, 0.5, 'otros', ['sulfitos'], ['4 unidades', 30]],
  ['arroz_basmati', 'Arroz basmati (crudo)', 'g', 356, 8, 78, 0.6, 'cereales', [], ['1 ración', 70]],
  ['gnocchi', 'Ñoquis de patata', 'g', 133, 3.5, 28, 0.6, 'cereales', ['gluten'], ['1 ración', 200]],
  ['masa_pizza', 'Masa de pizza', 'g', 260, 7.5, 50, 3, 'cereales', ['gluten'], ['1 base', 200]],
  ['pan_hamburguesa', 'Pan de hamburguesa integral', 'g', 260, 10, 45, 4, 'cereales', ['gluten', 'sesamo'], ['1 unidad', 70]],
  ['harina_maiz', 'Harina de maíz precocida', 'g', 360, 7, 77, 1.5, 'cereales', [], ['1 taza', 120]],
  ['harina_garbanzo', 'Harina de garbanzo', 'g', 387, 22, 58, 6.7, 'cereales', [], ['1 cucharada', 10]],
  ['pan_rallado', 'Pan rallado', 'g', 395, 13, 72, 5.3, 'cereales', ['gluten'], ['1 cucharada', 10]],
  ['maicena', 'Maicena (almidón de maíz)', 'g', 381, 0.3, 91, 0.1, 'cereales', [], ['1 cucharada', 10]],
  ['mantequilla', 'Mantequilla', 'g', 717, 0.9, 0.1, 81, 'lacteos', ['lactosa'], ['1 cucharadita', 5], ['animal', 'lacteo']],
  ['nata_ligera', 'Nata para cocinar 18 %', 'ml', 190, 2.5, 4, 18, 'lacteos', ['lactosa'], ['1 brick pequeño', 200], ['animal', 'lacteo']],
  ['queso_untar', 'Queso crema ligero', 'g', 150, 7.5, 4.5, 11, 'lacteos', ['lactosa'], ['1 cucharada', 20], ['animal', 'lacteo']],
  ['miso', 'Pasta de miso', 'g', 199, 12, 26, 6, 'conservas', ['soja'], ['1 cucharada', 15]],
  ['sirope_arce', 'Sirope de arce', 'g', 260, 0, 67, 0.1, 'conservas', [], ['1 cucharada', 15]],
  ['cacahuetes', 'Cacahuetes tostados sin sal', 'g', 567, 25.8, 16, 49, 'otros', ['cacahuete'], ['1 puñado', 20]],
  ['pipas_calabaza', 'Pipas de calabaza peladas', 'g', 559, 30, 11, 49, 'otros', [], ['1 cucharada', 10]],
];


/**
 * Fibra alimentaria por 100 g (o 100 ml), valores medios aproximados del orden de las tablas
 * públicas (USDA FoodData Central / BEDCA). Se muestran siempre como estimación.
 */
const FIBER: Record<string, number> = {
  tomate: 1.2, lechuga: 1.3, espinacas: 2.2, rucula: 1.6, brocoli: 2.6, calabacin: 1, berenjena: 3, cebolla: 1.7, ajo: 2.1,
  pimiento: 2.1, zanahoria: 2.8, pepino: 0.5, champinones: 1, judias_verdes: 2.7, patata: 2.2, boniato: 3, aguacate: 6.7,
  platano: 2.6, manzana: 2.4, naranja: 2.4, kiwi: 3, fresas: 2, frutos_rojos: 2.4, limon: 2.8,
  pollo: 0, pavo: 0, pavo_fiambre: 0, ternera: 0, salmon: 0, merluza: 0, langostinos: 0, huevo: 0, tofu: 0.3,
  yogur: 0, yogur_griego: 0, queso_batido: 0, queso_fresco: 0, mozzarella: 0, parmesano: 0, leche: 0, bebida_soja: 0.6, bebida_avena: 0.8,
  avena: 10.1, pan_integral: 6, arroz_integral: 3.5, arroz: 1.3, pasta_integral: 8, quinoa: 7, cuscus: 5, tortilla_trigo: 5, tortitas_arroz: 4,
  garbanzos: 7.6, lentejas: 7.9, alubias: 6.4, atun: 0, tomate_triturado: 1.5, hummus: 6, aceite: 0, caldo: 0, salsa_soja: 0.8,
  miel: 0.2, crema_cacahuete: 6, nueces: 6.7, almendras: 12.5, chia: 34.4, cafe: 0, chocolate: 11,
  coliflor: 2, puerro: 1.8, apio: 1.6, calabaza: 0.5, esparragos: 2.1, guisantes: 5.5, alcachofa: 5.4, col_lombarda: 2.1, repollo: 2.5,
  kale: 4.1, acelgas: 1.6, remolacha: 2, cebolla_morada: 1.7, setas: 2.3, pimiento_verde: 1.7, tomate_cherry: 1.2, canonigos: 1.5,
  rabanos: 1.6, jengibre: 2, perejil: 3.3, pera: 3.1, melocoton: 1.5, mango: 1.6, pina: 1.4, uvas: 0.9, sandia: 0.4, melon: 0.9,
  granada: 4, higos: 2.9, mandarina: 1.8, ciruela: 1.4, cerezas: 2.1, frambuesas: 6.5, caqui: 3.6, datiles: 8, pasas: 3.7,
  pollo_contramuslo: 0, ternera_picada: 0, lomo_cerdo: 0, solomillo_cerdo: 0, jamon_serrano: 0, jamon_cocido: 0,
  bacalao: 0, lubina: 0, dorada: 0, sardinas: 0, caballa: 0, atun_fresco: 0, salmon_ahumado: 0, gambas: 0, mejillones: 0, calamar: 0, sepia: 0,
  claras: 0, tempeh: 5, soja_texturizada: 17, edamame: 5.2, seitan: 0.6,
  requeson: 0, skyr: 0, kefir: 0, queso_curado: 0, queso_cabra: 0, feta: 0, queso_rallado: 0, yogur_soja: 0.5, bebida_almendra: 0.4,
  pasta: 3, fideos_arroz: 1.6, bulgur: 12.5, pan: 2.7, pan_centeno: 6, pan_pita: 2.2, tortilla_maiz: 6, harina: 2.7, harina_integral: 10.7,
  muesli: 7.5, granola: 6, copos_maiz: 3, maiz: 2.4, aceitunas: 3.3, piquillos: 1.5, mostaza: 3.3, vinagre: 0, tahini: 9.3,
  leche_coco: 2.2, caldo_pollo: 0, caldo_pescado: 0, tomate_frito: 1.5, cacao: 33, coco_rallado: 16, pipas_girasol: 8.6, sesamo: 11.8,
  lino: 27, pistachos: 10, avellanas: 9.7, anacardos: 3.3, crema_almendras: 10, canela: 53, levadura_quimica: 0,
  rape: 0, boquerones: 0, trucha: 0, emperador: 0, pulpo: 0, almejas: 0, tofu_sedoso: 0.1, habas: 5.4, tirabeques: 2.6, brotes_soja: 1.8,
  pak_choi: 1, endivias: 3.1, cebolleta: 2.6, albahaca: 1.6, cilantro: 2.8, lima: 2.8, albaricoque: 2, orejones: 7.3, arroz_basmati: 1.3,
  gnocchi: 1.5, masa_pizza: 2, pan_hamburguesa: 5, harina_maiz: 7, harina_garbanzo: 10.8, pan_rallado: 4.5, maicena: 0.9,
  mantequilla: 0, nata_ligera: 0, queso_untar: 0, miso: 5.4, sirope_arce: 0, cacahuetes: 8.5, pipas_calabaza: 6,
};

/** Valores por 100 g/ml que usaba la app antes de enlazar con BEDCA/USDA (solo para conservar el historial). */
export const LEGACY_PER100: Record<string, Macros> = Object.fromEntries(rows.map(([id, , , kcal, protein, carbs, fat]) => [id, { kcal, protein, carbs, fat }]));

/** Versión actual de la base de alimentos (2 = valores de BEDCA/USDA; 3 = solo alimentos genéricos, sin marcas). */
export const FOOD_DB_VERSION = 3;

type OfficialRow = { id: string; n: string; u: 'g' | 'ml'; v: (number | null)[]; g: string; s: 'bedca' | 'usda'; r: number; a: Allergen[]; t: NonNullable<Food['tags']>; hidden?: boolean };
const OFFICIAL_ROWS = OFFICIAL as unknown as OfficialRow[];
const officialById = new Map(OFFICIAL_ROWS.map((r) => [r.id, r]));
const CURATED = CURATED_JSON as unknown as {
  base: Record<string, string | null>;
  rename: Record<string, string>;
  added: { id: string; name: string; ref: string; unit: 'g' | 'ml'; cat: ShopCategory; al: Allergen[]; portion: [string, number]; tags: NonNullable<Food['tags']> }[];
};

const SHOP_OF_GROUP: Record<string, ShopCategory> = {
  'Bebidas vegetales': 'lacteos', Quesos: 'lacteos', 'Lácteos': 'lacteos', Huevos: 'proteinas', 'Embutidos y fiambres': 'proteinas', Carnes: 'proteinas',
  Mariscos: 'proteinas', Pescados: 'proteinas', 'Aceites y grasas': 'conservas', Legumbres: 'conservas', 'Frutos secos y semillas': 'otros',
  'Pan y bollería': 'cereales', 'Cereales, pasta y arroz': 'cereales', Frutas: 'verduras', Bebidas: 'otros', 'Azúcares y dulces': 'otros',
  'Salsas y condimentos': 'conservas', 'Platos preparados': 'otros', 'Proteína vegetal': 'proteinas', 'Proteína y suplementos': 'otros', 'Verduras y hortalizas': 'verduras', Otros: 'otros',
};
const nn = (x: number | null | undefined) => (x === null || x === undefined ? undefined : x);

/** Valores oficiales de una fila (kcal, P, H, G, saturadas, azúcares, fibra, sal). */
function officialValues(r: OfficialRow, unit: 'g' | 'ml') {
  const [kcal, protein, carbs, fat, sat, sugars, fiber, salt] = r.v;
  return {
    per100: { kcal: kcal ?? 0, protein: protein ?? 0, carbs: carbs ?? 0, fat: fat ?? 0 },
    incomplete: protein === null || carbs === null || fat === null || undefined,
    fiber: nn(fiber),
    sat: nn(sat),
    sugars: nn(sugars),
    salt: nn(salt),
    source: r.s,
    ref: r.s === 'bedca' ? `BEDCA ${r.r}` : `USDA FDC ${r.r}`,
    approxMl: unit === 'ml' && r.u === 'g' ? true : undefined,
  } satisfies Partial<Food>;
}

/**
 * Alimentos de la app (ids legibles que usan las recetas). Cuando hay un equivalente fiable,
 * sus valores son los de BEDCA o USDA; si no, se conserva el valor medio estimado anterior.
 */
export const BASE_FOODS: Food[] = [
  ...rows.map(([id, name, unit, kcal, protein, carbs, fat, category, allergens, portion, tags]): Food => {
    const ref = CURATED.base[id];
    const off = ref ? officialById.get(ref) : undefined;
    const base: Food = {
      id,
      name: CURATED.rename[id] ?? name,
      unit,
      per100: { kcal, protein, carbs, fat },
      fiber: FIBER[id],
      category,
      allergens: allergens ?? [],
      source: 'referencia',
      portion: portion ? { label: portion[0], amount: portion[1] } : undefined,
      tags,
      group: off?.g,
    };
    return off ? { ...base, ...officialValues(off, unit) } : base;
  }),
  ...CURATED.added.map((c): Food => {
    const off = officialById.get(c.ref)!;
    return {
      id: c.id,
      name: c.name,
      unit: c.unit,
      category: c.cat,
      allergens: c.al,
      portion: { label: c.portion[0], amount: c.portion[1] },
      tags: c.tags.length ? c.tags : undefined,
      group: off.g,
      ...officialValues(off, c.unit),
    };
  }),
];

/**
 * Un solo alimento genérico por producto equivalente: las entradas repetidas entre BEDCA y USDA
 * (mismo alimento con otro nombre) se agrupan en el genérico que usa la app. Los ids antiguos
 * siguen resolviéndose al genérico (getFood), así ningún plato ni registro guardado se rompe.
 * Las variedades con valores distintos (crudo/cocido, con/sin piel, entera/desnatada…) se conservan.
 */
export const GENERIC_ALIAS: Record<string, string> = {
  u171269: 'leche_desnatada', // Leche desnatada (USDA) = Leche desnatada (BEDCA)
  u170887: 'yogur_desnatado', // Yogur natural desnatado
  u173709: 'atun', // Atún claro al natural, escurrido
  u173708: 'atun_aceite', // Atún claro en aceite, escurrido
  b2130: 'atun_aceite', // Atún en aceite de oliva (muestra de una marca)
  b2173: 'b2170', // Pan tostado integral = Pan integral, tostado
  u174218: 'b2471', // Pulpo crudo
};

/** Nombres genéricos (sin marcas ni «tipo X») para entradas del catálogo oficial. */
const GENERIC_RENAME: Record<string, string> = {
  b2521: 'Leche fermentada líquida (yogur bebible)',
  b2170: 'Pan integral tostado',
  b2471: 'Pulpo crudo',
  b2520: 'Yogur griego cremoso',
};

/**
 * Variedades que solo existían como productos de marca: se agrupan en un genérico con la
 * mediana de las etiquetas de los productos equivalentes (Open Food Facts, ODbL). Valores por 100 ml:
 * kcal, proteínas, hidratos, grasas, saturadas, azúcares, fibra, sal.
 */
const GROUPED_LABELS: { id: string; name: string; n: number; v: [number, number, number, number, number, number, number, number] }[] = [
  { id: 'leche_entera_sin_lactosa', name: 'Leche entera sin lactosa', n: 2, v: [63.5, 3.1, 4.8, 3.6, 2.5, 4.8, 0, 0.1] },
  { id: 'leche_semi_sin_lactosa', name: 'Leche semidesnatada sin lactosa', n: 5, v: [46, 3.2, 4.8, 1.6, 1.1, 4.8, 0, 0.1] },
  { id: 'leche_desnatada_sin_lactosa', name: 'Leche desnatada sin lactosa', n: 5, v: [34, 3.2, 4.8, 0.2, 0.1, 4.8, 0, 0.1] },
];
BASE_FOODS.push(
  ...GROUPED_LABELS.map((g): Food => ({
    id: g.id,
    name: g.name,
    unit: 'ml',
    per100: { kcal: g.v[0], protein: g.v[1], carbs: g.v[2], fat: g.v[3] },
    sat: g.v[4],
    sugars: g.v[5],
    fiber: g.v[6],
    salt: g.v[7],
    category: 'lacteos',
    // sin lactosa pero con proteína de leche: se mantiene el aviso de alérgeno
    allergens: ['lactosa'],
    source: 'openfoodfacts',
    ref: `mediana de ${g.n} etiquetas`,
    portion: { label: '1 vaso', amount: 250 },
    tags: ['animal', 'lacteo'],
    group: 'Lácteos',
  })),
);

const usedRefs = new Set([...Object.values(CURATED.base), ...CURATED.added.map((c) => c.ref)].filter(Boolean));

/**
 * Catálogo completo de alimentos genéricos de BEDCA y USDA (los que no están ya enlazados
 * a un alimento de la app, para no duplicarlos). Se buscan desde el creador de platos y el registro.
 */
export const OFFICIAL_FOODS: Food[] = OFFICIAL_ROWS.filter((r) => !r.hidden && !usedRefs.has(r.id) && !GENERIC_ALIAS[r.id]).map((r) => ({
  id: r.id,
  name: GENERIC_RENAME[r.id] ?? r.n,
  unit: r.u,
  category: SHOP_OF_GROUP[r.g] ?? 'otros',
  allergens: r.a,
  tags: r.t.length ? r.t : undefined,
  group: r.g,
  ...officialValues(r, r.u),
}));

/** Grupos de intercambio para calcular equivalencias por el macronutriente dominante */
export const EXCHANGE_GROUPS: { id: string; label: string; basis: 'carbs' | 'protein' | 'fat' | 'kcal'; foods: string[] }[] = [
  { id: 'hidratos', label: 'Hidratos', basis: 'carbs', foods: ['arroz', 'arroz_integral', 'arroz_basmati', 'gnocchi', 'pasta', 'pasta_integral', 'fideos_arroz', 'quinoa', 'cuscus', 'bulgur', 'patata', 'boniato', 'pan_integral', 'pan', 'pan_centeno', 'pan_pita', 'avena', 'tortitas_arroz', 'tortilla_trigo', 'tortilla_maiz', 'muesli', 'copos_maiz'] },
  { id: 'proteinas', label: 'Proteína', basis: 'protein', foods: ['pollo', 'pollo_contramuslo', 'pavo', 'ternera', 'ternera_picada', 'lomo_cerdo', 'solomillo_cerdo', 'salmon', 'merluza', 'bacalao', 'lubina', 'dorada', 'sardinas', 'caballa', 'atun', 'atun_fresco', 'langostinos', 'gambas', 'calamar', 'sepia', 'rape', 'trucha', 'emperador', 'boquerones', 'pulpo', 'huevo', 'tofu', 'tempeh', 'seitan', 'pavo_fiambre', 'jamon_cocido'] },
  { id: 'legumbres', label: 'Legumbres', basis: 'protein', foods: ['garbanzos', 'lentejas', 'alubias', 'habas', 'tofu', 'edamame', 'soja_texturizada'] },
  { id: 'lacteos', label: 'Lácteos', basis: 'protein', foods: ['yogur', 'yogur_griego', 'skyr', 'kefir', 'queso_batido', 'requeson', 'leche', 'bebida_soja', 'yogur_soja'] },
  { id: 'grasas', label: 'Grasas', basis: 'fat', foods: ['aceite', 'aguacate', 'nueces', 'almendras', 'avellanas', 'anacardos', 'pistachos', 'cacahuetes', 'crema_cacahuete', 'crema_almendras', 'tahini', 'aceitunas'] },
  { id: 'fruta', label: 'Fruta', basis: 'kcal', foods: ['platano', 'manzana', 'pera', 'naranja', 'mandarina', 'kiwi', 'fresas', 'frutos_rojos', 'frambuesas', 'melocoton', 'mango', 'pina', 'uvas', 'melon', 'sandia', 'cerezas', 'ciruela', 'caqui', 'higos', 'granada', 'albaricoque'] },
  { id: 'verdura', label: 'Verdura', basis: 'kcal', foods: ['brocoli', 'coliflor', 'calabacin', 'berenjena', 'judias_verdes', 'espinacas', 'acelgas', 'champinones', 'setas', 'pimiento', 'pimiento_verde', 'esparragos', 'calabaza', 'alcachofa', 'puerro', 'repollo', 'tirabeques', 'pak_choi'] },
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
