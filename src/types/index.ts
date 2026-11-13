// ---------------------------------------------------------------------------
// Modelo de datos de Brote. Diseñado para mapear 1:1 con tablas de una base de
// datos real (ver supabase/migrations/0001_schema.sql).
// ---------------------------------------------------------------------------

export type ISODate = string; // 'YYYY-MM-DD'

export type MealSlot = 'desayuno' | 'mediamanana' | 'comida' | 'merienda' | 'cena';

export type Goal = 'salud' | 'perder' | 'ganar' | 'mantener' | 'rendimiento' | 'organizar';
export type DietType = 'omnivora' | 'flexitariana' | 'pescetariana' | 'vegetariana' | 'vegana';
export type ActivityLevel = 'sedentario' | 'ligero' | 'moderado' | 'activo';
export type TrainingPref = 'casa' | 'gimnasio' | 'caminar' | 'mixto' | 'ninguno';
export type Allergen =
  | 'gluten' | 'lactosa' | 'huevo' | 'frutos_secos' | 'cacahuete' | 'soja'
  | 'pescado' | 'marisco' | 'sesamo' | 'apio' | 'mostaza' | 'sulfitos';

export interface Macros {
  kcal: number;
  protein: number; // g
  carbs: number; // g
  fat: number; // g
}

export interface NutritionTargets {
  kcal?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  /** De dónde viene el objetivo: introducido por el usuario, referencia general o profesional */
  origin?: 'usuario' | 'referencia' | 'profesional' | 'demo';
}

export interface UserProfile {
  id: string;
  name: string;
  goal?: Goal;
  mealSlots: MealSlot[];
  schedule: Partial<Record<MealSlot, string>>; // 'HH:MM'
  dietType?: DietType;
  likes: string[];
  dislikes: string[]; // ids o nombres libres de alimentos
  allergies: Allergen[];
  cookingTime?: 15 | 30 | 45 | 60; // minutos máximos por receta
  budget?: 'ajustado' | 'medio' | 'flexible';
  activityLevel?: ActivityLevel;
  training?: TrainingPref;
  region: string; // 'ES'
  stepsTarget: number;
  waterTarget: number; // vasos de 250 ml
  targets: NutritionTargets;
  /** Consentimiento explícito para enviar contexto a servicios externos */
  shareContextWithAI: boolean;
  createdAt: string;
}

export type ShopCategory = 'verduras' | 'proteinas' | 'lacteos' | 'cereales' | 'conservas' | 'otros';

/**
 * Origen de los valores nutricionales:
 * - bedca: Base de Datos Española de Composición de Alimentos (AESAN/BEDCA v1.0, 2010)
 * - usda: USDA FoodData Central, SR Legacy (dominio público)
 * - openfoodfacts: etiqueta del fabricante recogida en Open Food Facts (ODbL)
 * - referencia: valor medio estimado (sin equivalente fiable en BEDCA ni USDA)
 * - usuario / estimacion: introducido por el usuario o estimado por la app
 */
export type NutritionSource = 'bedca' | 'usda' | 'referencia' | 'usuario' | 'openfoodfacts' | 'estimacion';

export interface Food {
  id: string;
  name: string;
  unit: 'g' | 'ml';
  per100: Macros;
  /** fibra por 100 g/ml; undefined = sin dato */
  fiber?: number;
  /** grasas saturadas, azúcares y sal por 100 g/ml; undefined = sin dato */
  sat?: number;
  sugars?: number;
  salt?: number;
  /** subcategoría para buscar y agrupar (p. ej. «Quesos», «Bebidas vegetales») */
  group?: string;
  /** referencia en la fuente: «BEDCA 2541», «USDA FDC 171077», código de barras… */
  ref?: string;
  /** falta algún macronutriente en la fuente (se cuenta como 0 y se avisa) */
  incomplete?: boolean;
  /** la fuente da los valores por 100 g y la app los aplica a 100 ml (densidad ≈ 1) */
  approxMl?: boolean;
  category: ShopCategory;
  allergens?: Allergen[];
  /** origen de los valores nutricionales */
  source: NutritionSource;
  /** ración típica para sugerir en el registro */
  portion?: { label: string; amount: number };
  /** id de alimento crudo/seco equivalente para la lista de la compra */
  tags?: ('animal' | 'carne' | 'pescado' | 'lacteo' | 'huevo')[];
  /** @deprecated Brote ya no guarda marcas comerciales; solo existe en datos antiguos hasta migrarlos */
  brand?: string;
}

export interface RecipeIngredient {
  foodId: string;
  amount: number; // g o ml por ración
  note?: string;
}

