import { memo, useId, useState, type FormEvent } from 'react';
import type { EmissionCategory, NewEmission } from '../types/emissions';
import { CATEGORY_LABELS, EMISSION_CATEGORIES } from '../types/emissions';
import { Spinner } from './Spinner';

interface EmissionFormProps {
  readonly onSubmit: (input: NewEmission) => Promise<boolean>;
  readonly isSubmitting: boolean;
}

interface FormErrors {
  source_name?: string;
  co2_kg?: string;
}

const MAX_NAME = 120;
const MAX_CO2 = 1_000_000;

function validate(name: string, co2: string): FormErrors {
  const errors: FormErrors = {};
  const trimmed = name.trim();
  if (trimmed.length < 3) errors.source_name = 'Ingresa un nombre de al menos 3 caracteres.';
  else if (trimmed.length > MAX_NAME) errors.source_name = `Máximo ${MAX_NAME} caracteres.`;

  const value = Number(co2.replace(',', '.'));
  if (co2.trim() === '' || Number.isNaN(value)) errors.co2_kg = 'Ingresa un valor numérico.';
  else if (value <= 0) errors.co2_kg = 'El valor debe ser mayor que 0.';
  else if (value > MAX_CO2) errors.co2_kg = 'El valor parece demasiado alto. Revísalo.';
  return errors;
}

function EmissionFormBase({ onSubmit, isSubmitting }: EmissionFormProps) {
  const [sourceName, setSourceName] = useState('');
  const [category, setCategory] = useState<EmissionCategory>('transporte');
  const [co2, setCo2] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [success, setSuccess] = useState(false);
  const id = useId();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const found = validate(sourceName, co2);
    setErrors(found);
    setSuccess(false);
    if (Object.keys(found).length > 0) {
      const firstInvalid = found.source_name ? `${id}-name` : `${id}-co2`;
      document.getElementById(firstInvalid)?.focus();
      return;
    }
    const ok = await onSubmit({
      source_name: sourceName.trim(),
      category,
      co2_kg: Number(co2.replace(',', '.')),
    });
    if (ok) {
      setSourceName('');
      setCo2('');
      setSuccess(true);
    }
  }

  const inputBase =
    'block w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:bg-slate-50';
  const ok = 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-500/30';
  const bad = 'border-red-400 focus:border-red-500 focus:ring-red-500/30';

  return (
    <form onSubmit={handleSubmit} noValidate aria-labelledby={`${id}-heading`} className="space-y-4">
      <h2 id={`${id}-heading`} className="text-lg font-semibold text-slate-900">
        Nueva medición
      </h2>

      <div>
        <label htmlFor={`${id}-name`} className="mb-1.5 block text-sm font-medium text-slate-700">
          Nombre de la fuente
        </label>
        <input
          id={`${id}-name`}
          type="text"
          value={sourceName}
          onChange={(e) => setSourceName(e.target.value)}
          placeholder="Ej: Flota de vehículos eléctricos"
          maxLength={MAX_NAME}
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.source_name)}
          aria-describedby={errors.source_name ? `${id}-name-error` : undefined}
          className={`${inputBase} ${errors.source_name ? bad : ok}`}
        />
        {errors.source_name && (
          <p id={`${id}-name-error`} className="mt-1.5 text-xs text-red-600">
            {errors.source_name}
          </p>
        )}
      </div>

      <fieldset>
        <legend className="mb-1.5 block text-sm font-medium text-slate-700">Categoría</legend>
        <div className="grid grid-cols-3 gap-2">
          {EMISSION_CATEGORIES.map((c) => (
            <label
              key={c}
              className="flex cursor-pointer items-center justify-center rounded-lg border border-slate-300 px-2 py-2 text-sm font-medium text-slate-700 transition has-[:checked]:border-emerald-600 has-[:checked]:bg-emerald-50 has-[:checked]:text-emerald-800 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-emerald-500"
            >
              <input
                type="radio"
                name={`${id}-category`}
                value={c}
                checked={category === c}
                onChange={() => setCategory(c)}
                disabled={isSubmitting}
                className="sr-only"
              />
              {CATEGORY_LABELS[c]}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor={`${id}-co2`} className="mb-1.5 block text-sm font-medium text-slate-700">
          CO₂ producido (kg)
        </label>
        <input
          id={`${id}-co2`}
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          value={co2}
          onChange={(e) => setCo2(e.target.value)}
          placeholder="Ej: 350.5"
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.co2_kg)}
          aria-describedby={errors.co2_kg ? `${id}-co2-error` : undefined}
          className={`${inputBase} ${errors.co2_kg ? bad : ok}`}
        />
        {errors.co2_kg && (
          <p id={`${id}-co2-error`} className="mt-1.5 text-xs text-red-600">
            {errors.co2_kg}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? (
          <>
            <Spinner /> Guardando…
          </>
        ) : (
          'Agregar medición'
        )}
      </button>

      <p aria-live="polite" className="min-h-[1.25rem] text-center text-xs font-medium text-emerald-700">
        {success && !isSubmitting ? '✓ Medición registrada correctamente' : ''}
      </p>
    </form>
  );
}

export const EmissionForm = memo(EmissionFormBase);
