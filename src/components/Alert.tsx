import type { ReactNode } from 'react';

interface AlertProps {
  readonly title: string;
  readonly children?: ReactNode;
  readonly onDismiss?: () => void;
  readonly action?: { readonly label: string; readonly onClick: () => void };
}

/** Mensaje de error accesible (role="alert" lo anuncia el lector de pantalla). */
export function Alert({ title, children, onDismiss, action }: AlertProps) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <span aria-hidden="true" className="mt-0.5 text-base">⚠️</span>
      <div className="flex-1">
        <p className="font-semibold">{title}</p>
        {children ? <div className="mt-1 text-red-700">{children}</div> : null}
        {action ? (
          <button
            type="button"
            onClick={action.onClick}
            className="mt-3 rounded-lg bg-red-600 px-3 py-1.5 font-medium text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
          >
            {action.label}
          </button>
        ) : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Cerrar mensaje de error"
          className="rounded p-1 text-red-600 hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
        >
          ✕
        </button>
      ) : null}
    </div>
  );
}
