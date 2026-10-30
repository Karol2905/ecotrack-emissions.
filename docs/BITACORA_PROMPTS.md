# Bitácora de Prompts · Ciclo Spec-to-Code

**Proyecto:** EcoTrack – Dashboard de Emisiones en Tiempo Real
**Stack:** React 18 + Vite + TypeScript (strict) + Tailwind CSS + Supabase
**Objetivo:** transformar la especificación funcional en componentes y hooks de calidad profesional mediante prompteo iterativo, sin aceptar el primer resultado de la IA.

---

## Resumen del ciclo

| # | Prompt | Objetivo | Resultado clave | Problemas detectados → siguiente prompt |
|---|--------|----------|-----------------|------------------------------------------|
| 1 | Estructura | Arquitectura de componentes | Árbol de componentes + tipos | Lógica de Supabase mezclada en el componente |
| 2 | Lógica | Custom hook `useEmissions` | Hook con `loading` / `error` / `addEmission` | Estados booleanos sueltos, sin cancelación, sin realtime |
| 3 | Refinamiento | TS estricto, accesibilidad, rendimiento | `useReducer`, `useMemo`, `React.memo`, ARIA | Formulario sin validación, sin feedback optimista |
| 4 | Robustez / UX | Optimistic UI, validación, responsive, modo demo | Versión final | — |

---

## Prompt 1 · Estructura

> **Rol:** Actúa como arquitecto frontend senior especializado en React y Supabase.
>
> **Contexto:** Estoy construyendo "EcoTrack", una plataforma de monitoreo de huella de carbono. El backend ya tiene en Supabase una tabla `emissions` con las columnas `id (uuid)`, `source_name (text)`, `category (text: 'transporte' | 'energia' | 'residuos')`, `co2_kg (numeric)` y `created_at (timestamptz)`.
>
> **Tarea:** Propón la arquitectura de un componente `EmissionsTracker` que:
> 1. Muestre un listado de tarjetas con nombre de la fuente, categoría y CO₂ producido.
> 2. Tenga un formulario para agregar nuevas mediciones.
> 3. Use un custom hook `useEmissions` para la lógica de datos.
> 4. Use Tailwind CSS.
>
> **Formato de salida:** árbol de carpetas, lista de componentes con su responsabilidad y props, y las interfaces TypeScript del dominio. Todavía no escribas la implementación completa.

### Respuesta de la IA (v1, resumida)

```
src/
  components/EmissionsTracker.tsx   ← lista + formulario + fetch a Supabase
  components/EmissionCard.tsx
  hooks/useEmissions.ts
  supabaseClient.ts
```

```ts
interface Emission {
  id: string;
  source_name: string;
  category: string;   // ← string genérico
  co2_kg: number;
}
```

### Análisis crítico

- ✅ Buena separación inicial de `EmissionCard`.
- ❌ `category: string` permite valores inválidos; no aprovecha el tipado.
- ❌ El formulario vivía dentro de `EmissionsTracker` → componente "dios".
- ❌ No había capa de acceso a datos: el hook iba a llamar a `supabase` directamente, imposible de probar sin red.

**Decisiones que tomé:** extraer `EmissionForm`, `EmissionsSummary`, `Alert`, `Spinner`, `EmissionCardSkeleton`; crear `types/emissions.ts` con un tipo literal derivado de una constante (`as const`); y agregar `lib/emissionsRepository.ts` como capa intermedia (patrón Repository).

---

## Prompt 2 · Lógica (Custom Hook)

> **Contexto:** Con la arquitectura anterior (te pego los tipos de `types/emissions.ts` y la interfaz `EmissionsRepository { list, create, remove, subscribe }`).
>
> **Tarea:** Implementa el custom hook `useEmissions` en TypeScript que:
> - Cargue las emisiones al montar, ordenadas por fecha descendente.
> - Exponga `isLoading` y `error` para la carga, e `isSubmitting` y `submitError` para la inserción (deben ser independientes: un error al guardar NO debe ocultar la lista).
> - Exponga `addEmission(input): Promise<boolean>` y `refetch()`.
> - Reciba el repositorio por parámetro (inyección de dependencias) con un valor por defecto.
>
> **Restricciones:** no uses librerías externas de estado (sin React Query/Zustand). Maneja los errores con mensajes legibles en español.

