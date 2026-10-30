import { useCallback, useMemo, useState } from 'react';
import { useEmissions } from '../hooks/useEmissions';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import type { EmissionCategory } from '../types/emissions';
import { CATEGORY_LABELS, EMISSION_CATEGORIES } from '../types/emissions';
import { Alert } from './Alert';
import { EmissionCard } from './EmissionCard';
import { EmissionCardSkeleton } from './EmissionCardSkeleton';
import { EmissionForm } from './EmissionForm';
import { EmissionsSummary } from './EmissionsSummary';

type Filter = EmissionCategory | 'todas';
const FILTERS: readonly Filter[] = ['todas', ...EMISSION_CATEGORIES];

/**
 * Componente contenedor del "Dashboard de Emisiones en Tiempo Real".
 * No contiene lógica de datos: la delega en useEmissions y solo compone UI.
 */
export function EmissionsTracker() {
  const {
    emissions,
    totals,
    isLoading,
    error,
    isSubmitting,
    submitError,
    addEmission,
    removeEmission,
    refetch,
    clearSubmitError,
  } = useEmissions();

  const [filter, setFilter] = useState<Filter>('todas');

  const visible = useMemo(
    () => (filter === 'todas' ? emissions : emissions.filter((e) => e.category === filter)),
    [emissions, filter],
  );

  // Callback estable -> EmissionCard (memo) no se re-renderiza innecesariamente.
  const handleRemove = useCallback((id: string) => void removeEmission(id), [removeEmission]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-emerald-700">
            <span aria-hidden="true">🌱</span> EcoTrack
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Dashboard de Emisiones en Tiempo Real
          </h1>
          <p className="mt-1 text-sm text-slate-600">Monitorea la huella de carbono de cada fuente de tu empresa.</p>
        </div>
        <span
          className={`inline-flex items-center gap-2 self-start rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset sm:self-auto ${
            isSupabaseConfigured
              ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
              : 'bg-slate-100 text-slate-600 ring-slate-400/30'
          }`}
        >
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full ${isSupabaseConfigured ? 'animate-pulse bg-emerald-500' : 'bg-slate-400'}`}
          />
          {isSupabaseConfigured ? 'Conectado a Supabase · tiempo real' : 'Modo demo · datos simulados'}
        </span>
      </header>

      <div className="mb-8">
        <EmissionsSummary totals={totals} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-labelledby="list-heading" className="order-2 lg:order-1">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 id="list-heading" className="text-lg font-semibold text-slate-900">
              Fuentes de emisión{' '}
              <span className="text-sm font-normal text-slate-500">({visible.length})</span>
            </h2>
            <div role="group" aria-label="Filtrar por categoría" className="flex flex-wrap gap-2">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  aria-pressed={filter === f}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                    filter === f
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-600 ring-1 ring-inset ring-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {f === 'todas' ? 'Todas' : CATEGORY_LABELS[f]}
                </button>
              ))}
            </div>
          </div>

          {error ? (
            <Alert title="No pudimos cargar las emisiones" action={{ label: 'Reintentar', onClick: refetch }}>
              {error}
            </Alert>
          ) : isLoading ? (
            <ul aria-busy="true" aria-label="Cargando emisiones" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <EmissionCardSkeleton key={i} />
              ))}
            </ul>
          ) : visible.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center">
              <p className="text-3xl" aria-hidden="true">🍃</p>
              <p className="mt-2 font-medium text-slate-900">Aún no hay mediciones</p>
              <p className="mt-1 text-sm text-slate-500">
                {filter === 'todas'
                  ? 'Registra la primera usando el formulario.'
                  : `No hay registros en la categoría ${CATEGORY_LABELS[filter]}.`}
              </p>
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((emission) => (
                <EmissionCard key={emission.id} emission={emission} onRemove={handleRemove} />
              ))}
            </ul>
          )}
        </section>

        <aside className="order-1 lg:order-2">
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-6">
            {submitError && (
              <Alert title="No se pudo guardar" onDismiss={clearSubmitError}>
                {submitError}
              </Alert>
            )}
            <EmissionForm onSubmit={addEmission} isSubmitting={isSubmitting} />
          </div>
        </aside>
      </div>
    </div>
  );
}
