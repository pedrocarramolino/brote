import type { ActivitySession, AppData, FoodLogEntry, HabitLog, MeasurementEntry, StepsEntry, UserProfile, WeightEntry } from '../types';
import { addDays, startOfWeek, todayISO, weekdayIndex } from '../lib/dates';
import { uid } from '../lib/format';
import { ALL_SLOTS, SLOT_META } from '../services/catalog';
import { generateWeek } from '../services/planner';
import { DEFAULT_HABITS, defaultActivityPlan } from './routines';
import { FOOD_DB_VERSION } from './foods';

export const DATA_VERSION = 1;

/** Generador pseudoaleatorio con semilla: los datos demo son siempre iguales para una fecha dada. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function baseProfile(partial: Partial<UserProfile> = {}): UserProfile {
  return {
    id: uid('user'),
    name: '',
    mealSlots: [...ALL_SLOTS],
    schedule: Object.fromEntries(ALL_SLOTS.map((s) => [s, SLOT_META[s].time])),
    likes: [],
    dislikes: [],
    allergies: [],
    region: 'ES',
    stepsTarget: 8000,
    waterTarget: 8,
    targets: {},
    shareContextWithAI: false,
    createdAt: new Date().toISOString(),
    ...partial,
  };
}

/** Datos vacíos para un usuario real tras el cuestionario de bienvenida. */
export function createUserData(profile: UserProfile): AppData {
  const data: AppData = {
    version: DATA_VERSION,
    foodDbVersion: FOOD_DB_VERSION,
    isDemo: false,
    onboarded: true,
    profile,
    customFoods: [],
    customRecipes: [],
    plan: {},
    log: [],
    habits: DEFAULT_HABITS.map((h) => ({ ...h })),
    habitLogs: [],
    weights: [],
    measurements: [],
    activityPlan: defaultActivityPlan(profile.training),
    sessions: [],
    steps: [],
    shopping: {},
    favorites: { recipes: [], foods: [] },
    chat: [],
  };
  // El plan empieza hoy: los días anteriores al alta no tienen comidas (ni entran en la compra).
  const today = todayISO();
  const monday = startOfWeek(today);
  data.plan[monday] = generateWeek(data, monday).filter((m) => m.date >= today);
  data.weeklyReview = { lastCompleted: monday };
  return data;
}

/** Perfil y semanas FICTICIAS para probar la aplicación. Todo va marcado con `demo: true`. */
export function createDemoData(today = todayISO()): AppData {
  const rand = rng(Number(today.replace(/-/g, '')));
  const profile = baseProfile({
    name: 'Lucía',
    goal: 'salud',
    dietType: 'omnivora',
    dislikes: ['berenjena'],
    allergies: ['marisco'],
    cookingTime: 30,
    budget: 'medio',
    activityLevel: 'ligero',
    training: 'mixto',
    targets: { kcal: 2000, protein: 95, carbs: 230, fat: 70, origin: 'demo' },
  });

  const data: AppData = {
    version: DATA_VERSION,
    foodDbVersion: FOOD_DB_VERSION,
    isDemo: true,
    onboarded: true,
    profile,
    customFoods: [],
    customRecipes: [],
    plan: {},
    log: [],
    habits: DEFAULT_HABITS.map((h) => ({ ...h })),
    habitLogs: [],
    weights: [],
    measurements: [],
    activityPlan: defaultActivityPlan('mixto'),
    sessions: [],
    steps: [],
    shopping: {},
    favorites: { recipes: ['salmon-quinoa', 'yogur-frutos-rojos'], foods: ['platano', 'yogur_griego'] },
    chat: [],
  };

  // Menús: semana actual y cinco anteriores
  const monday = startOfWeek(today);
  for (let w = -5; w <= 0; w++) {
    const m = addDays(monday, w * 7);
    data.plan[m] = generateWeek(data, m).map((meal) => {
      let status = meal.status;
      if (meal.date < today) {
        const x = rand();
        status = x < 0.84 ? 'hecha' : x < 0.93 ? 'omitida' : 'hecha';
      } else if (meal.date === today && (meal.slot === 'desayuno' || meal.slot === 'mediamanana')) {
        status = 'hecha';
      }
      return { ...meal, status, demo: true };
    });
  }

  // Registros de alimentos manuales
  const log: FoodLogEntry[] = [];
  const mk = (date: string, slot: FoodLogEntry['slot'], foodId: string, amount: number) =>
    log.push({ id: uid('log'), date, slot, foodId, amount, createdAt: new Date().toISOString(), method: 'manual', demo: true });
  mk(today, 'desayuno', 'cafe', 60);
  mk(today, 'desayuno', 'leche', 100);
  for (let i = 1; i <= 14; i++) {
    const d = addDays(today, -i);
    mk(d, 'desayuno', 'cafe', 60);
    if (rand() < 0.4) mk(d, 'merienda', 'chocolate', 20);
  }
  data.log = log;

  // Hábitos, pasos y actividad (últimos 45 días)
  const habitLogs: HabitLog[] = [];
  const steps: StepsEntry[] = [];
  const sessions: ActivitySession[] = [];
  for (let i = 45; i >= 0; i--) {
    const d = addDays(today, -i);
    if (i > 0) {
      habitLogs.push({ date: d, habitId: 'h-agua', value: 4 + Math.floor(rand() * 6) });
      if (rand() < 0.7) habitLogs.push({ date: d, habitId: 'h-sueno', value: 1 });
      steps.push({ date: d, steps: Math.round((4800 + rand() * 7000) / 10) * 10, demo: true });
      const planDay = data.activityPlan.find((p) => p.weekday === weekdayIndex(d));
      if (planDay && planDay.type !== 'descanso' && rand() < 0.78) {
        sessions.push({ id: uid('ses'), date: d, type: planDay.type, title: planDay.title, minutes: planDay.minutes + Math.round((rand() - 0.5) * 10), demo: true });
      }
    } else {
      habitLogs.push({ date: d, habitId: 'h-agua', value: 3 });
      steps.push({ date: d, steps: 3240, demo: true });
    }
  }
  data.habitLogs = habitLogs;
  data.steps = steps;
  data.sessions = sessions;

  // Peso (cada 2-3 días, 90 días) y medidas
  const weights: WeightEntry[] = [];
  let w = 69.4;
  for (let i = 90; i >= 1; i -= 2 + Math.floor(rand() * 2)) {
    w += -0.03 * 2.5 + (rand() - 0.5) * 0.45;
    weights.push({ id: uid('w'), date: addDays(today, -i), kg: Math.round(w * 10) / 10, demo: true });
  }
  data.weights = weights;
  const measurements: MeasurementEntry[] = [
    { id: uid('m'), date: addDays(today, -88), waist: 78, hip: 99, chest: 90, arm: 28, thigh: 56, demo: true },
    { id: uid('m'), date: addDays(today, -45), waist: 76.5, hip: 98, chest: 89.5, arm: 28, thigh: 55.5, demo: true },
    { id: uid('m'), date: addDays(today, -6), waist: 75.5, hip: 97.5, chest: 89, arm: 28.5, thigh: 55, demo: true },
  ];
  data.measurements = measurements;

  data.shopping[monday] = { checked: { aceite: true, cebolla: true, ajo: true }, qty: {}, removed: {}, manual: [{ id: uid('man'), name: 'Café molido', qty: '1 paquete', category: 'otros', checked: false }] };

  return data;
}
