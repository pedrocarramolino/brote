import type { AppData } from '../types';

/**
 * Capa de acceso a datos. La interfaz de usuario solo habla con un `DataRepository`,
 * así que migrar a Supabase (ver supabase/migrations) consiste en implementar este
 * contrato con llamadas a la base de datos, sin tocar componentes.
 */
export interface DataRepository {
  readonly kind: 'local' | 'remote';
  load(): Promise<AppData | null>;
  save(data: AppData): Promise<void>;
  clear(): Promise<void>;
}

const KEY = 'brote:data:v1';

/** Persistencia local en el navegador. Si el almacenamiento no está disponible, usa memoria. */
export class LocalRepository implements DataRepository {
  readonly kind = 'local' as const;
  private memory: string | null = null;
  available = true;

  constructor() {
    try {
      const t = '__brote_test__';
      localStorage.setItem(t, '1');
      localStorage.removeItem(t);
    } catch {
      this.available = false;
    }
  }

  async load(): Promise<AppData | null> {
    try {
      const raw = this.available ? localStorage.getItem(KEY) : this.memory;
      if (!raw) return null;
      const parsed = JSON.parse(raw) as AppData;
      if (!parsed || typeof parsed !== 'object' || !parsed.profile) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  async save(data: AppData): Promise<void> {
    const raw = JSON.stringify(data);
    if (!this.available) {
      this.memory = raw;
      return;
    }
    try {
      localStorage.setItem(KEY, raw);
    } catch (e) {
      this.memory = raw;
      throw new Error('No se ha podido guardar en este navegador (almacenamiento lleno o bloqueado).');
    }
  }

  async clear(): Promise<void> {
    this.memory = null;
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* sin acceso */
    }
  }
}

export const repository: DataRepository & { available?: boolean } = new LocalRepository();
