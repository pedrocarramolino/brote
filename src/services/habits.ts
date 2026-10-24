import type { AppData, Habit, ISODate } from '../types';
import { weekdayIndex } from '../lib/dates';
import { plannedMealsFor } from './nutrition';

export interface HabitState {
  habit: Habit;
  done: boolean;
  applicable: boolean;
  value: number;
  target: number;
  label: string; // texto de progreso, p. ej. "5 de 8 vasos"
}

export function habitState(data: AppData, habit: Habit, date: ISODate): HabitState {
  const log = data.habitLogs.find((l) => l.date === date && l.habitId === habit.id);
  const p = data.profile;
  switch (habit.kind) {
    case 'agua': {
      const v = log?.value ?? 0;
      return { habit, done: v >= p.waterTarget, applicable: true, value: v, target: p.waterTarget, label: `${v} de ${p.waterTarget} vasos` };
    }
    case 'pasos': {
      const s = data.steps.find((x) => x.date === date)?.steps ?? 0;
      return {
        habit, done: s >= p.stepsTarget, applicable: true, value: s, target: p.stepsTarget,
        label: s ? `${s.toLocaleString('es-ES')} de ${p.stepsTarget.toLocaleString('es-ES')} pasos` : 'Sin registrar',
      };
    }
    case 'actividad': {
      const planDay = data.activityPlan.find((d) => d.weekday === weekdayIndex(date));
      const hasSession = data.sessions.some((s) => s.date === date);
      if (!planDay || planDay.type === 'descanso') {
        return { habit, done: hasSession, applicable: hasSession, value: hasSession ? 1 : 0, target: 1, label: hasSession ? 'Sesión registrada' : 'Día de descanso' };
      }
      const done = hasSession || (log?.value ?? 0) >= 1;
      return { habit, done, applicable: true, value: done ? 1 : 0, target: 1, label: done ? 'Completada' : planDay.title };
    }
    case 'comidas': {
      const meals = plannedMealsFor(data, date).filter((m) => p.mealSlots.includes(m.slot));
      const resolved = meals.filter((m) => m.status !== 'pendiente').length;
      const logs = data.log.filter((l) => l.date === date).length;
      const total = meals.length || 1;
      const done = meals.length ? resolved === meals.length : logs > 0;
      return { habit, done, applicable: true, value: resolved, target: total, label: meals.length ? `${resolved} de ${meals.length} comidas` : `${logs} registros` };
    }
    default: {
      const done = (log?.value ?? 0) >= 1;
      return { habit, done, applicable: true, value: done ? 1 : 0, target: 1, label: done ? 'Hecho' : 'Pendiente' };
    }
  }
}

export function dayHabits(data: AppData, date: ISODate) {
  const states = data.habits.filter((h) => h.active).map((h) => habitState(data, h, date));
  const applicable = states.filter((s) => s.applicable);
  const done = applicable.filter((s) => s.done).length;
  return { states, done, total: applicable.length, pct: applicable.length ? Math.round((done / applicable.length) * 100) : 0 };
}

/** Cumplimiento del plan: comidas hechas / comidas planificadas de ese día. null si no hay plan. */
export function mealAdherence(data: AppData, date: ISODate): number | null {
  const meals = plannedMealsFor(data, date).filter((m) => data.profile.mealSlots.includes(m.slot));
  if (!meals.length) return null;
  return Math.round((meals.filter((m) => m.status === 'hecha').length / meals.length) * 100);
}
