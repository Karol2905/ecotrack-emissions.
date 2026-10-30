import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Cliente único de Supabase. Si no hay variables de entorno configuradas
 * se exporta `null` y la app usa el repositorio simulado (modo demo).
 */
export const supabase: SupabaseClient | null =
  url && anonKey && !url.includes('tu-proyecto') ? createClient(url, anonKey) : null;

export const isSupabaseConfigured = supabase !== null;
