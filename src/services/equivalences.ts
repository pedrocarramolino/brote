import type { AppData, Food, MealSlot } from '../types';
import { getFood } from './catalog';
import { foodAllowedByDiet, foodDisliked } from './nutrition';

export interface Equivalence {
  food: Food;
  amount: number;
  basisLabel: string;
  /** motivo por el que no se puede usar con el perfil actual (alergia, dieta, no le gusta) */
  blocked?: string;
}

type Basis = 'carbs' | 'protein' | 'fat' | 'kcal' | 'amount';
const BASIS_LABEL: Record<Basis, string> = { carbs: 'mismos hidratos', protein: 'misma proteína', fat: 'misma grasa', kcal: 'mismas calorías', amount: 'misma cantidad' };

const MAIN_MEALS: MealSlot[] = ['comida', 'cena'];
const LIGHT_MEALS: MealSlot[] = ['desayuno', 'mediamanana', 'merienda'];

/**
 * Familias de intercambio: se proponen primero alimentos de la MISMA familia (pan por otro pan,
 * merluza por otro pescado blanco…). Las familias relacionadas solo se añaden si encajan en la
 * comida: nunca pasta o arroz en un desayuno, ni copos de avena en una cena.
 * `slots`: comidas en las que tiene sentido proponer alimentos de esa familia como alternativa.
 */
interface Family {
  id: string;
  basis: Basis;
  foods: string[];
  related?: string[];
  slots?: MealSlot[];
}

