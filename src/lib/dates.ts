import type { ISODate } from '../types';

const pad = (n: number) => String(n).padStart(2, '0');

export function toISO(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Interpreta 'YYYY-MM-DD' como fecha local (evita desfases por zona horaria). */
export function fromISO(s: ISODate): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

export const todayISO = () => toISO(new Date());

export function addDays(s: ISODate, n: number): ISODate {
  const d = fromISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

/** Índice de día con la semana empezando en lunes (0 = lunes … 6 = domingo). */
export function weekdayIndex(s: ISODate): number {
  return (fromISO(s).getDay() + 6) % 7;
}

export function startOfWeek(s: ISODate): ISODate {
  return addDays(s, -weekdayIndex(s));
}

export function weekDates(monday: ISODate): ISODate[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round((fromISO(b).getTime() - fromISO(a).getTime()) / 86400000);
}

export function rangeDays(from: ISODate, to: ISODate): ISODate[] {
  const out: ISODate[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('es-ES', opts);
const fLong = fmt({ weekday: 'long', day: 'numeric', month: 'long' });
const fShort = fmt({ day: 'numeric', month: 'short' });
const fWeekdayShort = fmt({ weekday: 'short' });
const fWeekdayNarrow = fmt({ weekday: 'narrow' });
const fDayMonthYear = fmt({ day: 'numeric', month: 'short', year: 'numeric' });
const fMonthYear = fmt({ month: 'long', year: 'numeric' });

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const clean = (s: string) => s.replace('.', '');

export const formatLong = (s: ISODate) => cap(fLong.format(fromISO(s)));
export const formatShort = (s: ISODate) => clean(fShort.format(fromISO(s)));
export const formatWeekdayShort = (s: ISODate) => cap(clean(fWeekdayShort.format(fromISO(s))));
export const formatWeekdayNarrow = (s: ISODate) => fWeekdayNarrow.format(fromISO(s)).toUpperCase();
export const formatDate = (s: ISODate) => clean(fDayMonthYear.format(fromISO(s)));
export const formatMonthYear = (s: ISODate) => cap(fMonthYear.format(fromISO(s)));

export function formatWeekRange(monday: ISODate): string {
  const sunday = addDays(monday, 6);
  const a = fromISO(monday);
  const b = fromISO(sunday);
  if (a.getMonth() === b.getMonth()) return `${a.getDate()}–${b.getDate()} ${clean(fmt({ month: 'short' }).format(b))}`;
  return `${formatShort(monday)} – ${formatShort(sunday)}`;
}

export function relativeDayLabel(s: ISODate): string {
  const diff = daysBetween(todayISO(), s);
  if (diff === 0) return 'Hoy';
  if (diff === -1) return 'Ayer';
  if (diff === 1) return 'Mañana';
  return formatLong(s);
}

export function greeting(d = new Date()): string {
  const h = d.getHours();
  if (h < 6) return 'Buenas noches';
  if (h < 14) return 'Buenos días';
  if (h < 21) return 'Buenas tardes';
  return 'Buenas noches';
}
