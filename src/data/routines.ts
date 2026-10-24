import type { ActivityPlanDay, Habit, Routine, TrainingPref } from '../types';

/** Rutinas de DEMOSTRACIÓN, orientativas, para probar la interfaz. No son una prescripción. */
export const DEMO_ROUTINES: Routine[] = [
  {
    id: 'casa-cuerpo', name: 'Cuerpo completo en casa', type: 'casa', minutes: 25, demo: true,
    exercises: [
      { name: 'Calentamiento', detail: '5 min de movilidad articular' },
      { name: 'Sentadillas', detail: '3 × 12' },
      { name: 'Flexiones (apoyando rodillas si lo necesitas)', detail: '3 × 8–10' },
      { name: 'Zancadas alternas', detail: '3 × 10 por pierna' },
      { name: 'Plancha', detail: '3 × 30 s' },
      { name: 'Estiramientos', detail: '5 min' },
    ],
  },
  {
    id: 'gym-superior', name: 'Gimnasio · tren superior', type: 'gimnasio', minutes: 50, demo: true,
    exercises: [
      { name: 'Press de banca', detail: '4 × 8' },
      { name: 'Remo con mancuerna', detail: '4 × 10' },
      { name: 'Press militar', detail: '3 × 10' },
      { name: 'Jalón al pecho', detail: '3 × 12' },
      { name: 'Curl de bíceps', detail: '3 × 12' },
    ],
  },
  {
    id: 'gym-inferior', name: 'Gimnasio · tren inferior', type: 'gimnasio', minutes: 50, demo: true,
    exercises: [
      { name: 'Sentadilla con barra', detail: '4 × 8' },
      { name: 'Peso muerto rumano', detail: '3 × 10' },
      { name: 'Prensa', detail: '3 × 12' },
      { name: 'Elevación de gemelos', detail: '3 × 15' },
    ],
  },
  {
    id: 'paseo-activo', name: 'Paseo a buen ritmo', type: 'general', minutes: 40, demo: true,
    exercises: [
      { name: 'Paseo suave', detail: '5 min' },
      { name: 'Paseo a ritmo vivo', detail: '30 min' },
      { name: 'Vuelta a la calma', detail: '5 min' },
    ],
  },
  {
    id: 'movilidad', name: 'Movilidad y estiramientos', type: 'casa', minutes: 15, demo: true,
    exercises: [
      { name: 'Movilidad de cadera', detail: '3 min' },
      { name: 'Gato-camello', detail: '2 min' },
      { name: 'Estiramiento de isquios', detail: '2 × 30 s' },
      { name: 'Respiración diafragmática', detail: '3 min' },
    ],
  },
];

const rest = (weekday: number): ActivityPlanDay => ({ weekday, type: 'descanso', title: 'Descanso', minutes: 0 });
const day = (weekday: number, routineId: string): ActivityPlanDay => {
  const r = DEMO_ROUTINES.find((x) => x.id === routineId)!;
  return { weekday, type: r.type, routineId, title: r.name, minutes: r.minutes };
};

/** Plan semanal por defecto según la preferencia declarada (no obliga a ir al gimnasio). */
export function defaultActivityPlan(pref: TrainingPref | undefined): ActivityPlanDay[] {
  switch (pref) {
    case 'gimnasio':
      return [day(0, 'gym-superior'), day(1, 'paseo-activo'), day(2, 'gym-inferior'), rest(3), day(4, 'gym-superior'), day(5, 'paseo-activo'), rest(6)];
    case 'casa':
      return [day(0, 'casa-cuerpo'), day(1, 'movilidad'), day(2, 'casa-cuerpo'), rest(3), day(4, 'casa-cuerpo'), day(5, 'paseo-activo'), rest(6)];
    case 'mixto':
      return [day(0, 'gym-superior'), day(1, 'paseo-activo'), day(2, 'casa-cuerpo'), rest(3), day(4, 'gym-inferior'), day(5, 'paseo-activo'), rest(6)];
    case 'ninguno':
      return [0, 1, 2, 3, 4, 5, 6].map(rest);
    case 'caminar':
    default:
      return [day(0, 'paseo-activo'), day(1, 'movilidad'), day(2, 'paseo-activo'), rest(3), day(4, 'paseo-activo'), day(5, 'paseo-activo'), rest(6)];
  }
}

export const DEFAULT_HABITS: Habit[] = [
  { id: 'h-agua', name: 'Beber agua', kind: 'agua', icon: 'droplet', active: true },
  { id: 'h-pasos', name: 'Objetivo de pasos', kind: 'pasos', icon: 'footprints', active: true },
  { id: 'h-actividad', name: 'Actividad planificada', kind: 'actividad', icon: 'dumbbell', active: true },
  { id: 'h-comidas', name: 'Registrar las comidas', kind: 'comidas', icon: 'utensils', active: true },
  { id: 'h-sueno', name: 'Dormir 7 h o más', kind: 'custom', icon: 'moon', active: true },
];
