/**
 * Tipos de dominio para el módulo de emisiones.
 * Reflejan 1:1 la tabla `public.emissions` definida en supabase/schema.sql.
 */

export const EMISSION_CATEGORIES = ['transporte', 'energia', 'residuos'] as const;

export type EmissionCategory = (typeof EMISSION_CATEGORIES)[number];

export const CATEGORY_LABELS: Readonly<Record<EmissionCategory, string>> = {
  transporte: 'Transporte',
  energia: 'Energía',
  residuos: 'Residuos',
};

/** Fila tal como existe en la base de datos. */
export interface Emission {
  readonly id: string;
  readonly source_name: string;
  readonly category: EmissionCategory;
  /** CO2 equivalente en kilogramos. */
  readonly co2_kg: number;
  readonly created_at: string;
}

/** Payload para insertar una nueva medición (lo demás lo genera la BD). */
export type NewEmission = Pick<Emission, 'source_name' | 'category' | 'co2_kg'>;

export function isEmissionCategory(value: unknown): value is EmissionCategory {
  return typeof value === 'string' && (EMISSION_CATEGORIES as readonly string[]).includes(value);
}
