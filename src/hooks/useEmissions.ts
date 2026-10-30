import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import {
  emissionsRepository as defaultRepository,
  type EmissionsRepository,
} from '../lib/emissionsRepository';
import type { Emission, EmissionCategory, NewEmission } from '../types/emissions';
import { EMISSION_CATEGORIES } from '../types/emissions';

/* ------------------------------------------------------------------ */
/* Estado (máquina de estados explícita con useReducer)                */
/* ------------------------------------------------------------------ */
type LoadStatus = 'idle' | 'loading' | 'success' | 'error';

interface EmissionsState {
  readonly status: LoadStatus;
  readonly items: readonly Emission[];
  readonly error: string | null;
  readonly isSubmitting: boolean;
  readonly submitError: string | null;
}

type Action =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; items: Emission[] }
  | { type: 'FETCH_ERROR'; error: string }
  | { type: 'SUBMIT_START'; optimistic: Emission }
  | { type: 'SUBMIT_SUCCESS'; tempId: string; saved: Emission }
  | { type: 'SUBMIT_ERROR'; tempId: string; error: string }
  | { type: 'REMOTE_INSERT'; item: Emission }
  | { type: 'REMOVE'; id: string }
  | { type: 'RESTORE'; item: Emission }
  | { type: 'SET_SUBMIT_ERROR'; error: string }
  | { type: 'CLEAR_SUBMIT_ERROR' };

const initialState: EmissionsState = {
  status: 'idle',
  items: [],
  error: null,
  isSubmitting: false,
  submitError: null,
};

const byDateDesc = (a: Emission, b: Emission) => b.created_at.localeCompare(a.created_at);

function reducer(state: EmissionsState, action: Action): EmissionsState {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, status: 'loading', error: null };
    case 'FETCH_SUCCESS':
      return { ...state, status: 'success', items: action.items };
    case 'FETCH_ERROR':
      return { ...state, status: 'error', error: action.error };
    case 'SUBMIT_START':
      // Actualización optimista: la tarjeta aparece de inmediato.
      return { ...state, isSubmitting: true, submitError: null, items: [action.optimistic, ...state.items] };
    case 'SUBMIT_SUCCESS': {
      // Reemplaza la fila temporal por la real; evita duplicado si realtime llegó primero.
      const withoutTemp = state.items.filter((i) => i.id !== action.tempId && i.id !== action.saved.id);
      return { ...state, isSubmitting: false, items: [action.saved, ...withoutTemp].sort(byDateDesc) };
    }
    case 'SUBMIT_ERROR':
      // Rollback de la actualización optimista.
      return {
        ...state,
        isSubmitting: false,
        submitError: action.error,
        items: state.items.filter((i) => i.id !== action.tempId),
      };
    case 'REMOTE_INSERT':
      if (state.items.some((i) => i.id === action.item.id)) return state;
      return { ...state, items: [action.item, ...state.items].sort(byDateDesc) };
    case 'REMOVE':
      return { ...state, items: state.items.filter((i) => i.id !== action.id) };
    case 'RESTORE':
      return { ...state, items: [action.item, ...state.items].sort(byDateDesc) };
    case 'SET_SUBMIT_ERROR':
      return { ...state, submitError: action.error };
    case 'CLEAR_SUBMIT_ERROR':
      return { ...state, submitError: null };
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

const toMessage = (e: unknown): string =>
  e instanceof Error ? e.message : 'Ocurrió un error inesperado. Intenta nuevamente.';

/* ------------------------------------------------------------------ */
/* API pública del hook                                                */
/* ------------------------------------------------------------------ */
export interface EmissionsTotals {
  readonly total: number;
  readonly byCategory: Readonly<Record<EmissionCategory, number>>;
  readonly count: number;
}

export interface UseEmissionsResult {
  readonly emissions: readonly Emission[];
  readonly totals: EmissionsTotals;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly isSubmitting: boolean;
  readonly submitError: string | null;
  readonly addEmission: (input: NewEmission) => Promise<boolean>;
  readonly removeEmission: (id: string) => Promise<void>;
  readonly refetch: () => void;
  readonly clearSubmitError: () => void;
}

/**
 * Encapsula toda la lógica de datos de emisiones: carga inicial,
 * inserción optimista, borrado, errores y suscripción en tiempo real.
 * La UI solo consume estado derivado y callbacks estables.
 */
export function useEmissions(repository: EmissionsRepository = defaultRepository): UseEmissionsResult {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [reloadKey, bumpReload] = useReducer((n: number) => n + 1, 0);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Carga inicial (y recargas) con cancelación para evitar race conditions.
  useEffect(() => {
    const controller = new AbortController();
    dispatch({ type: 'FETCH_START' });
    repository
      .list(controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) dispatch({ type: 'FETCH_SUCCESS', items });
      })
      .catch((e: unknown) => {
        if (!controller.signal.aborted) dispatch({ type: 'FETCH_ERROR', error: toMessage(e) });
      });
    return () => controller.abort();
  }, [repository, reloadKey]);

  // Tiempo real: otras sesiones insertando / borrando.
  useEffect(
    () =>
      repository.subscribe(
        (item) => dispatch({ type: 'REMOTE_INSERT', item }),
        (id) => dispatch({ type: 'REMOVE', id }),
      ),
    [repository],
  );

  const addEmission = useCallback(
    async (input: NewEmission): Promise<boolean> => {
      const tempId = `temp-${crypto.randomUUID()}`;
      dispatch({
        type: 'SUBMIT_START',
        optimistic: { ...input, id: tempId, created_at: new Date().toISOString() },
      });
      try {
        const saved = await repository.create(input);
        if (isMounted.current) dispatch({ type: 'SUBMIT_SUCCESS', tempId, saved });
        return true;
      } catch (e) {
        if (isMounted.current) dispatch({ type: 'SUBMIT_ERROR', tempId, error: toMessage(e) });
        return false;
      }
    },
    [repository],
  );

  const itemsRef = useRef(state.items);
  itemsRef.current = state.items;

  const removeEmission = useCallback(
    async (id: string): Promise<void> => {
      const previous = itemsRef.current.find((i) => i.id === id);
      dispatch({ type: 'REMOVE', id });
      try {
        await repository.remove(id);
      } catch (e) {
        if (previous && isMounted.current) {
          dispatch({ type: 'RESTORE', item: previous });
          dispatch({ type: 'SET_SUBMIT_ERROR', error: `No se pudo eliminar: ${toMessage(e)}` });
        }
      }
    },
    [repository],
  );

  const refetch = useCallback(() => bumpReload(), []);
  const clearSubmitError = useCallback(() => dispatch({ type: 'CLEAR_SUBMIT_ERROR' }), []);

  // Agregados derivados memoizados: solo se recalculan si cambia la lista.
  const totals = useMemo<EmissionsTotals>(() => {
    const byCategory = Object.fromEntries(EMISSION_CATEGORIES.map((c) => [c, 0])) as Record<
      EmissionCategory,
      number
    >;
    let total = 0;
    for (const e of state.items) {
      byCategory[e.category] += e.co2_kg;
      total += e.co2_kg;
    }
    return { total, byCategory, count: state.items.length };
  }, [state.items]);

  return {
    emissions: state.items,
    totals,
    isLoading: state.status === 'loading' || state.status === 'idle',
    error: state.error,
    isSubmitting: state.isSubmitting,
    submitError: state.submitError,
    addEmission,
    removeEmission,
    refetch,
    clearSubmitError,
  };
}
