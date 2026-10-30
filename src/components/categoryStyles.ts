import type { EmissionCategory } from '../types/emissions';

interface CategoryStyle {
  readonly badge: string;
  readonly accent: string;
  readonly bar: string;
  readonly icon: string;
}

/** Estilos por categoría (clases Tailwind completas para que el purge las detecte). */
export const CATEGORY_STYLES: Readonly<Record<EmissionCategory, CategoryStyle>> = {
  transporte: {
    badge: 'bg-sky-50 text-sky-800 ring-sky-600/20',
    accent: 'border-l-sky-500',
    bar: 'bg-sky-500',
    icon: '🚚',
  },
  energia: {
    badge: 'bg-amber-50 text-amber-800 ring-amber-600/20',
    accent: 'border-l-amber-500',
    bar: 'bg-amber-500',
    icon: '⚡',
  },
  residuos: {
    badge: 'bg-violet-50 text-violet-800 ring-violet-600/20',
    accent: 'border-l-violet-500',
    bar: 'bg-violet-500',
    icon: '♻️',
  },
};

const kgFormatter = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });
const dateFormatter = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' });

export const formatKg = (kg: number): string =>
  kg >= 1000 ? `${kgFormatter.format(kg / 1000)} t` : `${kgFormatter.format(kg)} kg`;

export const formatDate = (iso: string): string => dateFormatter.format(new Date(iso));