export const FAMILIES: Family[] = [
  { id: 'panes', basis: 'carbs', foods: ['pan', 'pan_integral', 'pan_centeno', 'pan_pita', 'tortitas_arroz', 'tortilla_trigo', 'tortilla_maiz', 'pan_burger', 'pan_hamburguesa'], related: ['cereales_desayuno', 'tuberculos', 'granos'] },
  { id: 'cereales_desayuno', basis: 'carbs', foods: ['avena', 'harina_avena', 'muesli', 'granola', 'copos_maiz'], related: ['panes'], slots: LIGHT_MEALS },
  { id: 'granos', basis: 'carbs', foods: ['arroz', 'arroz_integral', 'arroz_basmati', 'arroz_integral_cocido', 'pasta', 'pasta_integral', 'pasta_huevo', 'pasta_cocida', 'fideos_arroz', 'quinoa', 'cuscus', 'bulgur', 'mijo', 'gnocchi'], related: ['tuberculos', 'legumbres', 'panes'], slots: MAIN_MEALS },
  { id: 'tuberculos', basis: 'carbs', foods: ['patata', 'boniato'], related: ['granos', 'legumbres'], slots: MAIN_MEALS },
  { id: 'legumbres', basis: 'protein', foods: ['garbanzos', 'lentejas', 'alubias', 'alubias_rojas', 'alubias_negras', 'habas', 'edamame', 'garbanzos_secos', 'lentejas_secas', 'alubias_secas'], related: ['proteina_vegetal'], slots: MAIN_MEALS },
  { id: 'carne_blanca', basis: 'protein', foods: ['pollo', 'pollo_contramuslo', 'muslo_pollo', 'pavo', 'conejo'], related: ['carne_roja', 'pescado_blanco', 'huevos', 'proteina_vegetal'], slots: MAIN_MEALS },
  { id: 'carne_roja', basis: 'protein', foods: ['ternera', 'solomillo_ternera', 'ternera_picada', 'ternera_picada_95', 'carne_picada_mixta', 'lomo_cerdo', 'solomillo_cerdo', 'cordero_pierna', 'chuletas_cordero', 'wagyu'], related: ['carne_blanca', 'pescado_azul'], slots: MAIN_MEALS },
  { id: 'hamburguesas', basis: 'protein', foods: ['hamburguesa_ternera', 'hamburguesa_ternera_magra', 'hamburguesa_ternera_extramagra', 'hamburguesa_vacuno_85', 'hamburguesa_vacuno_75', 'hamburguesa_vacuno_70', 'hamburguesa_mixta', 'hamburguesa_wagyu', 'hamburguesa_pollo', 'hamburguesa_pollo_empanada', 'hamburguesa_pavo', 'hamburguesa_pavo_magra', 'hamburguesa_cerdo', 'hamburguesa_cordero', 'hamburguesa_venado', 'hamburguesa_bisonte', 'hamburguesa_vegetal'], related: ['carne_blanca'], slots: MAIN_MEALS },
  { id: 'pescado_blanco', basis: 'protein', foods: ['merluza', 'bacalao', 'bacalao_desalado', 'lubina', 'dorada', 'rape', 'lenguado', 'besugo', 'rodaballo', 'gallo'], related: ['pescado_azul', 'marisco'], slots: MAIN_MEALS },
  { id: 'pescado_azul', basis: 'protein', foods: ['salmon', 'sardinas', 'caballa', 'atun_fresco', 'trucha', 'emperador', 'boquerones', 'salmonete'], related: ['pescado_blanco', 'conservas_pescado'], slots: MAIN_MEALS },
  { id: 'conservas_pescado', basis: 'protein', foods: ['atun', 'atun_aceite', 'bonito_lata', 'sardinas_lata', 'caballa_lata', 'salmon_ahumado', 'anchoas', 'surimi'], related: ['huevos', 'fiambres'] },
  { id: 'marisco', basis: 'protein', foods: ['langostinos', 'gambas', 'calamar', 'sepia', 'pulpo', 'mejillones', 'almejas', 'berberechos', 'zamburinas', 'vieiras'], related: ['pescado_blanco'], slots: MAIN_MEALS },
  { id: 'huevos', basis: 'protein', foods: ['huevo', 'claras', 'huevo_codorniz'], related: ['fiambres', 'quesos_frescos', 'proteina_vegetal'] },
  { id: 'proteina_vegetal', basis: 'protein', foods: ['tofu', 'tempeh', 'seitan', 'soja_texturizada'], related: ['legumbres', 'huevos'] },
  { id: 'fiambres', basis: 'protein', foods: ['pavo_fiambre', 'pollo_fiambre', 'jamon_cocido', 'jamon_serrano', 'jamon_iberico', 'lacon'], related: ['quesos_frescos', 'huevos', 'conservas_pescado'], slots: LIGHT_MEALS.concat(MAIN_MEALS) },
  { id: 'embutidos', basis: 'kcal', foods: ['chorizo', 'salchichon', 'fuet', 'panceta', 'bacon'], related: ['fiambres'] },
  { id: 'yogures', basis: 'protein', foods: ['yogur', 'yogur_griego', 'yogur_desnatado', 'yogur_griego_entero', 'skyr', 'kefir', 'queso_batido', 'yogur_soja'], related: ['quesos_frescos'] },
  { id: 'leches', basis: 'amount', foods: ['leche', 'leche_entera', 'leche_desnatada', 'leche_proteica', 'leche_entera_sin_lactosa', 'leche_semi_sin_lactosa', 'leche_desnatada_sin_lactosa', 'bebida_soja', 'bebida_avena', 'bebida_almendra', 'bebida_arroz', 'bebida_coco'] },
  { id: 'quesos_frescos', basis: 'protein', foods: ['queso_fresco', 'requeson', 'cottage', 'ricotta', 'queso_untar', 'queso_crema', 'mozzarella'], related: ['yogures'] },
  { id: 'quesos_curados', basis: 'kcal', foods: ['queso_curado', 'manchego', 'queso_semicurado', 'queso_tierno', 'cheddar', 'gouda', 'edam', 'emmental', 'gruyere', 'parmesano', 'queso_rallado', 'provolone', 'tetilla', 'brie', 'queso_cabra', 'feta', 'roquefort', 'cabrales'], related: ['quesos_frescos'] },
  { id: 'aceites', basis: 'fat', foods: ['aceite', 'mantequilla', 'aguacate'], related: ['frutos_secos'] },
  { id: 'frutos_secos', basis: 'kcal', foods: ['nueces', 'almendras', 'avellanas', 'anacardos', 'pistachos', 'cacahuetes', 'macadamia', 'pinones', 'pipas_girasol', 'pipas_calabaza'], related: ['cremas_frutos_secos'] },
  { id: 'cremas_frutos_secos', basis: 'kcal', foods: ['crema_cacahuete', 'crema_almendras', 'tahini'], related: ['frutos_secos'] },
  { id: 'fruta', basis: 'kcal', foods: ['platano', 'manzana', 'pera', 'naranja', 'mandarina', 'kiwi', 'fresas', 'frutos_rojos', 'frambuesas', 'melocoton', 'nectarina', 'paraguaya', 'albaricoque', 'mango', 'papaya', 'pina', 'uvas', 'melon', 'sandia', 'cerezas', 'ciruela', 'caqui', 'higos', 'granada', 'chirimoya', 'pomelo'] },
  { id: 'verdura', basis: 'amount', foods: ['brocoli', 'coliflor', 'col_bruselas', 'calabacin', 'berenjena', 'judias_verdes', 'espinacas', 'acelgas', 'kale', 'borraja', 'champinones', 'setas', 'portobello', 'pimiento', 'pimiento_verde', 'esparragos', 'calabaza', 'alcachofa', 'puerro', 'repollo', 'col_lombarda', 'tirabeques', 'pak_choi', 'guisantes', 'zanahoria', 'nabo'] },
  { id: 'hojas', basis: 'amount', foods: ['lechuga', 'rucula', 'canonigos', 'escarola', 'berros', 'endivias', 'espinacas'] },
  { id: 'hortalizas_ensalada', basis: 'amount', foods: ['tomate', 'tomate_cherry', 'pepino', 'remolacha', 'rabanos', 'piquillos', 'palmito'], related: ['hojas'] },
  { id: 'cebollas', basis: 'amount', foods: ['cebolla', 'cebolla_morada', 'cebolleta', 'puerro'] },
  { id: 'tomate_cocinado', basis: 'amount', foods: ['tomate_triturado', 'tomate_frito'] },
  { id: 'caldos', basis: 'amount', foods: ['caldo', 'caldo_pollo', 'caldo_pescado'] },
  { id: 'untables_salados', basis: 'kcal', foods: ['hummus', 'queso_untar', 'tahini'] },
  { id: 'salsas', basis: 'kcal', foods: ['mayonesa', 'mayonesa_light', 'ketchup', 'salsa_barbacoa', 'mostaza', 'pesto', 'tomate_frito'] },
  { id: 'dulces', basis: 'kcal', foods: ['miel', 'sirope_arce', 'mermelada_fresa', 'azucar', 'azucar_moreno', 'crema_cacao', 'chocolate', 'chocolate_leche', 'chocolate_blanco'] },
];

