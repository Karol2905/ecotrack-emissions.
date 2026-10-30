import type { Emission, NewEmission } from '../types/emissions';
import { isEmissionCategory } from '../types/emissions';
import { supabase } from './supabaseClient';

/**
 * Contrato de acceso a datos. El hook depende de esta interfaz y no de
 * Supabase directamente, lo que permite cambiar la fuente (real / demo)
 * y testear sin red.
 */
export interface EmissionsRepository {
  list(signal?: AbortSignal): Promise<Emission[]>;
  create(input: NewEmission): Promise<Emission>;
  remove(id: string): Promise<void>;
  /** Suscripción en tiempo real. Devuelve la función de limpieza. */
  subscribe(onInsert: (row: Emission) => void, onDelete: (id: string) => void): () => void;
}

const TABLE = 'emissions';

/** Valida en runtime lo que llega de la red (TypeScript no lo garantiza). */
function toEmission(row: unknown): Emission {
  const r = row as Record<string, unknown>;
  if (
    typeof r.id !== 'string' ||
    typeof r.source_name !== 'string' ||
    !isEmissionCategory(r.category) ||
    typeof r.created_at !== 'string'
  ) {
    throw new Error('Respuesta inválida del servidor: fila de emisión con formato inesperado.');
  }
  return {
    id: r.id,
    source_name: r.source_name,
    category: r.category,
    co2_kg: Number(r.co2_kg),
    created_at: r.created_at,
  };
}

/* ------------------------------------------------------------------ */
/* Implementación real: Supabase                                       */
/* ------------------------------------------------------------------ */
function createSupabaseRepository(): EmissionsRepository {
  if (!supabase) throw new Error('Supabase no está configurado.');
  const client = supabase;

  return {
    async list(signal) {
      let query = client
        .from(TABLE)
        .select('id, source_name, category, co2_kg, created_at')
        .order('created_at', { ascending: false });
      if (signal) query = query.abortSignal(signal);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data ?? []).map(toEmission);
    },

    async create(input) {
      const { data, error } = await client.from(TABLE).insert(input).select().single();
      if (error) throw new Error(error.message);
      return toEmission(data);
    },

    async remove(id) {
      const { error } = await client.from(TABLE).delete().eq('id', id);
      if (error) throw new Error(error.message);
    },

    subscribe(onInsert, onDelete) {
      const channel = client
        .channel('emissions-realtime')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: TABLE }, (payload) => {
          try {
            onInsert(toEmission(payload.new));
          } catch {
            /* fila malformada: se ignora */
          }
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: TABLE }, (payload) => {
          const id = (payload.old as { id?: unknown }).id;
          if (typeof id === 'string') onDelete(id);
        })
        .subscribe();
      return () => {
        void client.removeChannel(channel);
      };
    },
  };
}

/* ------------------------------------------------------------------ */
/* Implementación demo: memoria + latencia simulada                    */
/* ------------------------------------------------------------------ */
const SEED: Emission[] = [
  { id: 'd1', source_name: 'Flota de camiones de reparto', category: 'transporte', co2_kg: 1240.5, created_at: '2026-10-28T14:20:00Z' },
  { id: 'd2', source_name: 'Planta principal – red eléctrica', category: 'energia', co2_kg: 3820, created_at: '2026-10-28T09:05:00Z' },
  { id: 'd3', source_name: 'Relleno sanitario – residuos orgánicos', category: 'residuos', co2_kg: 512.75, created_at: '2026-10-27T17:40:00Z' },
  { id: 'd4', source_name: 'Vuelos corporativos Bogotá–Medellín', category: 'transporte', co2_kg: 890.2, created_at: '2026-10-27T11:15:00Z' },
  { id: 'd5', source_name: 'Data center (climatización)', category: 'energia', co2_kg: 1675.4, created_at: '2026-10-26T08:00:00Z' },
  { id: 'd6', source_name: 'Empaques plásticos descartados', category: 'residuos', co2_kg: 230.1, created_at: '2026-10-25T16:30:00Z' },
];

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function createMockRepository(): EmissionsRepository {
  let rows = [...SEED];
  return {
    async list() {
      await delay(700);
      return [...rows];
    },
    async create(input) {
      await delay(500);
      if (input.source_name.toLowerCase().includes('error')) {
        throw new Error('Error simulado del servidor (escribe un nombre sin la palabra "error").');
      }
      const row: Emission = { ...input, id: crypto.randomUUID(), created_at: new Date().toISOString() };
      rows = [row, ...rows];
      return row;
    },
    async remove(id) {
      await delay(300);
      rows = rows.filter((r) => r.id !== id);
    },
    subscribe() {
      return () => undefined;
    },
  };
}

export const emissionsRepository: EmissionsRepository = supabase
  ? createSupabaseRepository()
  : createMockRepository();
