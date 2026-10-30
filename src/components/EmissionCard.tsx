import { memo } from 'react';
import type { Emission } from '../types/emissions';
import { CATEGORY_LABELS } from '../types/emissions';
import { CATEGORY_STYLES, formatDate, formatKg } from './categoryStyles';

interface EmissionCardProps {
  readonly emission: Emission;
  readonly onRemove: (id: string) => void;
}

/**
 * Tarjeta individual. Envuelta en React.memo: al agregar una medición nueva
 * las tarjetas existentes no se vuelven a renderizar (props estables).
 */
function EmissionCardBase({ emission, onRemove }: EmissionCardProps) {
  const style = CATEGORY_STYLES[emission.category];
  const isPending = emission.id.startsWith('temp-');
  const titleId = `emission-${emission.id}-title`;

  return (
    <li>
      <article
        aria-labelledby={titleId}
        aria-busy={isPending}
        className={`group relative flex h-full flex-col gap-4 rounded-2xl border border-l-4 border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md ${style.accent} ${isPending ? 'opacity-60' : ''}`}
      >
        <header className="flex items-start justify-between gap-3">
          <h3 id={titleId} className="text-base font-semibold leading-snug text-slate-900">
            {emission.source_name}
          </h3>
          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${style.badge}`}
          >
            <span aria-hidden="true">{style.icon}</span>
            {CATEGORY_LABELS[emission.category]}
          </span>
        </header>

        <p className="mt-auto">
          <span className="sr-only">CO2 producido: </span>
          <span className="text-3xl font-bold tracking-tight text-slate-900">{formatKg(emission.co2_kg)}</span>
          <span className="ml-1 text-sm font-medium text-slate-500">CO₂e</span>
        </p>

        <footer className="flex items-center justify-between text-xs text-slate-500">
          <time dateTime={emission.created_at}>{isPending ? 'Guardando…' : formatDate(emission.created_at)}</time>
          {!isPending && (
            <button
              type="button"
              onClick={() => onRemove(emission.id)}
              aria-label={`Eliminar medición ${emission.source_name}`}
              className="rounded-md px-2 py-1 font-medium text-slate-400 opacity-100 hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
            >
              Eliminar
            </button>
          )}
        </footer>
      </article>
    </li>
  );
}

export const EmissionCard = memo(EmissionCardBase);