/** Categoría de la biblioteca (más fina que la franja del día en que se puede planificar). */
export type RecipeCategory = 'desayuno' | 'mediamanana' | 'comida' | 'cena' | 'merienda' | 'snack' | 'postre';
export type Difficulty = 'facil' | 'media' | 'elaborada';
export type MainIngredient =
  | 'pollo' | 'pavo' | 'ternera' | 'cerdo' | 'pescado_blanco' | 'pescado_azul' | 'atun' | 'marisco'
  | 'huevo' | 'lacteo' | 'legumbre' | 'proteina_vegetal' | 'cereal' | 'verdura' | 'fruta';
export type Cuisine = 'espanola' | 'mediterranea' | 'italiana' | 'mexicana' | 'asiatica' | 'americana' | 'internacional';
export type RecipeTag = 'rapida' | 'batch' | 'sin_coccion' | 'alta_proteina' | 'ligera' | 'cuchara' | 'horno' | 'dulce' | 'tradicional' | 'internacional';

export interface Recipe {
  id: string;
  /** nombre comercial, corto y con gancho («Pollo Power Bowl») */
  title?: string;
  /** nombre descriptivo: qué lleva el plato («Bol de pollo a la plancha con arroz…») */
  name: string;
  /** cocina de referencia */
  cuisine?: Cuisine;
  /** franjas del día en las que el planificador puede usarla */
  slots: MealSlot[];
  /** categoría principal en la biblioteca */
  category: RecipeCategory;
  difficulty: Difficulty;
  /** ingrediente principal (para alternar proteínas en los menús) */
  main: MainIngredient;
  servings: number; // raciones que salen de la receta tal como está escrita
  minutes: number;
  ingredients: RecipeIngredient[]; // cantidades POR RACIÓN
  steps: string[];
  tags: RecipeTag[];
  imageUrl?: string;
  /** tono (0-360) de la portada ilustrada cuando no hay fotografía */
  hue: number;
  icon: 'salad' | 'egg' | 'fish' | 'beef' | 'soup' | 'wheat' | 'apple' | 'milk' | 'sandwich' | 'carrot' | 'drumstick' | 'cookie'
    | 'pizza' | 'croissant' | 'cherry' | 'citrus' | 'banana' | 'bean' | 'nut' | 'cake' | 'icecream' | 'ham' | 'pot' | 'leaf' | 'grape' | 'eggfried' | 'coffee' | 'dessert';
  /** true para los platos creados por el usuario («Mis platos»); viven en AppData.customRecipes */
  custom?: boolean;
  /** descripción libre del plato (platos del usuario) */
  description?: string;
  /** datos de edición de un plato del usuario: lo que introdujo, para el plato completo */
  dish?: UserDishData;
}

/** Unidades que se pueden usar al crear un plato. */
export type QtyUnit = 'g' | 'kg' | 'ml' | 'l' | 'unidad' | 'cucharada' | 'cucharadita';

/** Ingrediente tal y como lo introduce el usuario: cantidad para el plato COMPLETO. */
export interface DishIngredient {
  foodId: string;
  quantity: number;
  unit: QtyUnit;
}

export interface UserDishData {
  items: DishIngredient[];
  /** id del perfil propietario */
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  /** categoría elegida por el usuario */
  category: 'desayuno' | 'comida' | 'cena' | 'merienda' | 'snack' | 'postre';
}

/** Copia de los valores de un consumo en el momento en que se registró (no cambia si se edita el plato). */
export interface NutritionSnapshot {
  name: string;
  /** valores de UNA ración */
  perServing: Macros;
  fiber?: number;
  /** false si algún ingrediente no tenía datos completos */
  complete: boolean;
  at: string;
}

export type MealStatus = 'pendiente' | 'hecha' | 'omitida';

export interface PlannedMeal {
  id: string;
  date: ISODate;
  slot: MealSlot;
  /** receta del catálogo o null si es un plato libre sin datos */
  recipeId: string | null;
  customName?: string;
  portion: number; // multiplicador de ración (1 = una ración)
  status: MealStatus;
  note?: string;
  /**
   * Sustituciones de ingredientes SOLO para esta comida: clave = alimento original de la receta,
   * valor = alimento equivalente y cantidad por ración. La receta del catálogo no se modifica.
   */
  swaps?: Record<string, { foodId: string; amount: number }>;
  /**
   * Comida libre: el usuario se «salta» el plato del plan y come lo que quiera.
   * Se conserva recipeId para poder volver al plato. No suma calorías previstas, no entra
   * en la lista de la compra ni cuenta para la rotación de recetas.
   */
  free?: boolean;
  /** valores congelados (por ración) cuando el plato del usuario se edita o elimina después de usarlo */
  snapshot?: NutritionSnapshot;
  /**
   * El usuario ha aceptado o elegido este plato: al volver a generar la propuesta
   * de la semana no se cambia automáticamente.
   */
  accepted?: boolean;
  demo?: boolean;
}