### Respuesta de la IA (v2, fragmento)

```ts
export function useEmissions() {
  const [emissions, setEmissions] = useState<Emission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    supabase.from('emissions').select('*')
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setEmissions(data);
        setLoading(false);
      });
  }, []);

  const addEmission = async (e) => {
    const { data } = await supabase.from('emissions').insert(e).select();
    setEmissions([...emissions, data[0]]);   // ← closure obsoleta
  };
  ...
}
```

### Análisis crítico

- ❌ Ignoró la inyección del repositorio y llamó a `supabase` directo.
- ❌ `setEmissions([...emissions, ...])` usa un **closure obsoleto** (si se insertan dos registros rápido se pierde uno).
- ❌ Sin `AbortController`: si el componente se desmonta durante la carga → *state update on unmounted component* / race condition.
- ❌ `addEmission` se recrea en cada render → rompe la memoización de los hijos.
- ❌ Varios `useState` booleanos que pueden quedar en combinaciones imposibles (`loading=true` y `error!=null`).
- ❌ `select('*')` sin validación en runtime de la respuesta.
- ❌ No aprovechaba la parte "Tiempo Real" de la especificación.

---

## Prompt 3 · Refinamiento (TypeScript estricto, rendimiento, accesibilidad)

> Revisa tu implementación anterior. Encontré estos problemas: [lista del análisis crítico anterior]. Reescribe `useEmissions` y los componentes cumpliendo **todas** estas restricciones:
>
> 1. **TypeScript estricto:** `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. Prohibido `any`. Valida en runtime las filas que llegan de Supabase con un type guard.
> 2. **Estado:** usa `useReducer` con una unión discriminada de acciones y un `switch` exhaustivo (`never`). Estado de carga como `'idle' | 'loading' | 'success' | 'error'`.
> 3. **Async seguro:** cancela la petición con `AbortController` en el cleanup del `useEffect`.
> 4. **Realtime:** suscríbete a `postgres_changes` (INSERT / DELETE) y evita duplicados con la inserción local.
> 5. **Rendimiento:** callbacks con `useCallback`, totales por categoría con `useMemo`, `EmissionCard` envuelto en `React.memo`. Explica qué re-renders evitas.
> 6. **Accesibilidad (WCAG 2.1 AA):** `<label>` asociados, `aria-invalid` + `aria-describedby` en errores, `role="alert"` para errores, `aria-live` para confirmaciones, `aria-busy` durante la carga, foco visible en todos los controles, `aria-pressed` en los filtros.

### Respuesta de la IA (v3, fragmento)

```ts
type Action =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; items: Emission[] }
  | { type: 'FETCH_ERROR'; error: string }
  | ...

function reducer(state: EmissionsState, action: Action): EmissionsState {
  switch (action.type) {
    ...
    default: {
      const exhaustive: never = action;   // el compilador obliga a cubrir todos los casos
      return exhaustive;
    }
  }
}

useEffect(() => {
  const controller = new AbortController();
  dispatch({ type: 'FETCH_START' });
  repository.list(controller.signal)
    .then((items) => { if (!controller.signal.aborted) dispatch({ type: 'FETCH_SUCCESS', items }); })
    .catch((e) => { if (!controller.signal.aborted) dispatch({ type: 'FETCH_ERROR', error: toMessage(e) }); });
  return () => controller.abort();
}, [repository, reloadKey]);

