import { memo } from 'react';
import type { EmissionsTotals } from '../hooks/useEmissions';
import { CATEGORY_LABELS, EMISSION_CATEGORIES } from '../types/emissions';
import { CATEGORY_STYLES, formatKg } from './categoryStyles';

interface EmissionsSummaryProps {
  readonly totals: EmissionsTotals;
}

function EmissionsSummaryBase({ totals }: EmissionsSummaryProps) {
  return (
    <section aria-label="Resumen de emisiones" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white shadow-sm">
        <p className="text-sm font-medium text-emerald-100">Total CO₂e</p>
        <p className="mt-2 text-3xl font-bold tracking-tight">{formatKg(totals.total)}</p>
        <p className="mt-1 text-xs text-emerald-100">{totals.count} mediciones registradas</p>
      </div>
      {EMISSION_CATEGORIES.map((c) => {
        const value = totals.byCategory[c];
        const pct = totals.total > 0 ? (value / totals.total) * 100 : 0;
        return (
          <div key={c} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
              <span aria-hidden="true">{CATEGORY_STYLES[c].icon}</span>
              {CATEGORY_LABELS[c]}
            </p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{formatKg(value)}</p>
            <div
              className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-label={`Participación de ${CATEGORY_LABELS[c]}`}
              aria-valuenow={Math.round(pct)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className={`h-full rounded-full ${CATEGORY_STYLES[c].bar}`} style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1 text-xs text-slate-500">{pct.toFixed(1)}% del total</p>
          </div>
        );
      })}
    </section>
  );
}

export const EmissionsSummary = memo(EmissionsSummaryBase);