/** Sustitución de un plato del plan (equivale a la tabla meal_replacements). */
export interface MealReplacement {
  id: string;
  date: ISODate;
  slot: MealSlot;
  fromRecipeId: string | null;
  toRecipeId: string | null;
  /** 'manual' = elegido de la lista, 'sorpresa' = Sorpréndeme, 'dia' = cambio de día, 'regenerar' = nueva propuesta */
  source: 'manual' | 'sorpresa' | 'dia' | 'regenerar';
  at: string;
}

export interface FoodLogEntry {
  id: string;
  date: ISODate;
  slot: MealSlot;
  /** alimento registrado ('' si es un plato) */
  foodId: string;
  /** g/ml del alimento o, si es un plato, número de raciones */
  amount: number;
  /** cantidad tal y como la escribió el usuario (p. ej. 2 unidades); amount sigue en g/ml */
  quantity?: number;
  unit?: QtyUnit;
  createdAt: string;
  method: 'manual' | 'foto-demo' | 'texto-demo' | 'texto-ia' | 'foto-ia' | 'plato';
  /** plato de «Mis platos» registrado */
  recipeId?: string;
  /** valores del plato en el momento del registro: el historial no cambia si luego se edita el plato */
  snapshot?: NutritionSnapshot;
  /** valores por 100 g/ml del alimento en el momento del registro (no cambian si se corrige la base) */
  per100?: Macros;
  demo?: boolean;
}

export interface Habit {
  id: string;
  name: string;
  kind: 'agua' | 'pasos' | 'actividad' | 'comidas' | 'custom';
  icon: 'droplet' | 'footprints' | 'dumbbell' | 'utensils' | 'moon' | 'leaf' | 'book' | 'sun' | 'check';
  active: boolean;
}

export interface HabitLog {
  date: ISODate;
  habitId: string;
  value: number; // 1 = hecho para checks; nº de vasos para agua
}

export interface WeightEntry { id: string; date: ISODate; kg: number; demo?: boolean }

export interface MeasurementEntry {
  id: string;
  date: ISODate;
  waist?: number;
  hip?: number;
  chest?: number;
  arm?: number;
  thigh?: number;
  demo?: boolean;
}

export type ActivityType = 'casa' | 'gimnasio' | 'general' | 'descanso';

export interface ActivityPlanDay {
  weekday: number; // 0 = lunes
  type: ActivityType;
  routineId?: string;
  title: string;
  minutes: number;
}

export interface Routine {
  id: string;
  name: string;
  type: Exclude<ActivityType, 'descanso'>;
  minutes: number;
  exercises: { name: string; detail: string }[];
  demo: true;
}

export interface ActivitySession {
  id: string;
  date: ISODate;
  type: Exclude<ActivityType, 'descanso'>;
  title: string;
  minutes: number;
  notes?: string;
  demo?: boolean;
}

export interface StepsEntry { date: ISODate; steps: number; demo?: boolean }

export interface ShoppingManualItem {
  id: string;
  name: string;
  qty: string;
  category: ShopCategory;
  checked: boolean;
}

export interface ShoppingOverrides {
  checked: Record<string, boolean>;
  qty: Record<string, string>; // cantidad editada manualmente
  removed: Record<string, boolean>;
  manual: ShoppingManualItem[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  mode?: 'demo' | 'ia';
  error?: boolean;
}

export interface AppData {
  version: number;
  isDemo: boolean;
  onboarded: boolean;
  profile: UserProfile;
  customFoods: Food[];
  customRecipes: Recipe[];
  plan: Record<string, PlannedMeal[]>; // clave: lunes de la semana (ISODate)
  log: FoodLogEntry[];
  habits: Habit[];
  habitLogs: HabitLog[];
  weights: WeightEntry[];
  measurements: MeasurementEntry[];
  activityPlan: ActivityPlanDay[];
  sessions: ActivitySession[];
  steps: StepsEntry[];
  shopping: Record<string, ShoppingOverrides>; // clave: lunes de la semana
  favorites: { recipes: string[]; foods: string[] };
  /** Versión de la base de alimentos con la que se guardaron los registros (ver migración en AppStore). */
  foodDbVersion?: number;
  /** Historial de sustituciones de platos (las más recientes al final, máx. 300). */
  replacements?: MealReplacement[];
  chat: ChatMessage[];
  /** Revisión semanal: lunes de la última semana revisada y aplazamiento temporal. */
  weeklyReview?: WeeklyReviewState;
}

export interface WeeklyReviewState {
  lastCompleted?: ISODate; // lunes de la última semana confirmada
  postponedUntil?: ISODate; // no volver a mostrar la tarjeta hasta este día (sigue pendiente)
}
