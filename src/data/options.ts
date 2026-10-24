import type { ActivityLevel, Allergen, DietType, Goal, TrainingPref, UserProfile } from '../types';

export const GOALS: { value: Goal; label: string; hint: string }[] = [
  { value: 'salud', label: 'Comer más sano', hint: 'Mejorar hábitos sin contar cada caloría' },
  { value: 'organizar', label: 'Organizarme mejor', hint: 'Menú, compra y horarios bajo control' },
  { value: 'mantener', label: 'Mantener mi peso', hint: 'Estabilidad y constancia' },
  { value: 'perder', label: 'Perder peso', hint: 'De forma progresiva y sostenible' },
  { value: 'ganar', label: 'Ganar masa muscular', hint: 'Más proteína y entrenamiento' },
  { value: 'rendimiento', label: 'Rendir en mi deporte', hint: 'Energía para entrenar' },
];

export const DIETS: { value: DietType; label: string }[] = [
  { value: 'omnivora', label: 'Omnívora' },
  { value: 'flexitariana', label: 'Flexitariana' },
  { value: 'pescetariana', label: 'Pescetariana' },
  { value: 'vegetariana', label: 'Vegetariana' },
  { value: 'vegana', label: 'Vegana' },
];

export const ALLERGENS: Allergen[] = ['gluten', 'lactosa', 'huevo', 'frutos_secos', 'cacahuete', 'soja', 'pescado', 'marisco', 'sesamo', 'apio', 'mostaza', 'sulfitos'];

export const LEVELS: { value: ActivityLevel; label: string; hint: string }[] = [
  { value: 'sedentario', label: 'Sedentario', hint: 'Trabajo sentado, poco movimiento' },
  { value: 'ligero', label: 'Ligero', hint: 'Camino a diario o algo de deporte' },
  { value: 'moderado', label: 'Moderado', hint: 'Deporte 3–4 días por semana' },
  { value: 'activo', label: 'Muy activo', hint: 'Entreno casi a diario o trabajo físico' },
];

export const TRAININGS: { value: TrainingPref; label: string }[] = [
  { value: 'caminar', label: 'Caminar' },
  { value: 'casa', label: 'En casa' },
  { value: 'gimnasio', label: 'Gimnasio' },
  { value: 'mixto', label: 'Combinar' },
  { value: 'ninguno', label: 'Prefiero no planificar' },
];

export const COOK_TIMES: { value: NonNullable<UserProfile['cookingTime']>; label: string }[] = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 h o más' },
];

export const BUDGETS: { value: NonNullable<UserProfile['budget']>; label: string }[] = [
  { value: 'ajustado', label: 'Ajustado' },
  { value: 'medio', label: 'Medio' },
  { value: 'flexible', label: 'Flexible' },
];

export const REGIONS = [
  { value: 'ES', label: 'España (península y Baleares)' },
  { value: 'ES-CN', label: 'Canarias' },
  { value: 'OTRO', label: 'Otro país (unidades métricas)' },
];

export const DISLIKE_SUGGESTIONS = ['berenjena', 'champiñones', 'pescado', 'brócoli', 'aguacate', 'cebolla', 'tofu', 'garbanzos', 'pimiento', 'salmón'];
