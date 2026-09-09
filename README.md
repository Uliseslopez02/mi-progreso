# Mi Progreso

Tablero personal de progreso diario: objetivos con checkbox, porcentaje ponderado,
nota del día, historial, calendario y racha. Proyecto independiente (React + TypeScript + Vite).

```bash
npm install
npm run dev
```

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Chequeo de tipos + build de producción |
| `npm test` | Tests (Vitest + Testing Library) |
| `npm run lint` | ESLint |

## Cómo se calcula todo

- **Porcentaje**: `peso completado / peso total × 100`, siempre sobre los objetivos reales del día.
  Con todos los pesos en 1 equivale a "completados / total".
- **Nota**: el porcentaje mostrado dividido 10 (73% → 7,3). Nunca se contradicen entre sí.
- **Racha**: días consecutivos que llegaron al mínimo configurable (70% por defecto).
  Si hoy todavía no llegó, la racha se cuenta desde ayer, para no "perderla" a la mañana.
- **Semana**: promedio de lunes a hoy comparado contra la semana anterior completa.
- **Constancia**: por objetivo y por categoría, `días cumplidos / días en que el objetivo existía`.
  Un objetivo creado ayer no arrastra el castigo de los días en los que no existía.
- **Objetivos semanales/mensuales**: mismo mecanismo que los diarios (snapshot + completado),
  pero con ventana de una semana (lunes a domingo) o un mes. Tienen su propia tarjeta en
  "Hoy" y su propio porcentaje — no se mezclan con el cálculo del día ni con la nota.

Todo eso vive en `src/domain/` y son funciones puras, cubiertas por tests.

## Modelo de datos

```
AppData
├── settings   { appName, streakThreshold, allowEditingPastDays }
├── categories [{ id, name, order }]
├── goals      [{ id, name, categoryId, weight, active, period, order }]
└── days       { "2026-08-18": { goals: [snapshot], completedGoalIds, closed } }
```

Dos decisiones que sostienen el resto:

1. **Peso por objetivo.** El cálculo ya es ponderado; los objetivos por defecto usan pesos
   que suman 100 (así el % del día coincide exactamente con los puntos completados), pero
   cambiar cualquier peso desde Ajustes no requiere ningún cambio de código.
2. **Snapshot por día.** Cada día guarda una copia de los objetivos vigentes en ese momento.
   Si mañana renombro o elimino un objetivo, el historial de ayer sigue siendo exacto.

`period` ya contempla `weekly` y `monthly`: hoy la UI sólo crea objetivos `daily`, pero el
modelo y el snapshot filtran por período, así que agregar objetivos semanales o mensuales
no obliga a migrar datos.

## Persistencia

La UI sólo conoce la interfaz `ProgressRepository` (`src/storage/repository.ts`):

```ts
interface ProgressRepository {
  load(): Promise<AppData | null>
  save(data: AppData): Promise<void>
  clear(): Promise<void>
}
```

Hoy se usa `createLocalStorageRepository()` (los datos quedan en el navegador). Cuando exista
backend alcanza con escribir un `createHttpRepository()` que cumpla la misma interfaz y
cambiarlo en `src/main.tsx`: no hay que tocar componentes ni estado. La carga y el guardado
ya son asincrónicos justamente por eso.

Mientras tanto, **Ajustes → Datos** exporta e importa un JSON con todo (objetivos, historial,
ajustes). Es el respaldo y también la forma de mover los datos a otra PC o navegador. Al
importar se valida el archivo con la misma migración que usa el storage, así que un archivo
que no corresponde se rechaza en lugar de romper la app.

## PWA (app instalable)

La app es una PWA: se puede instalar en el móvil ("Agregar a pantalla de inicio" /
"Instalar app") y abre a pantalla completa, con ícono propio y arranque offline del
_shell_.

- Config: `vite-plugin-pwa` en `vite.config.ts` (manifest + service worker con Workbox).
- Iconos: `public/pwa-*.png` y `public/apple-touch-icon.png`, generados desde
  `public/logo.svg` con `npm run generate:icons` (script en `scripts/generate-icons.mjs`).
- El service worker sólo corre en build de producción. Para probarlo localmente:

  ```bash
  npm run build && npm run preview
  ```

  Luego, en Chrome, DevTools → Application → Manifest / Service Workers, o el botón
  "Instalar" de la barra de direcciones. En `vite dev` no se registra a propósito.
- Estrategia de caché: precache de JS/CSS/HTML/iconos + `NetworkFirst` para las lecturas
  `GET /rest/v1/` de Supabase (al reabrir sin conexión se ve el último estado). Los writes
  y `/auth/v1/` nunca se cachean. `/api/*` está excluido del fallback de navegación.
- `registerType: 'autoUpdate'`: al desplegar una versión nueva, el SW se actualiza solo y
  toma efecto en la siguiente navegación.

## Estructura

```
src/
├── domain/      cálculo puro: fechas, scoring, constancia, snapshot de día y período, defaults
├── storage/     repositorio (localStorage, memoria), migración y respaldo JSON
├── state/       reducer + provider (carga, guarda, detecta el cambio de día)
├── components/  anillo, lista de objetivos, gráfico, calendario, constancia, tarjetas
├── pages/       Hoy · Historial · Calendario · Ajustes
└── __tests__/   94 tests: cálculo, constancia, objetivos periódicos, fechas, respaldo y flujo
```
