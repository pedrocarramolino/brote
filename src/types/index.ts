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
  useOpenFoodFacts: boolean;
  createdAt: string;
}

export type ShopCategory = 'verduras' | 'proteinas' | 'lacteos' | 'cereales' | 'conservas' | 'otros';

export type NutritionSource = 'referencia' | 'usuario' | 'openfoodfacts' | 'estimacion';

export interface Food {
  id: string;
  name: string;
  unit: 'g' | 'ml';
  per100: Macros;
  category: ShopCategory;
  allergens?: Allergen[];
  /** origen de los valores nutricionales */
  source: NutritionSource;
  /** ración típica para sugerir en el registro */
  portion?: { label: string; amount: number };
  /** id de alimento crudo/seco equivalente para la lista de la compra */
  tags?: ('animal' | 'carne' | 'pescado' | 'lacteo' | 'huevo')[];
  brand?: string;
}

export interface RecipeIngredient {
  foodId: string;
  amount: number; // g o ml por ración
  note?: string;
}

export interface Recipe {
  id: string;
  name: string;
  slots: MealSlot[];
  servings: number; // raciones que salen de la receta tal como está escrita
  minutes: number;
  ingredients: RecipeIngredient[]; // cantidades POR RACIÓN
  steps: string[];
  tags: ('rapida' | 'batch' | 'sin_coccion' | 'alta_proteina' | 'ligera')[];
  imageUrl?: string;
  /** tono (0-360) de la portada ilustrada cuando no hay fotografía */
  hue: number;
  icon: 'salad' | 'egg' | 'fish' | 'beef' | 'soup' | 'wheat' | 'apple' | 'milk' | 'sandwich' | 'carrot' | 'drumstick' | 'cookie';
  /** true para recetas creadas por el usuario sin datos verificados */
  custom?: boolean;
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
  demo?: boolean;
}

export interface FoodLogEntry {
  id: string;
  date: ISODate;
  slot: MealSlot;
  foodId: string;
  amount: number;
  createdAt: string;
  method: 'manual' | 'foto-demo' | 'texto-demo' | 'texto-ia' | 'foto-ia';
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
  chat: ChatMessage[];
}