const byId = new Map(FAMILIES.map((f) => [f.id, f]));
/** Familia de un alimento (la primera en la que aparece). */
export function familyOf(foodId: string): Family | undefined {
  return FAMILIES.find((f) => f.foods.includes(foodId));
}

/**
 * Equivalencias de intercambio calculadas con la base de alimentos: cantidad del alimento
 * alternativo que aporta lo mismo del criterio de su familia (hidratos, proteína, grasa,
 * calorías o la misma cantidad). Primero la misma familia, en su orden habitual;
 * después familias relacionadas que tengan sentido en esa comida (`slot`).
 * `exclude` evita proponer alimentos que ya están en la misma comida (no se duplican).
 */
export function equivalencesFor(
  data: AppData,
  foodId: string,
  amount: number,
  opts: { exclude?: Set<string>; slot?: MealSlot } = {},
): { group: string; items: Equivalence[] } | null {
  const fam = familyOf(foodId);
  const base = getFood(data, foodId);
  if (!fam || !base) return null;
  const basis = fam.basis;
  const target = basis === 'amount' ? amount : base.per100[basis] * (amount / 100);
  if (target <= 0) return null;
  const p = data.profile;
  const make = (id: string, kind: 'same' | 'related'): (Equivalence & { kind: string; diff: number }) | null => {
    if (id === foodId || opts.exclude?.has(id)) return null;
    const f = getFood(data, id);
    if (!f) return null;
    // la misma cantidad solo entre alimentos con la misma unidad (no se mezclan g y ml)
    if (basis === 'amount' && f.unit !== base.unit) return null;
    const per = basis === 'amount' ? 100 : f.per100[basis];
    if (!(per > 0)) return null;
    const amt = (target / per) * 100;
    if (amt > 600 || amt < 3) return null;
    let blocked: string | undefined;
    const allergen = f.allergens?.find((a) => p.allergies.includes(a));
    if (allergen) blocked = 'Alérgeno';
    else if (!foodAllowedByDiet(f, p.dietType)) blocked = 'No encaja con tu dieta';
    else if (foodDisliked(f, p.dislikes)) blocked = 'No te gusta';
    const rounded = Math.max(5, Math.round(amt / 5) * 5);
    const diff = Math.abs((f.per100.kcal * rounded) / 100 - (base.per100.kcal * amount) / 100);
    return { food: f, amount: rounded, basisLabel: BASIS_LABEL[basis], blocked, kind, diff };
  };
  // misma familia en el orden de la lista (de lo más habitual a lo menos: pan → pan integral → centeno…)
  const same = fam.foods.map((id) => make(id, 'same')).filter((x): x is NonNullable<typeof x> => !!x);
  const related: NonNullable<ReturnType<typeof make>>[] = [];
  const seen = new Set(fam.foods);
  for (const rid of fam.related ?? []) {
    const rf = byId.get(rid);
    if (!rf) continue;
    // la familia relacionada debe encajar en esta comida
    if (opts.slot && rf.slots && !rf.slots.includes(opts.slot)) continue;
    for (const id of rf.foods) {
      if (seen.has(id)) continue;
      seen.add(id);
      const e = make(id, 'related');
      if (e) related.push(e);
    }
  }
  related.sort((a, b) => a.diff - b.diff);
  const all = [...same, ...related];
  // primero las utilizables, manteniendo el orden (misma familia antes)
  all.sort((a, b) => Number(!!a.blocked) - Number(!!b.blocked));
  return { group: fam.id, items: all.map(({ kind: _k, diff: _d, ...e }) => e) };
}