const totals = useMemo(() => { /* suma por categoría */ }, [state.items]);
```

### Análisis crítico

- ✅ Máquina de estados explícita, sin combinaciones imposibles.
- ✅ `React.memo` + `useCallback`: al agregar una medición sólo se renderiza la tarjeta nueva.
- ✅ Type guard `toEmission()` en el repositorio.
- ⚠️ La UX todavía era lenta: la tarjeta aparecía sólo cuando Supabase respondía.
- ⚠️ El formulario no validaba (aceptaba CO₂ negativo o nombre vacío).
- ⚠️ Si el borrado fallaba, el error reemplazaba toda la lista (usaba `FETCH_ERROR`).
- ⚠️ Sin Supabase configurado la app quedaba en blanco → difícil de evaluar.

---

## Prompt 4 · Robustez y UX profesional

> Partiendo de la v3, aplica estas mejoras sin romper las restricciones del prompt anterior:
>
> 1. **Optimistic UI:** al enviar, inserta una fila temporal (`id: temp-…`) y reemplázala por la real; si falla, haz *rollback* y muestra el error en el formulario. Lo mismo al eliminar (restaura la fila si falla).
> 2. **Errores no bloqueantes:** los errores de inserción/borrado van a `submitError` y nunca ocultan la lista; los errores de carga muestran un botón "Reintentar".
> 3. **Validación del formulario:** nombre 3–120 caracteres, CO₂ > 0 y ≤ 1.000.000, acepta coma decimal; enfoca el primer campo inválido.
> 4. **Feedback visual:** skeletons durante la carga, spinner en el botón, estado vacío ilustrado, resumen con totales y porcentaje por categoría, filtro por categoría (memoizado).
> 5. **Responsive:** 1 columna en móvil, 2 en tablet, 3 + panel lateral fijo en escritorio.
> 6. **Modo demo:** si no hay variables `VITE_SUPABASE_*`, usa un repositorio en memoria con latencia simulada y un error forzado cuando el nombre contiene "error", para poder demostrar todos los estados.

### Resultado final (v4)

Ver código fuente en `src/`. Fragmento de la actualización optimista con rollback:

```ts
case 'SUBMIT_START':
  return { ...state, isSubmitting: true, submitError: null,
           items: [action.optimistic, ...state.items] };
case 'SUBMIT_SUCCESS': {
  // Reemplaza la temporal por la real; evita duplicado si realtime llegó primero
  const rest = state.items.filter(i => i.id !== action.tempId && i.id !== action.saved.id);
  return { ...state, isSubmitting: false, items: [action.saved, ...rest].sort(byDateDesc) };
}
case 'SUBMIT_ERROR':
  return { ...state, isSubmitting: false, submitError: action.error,
           items: state.items.filter(i => i.id !== action.tempId) };   // rollback
```

**Ajuste manual posterior:** detecté que el borrado fallido seguía usando `FETCH_ERROR` y ocultaba la lista; agregué la acción `SET_SUBMIT_ERROR` para que el error sea no bloqueante.

---

## Evolución del código (v1 → v4)

| Aspecto | v1/v2 (primer intento) | v4 (final) |
|---|---|---|
| Tipado de categoría | `string` | Unión literal derivada de `as const` + type guard |
| Acceso a datos | `supabase` dentro del hook | Patrón Repository inyectable (Supabase / demo) |
| Estado | 3 `useState` sueltos | `useReducer` + unión discriminada + `switch` exhaustivo |
| Concurrencia | Closure obsoleto, sin cancelación | Actualizaciones funcionales vía reducer + `AbortController` |
| Tiempo real | No | Suscripción `postgres_changes` con deduplicación |
| Rendimiento | Todo se re-renderiza | `React.memo`, `useCallback`, `useMemo` (totales y filtro) |
| Errores | Un solo `error` que tapa todo | Carga (con "Reintentar") vs. acción (no bloqueante, descartable) |
| UX | Texto "Cargando…" | Skeletons, spinner, optimistic UI, estado vacío, toast `aria-live` |
| Accesibilidad | Ninguna | Labels, `aria-invalid`, `aria-describedby`, `role="alert"`, `aria-busy`, `aria-pressed`, foco visible |
| Validación | Ninguna | Cliente (formulario) + servidor (`CHECK` en SQL) |
| Responsive | No | 1 / 2 / 3 columnas + panel lateral sticky |

## Lecciones aprendidas

1. **Dar contexto técnico concreto** (columnas, tipos, restricciones) produce código mucho más cercano al objetivo que pedir "un dashboard".
2. **La IA no respeta siempre las restricciones** (en el prompt 2 ignoró la inyección del repositorio): hay que revisar y re-promptear citando el problema exacto.
3. **Enumerar los defectos encontrados** dentro del siguiente prompt es la técnica más efectiva del ciclo.
4. **Pedir explicaciones** ("explica qué re-renders evitas") obliga a la IA a justificar decisiones y facilita detectar errores.
5. **La revisión humana sigue siendo necesaria:** el último bug (error de borrado bloqueante) lo encontré probando la app, no la IA.
