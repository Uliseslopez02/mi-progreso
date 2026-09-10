# Mi Progreso — Estrategia de límites Free / Pro (freemium)

Documento de diseño. Define **qué se limita, cuánto, por qué, dónde aparece el mensaje
de upgrade y cómo se implementa** — antes de tocar código. Complementa
`CONTEXTO_MONETIZACION.md` (que ya dejó armado el cobro por Mercado Pago y el gating de IA).

> **Estado:** implementado (frontend + backend). Ver sección 13 al pie para el
> detalle de archivos. Falta sólo aplicar la migración `0024` en Supabase.

---

## 0. Punto de partida (lo que ya existe)

- `profiles.plan` = `'free' | 'premium'`, sincronizado desde `subscriptions.status`
  por trigger. Se lee en toda la app vía `useAppData().plan` / `state.plan`.
- **Único límite hoy:** IA (3 usos/mes en Free), aplicado de verdad en el backend
  (`increment_ai_usage()` en `0023_subscriptions.sql`). El frontend nunca es la única barrera.
- `PremiumPage` + checkout de Mercado Pago funcionando. `src/domain/analytics.ts` con
  eventos de funnel (sin proveedor real todavía, sólo `console.debug`).
- Persistencia: **todo el `AppData` viaja como un blob** en cada guardado (RPC
  `save_app_data`, upsert + delete-diff, con debounce de 800 ms).
- Todo el historial (`data.days`) **siempre se guarda entero**. Las pantallas de
  historial/informes sólo cambian qué ventana muestran — no hay borrado de datos viejos.

### Decisión de nombre

La app ya usa **"Premium"** en producción (pantalla `/premium`, copy, entrada en Ajustes,
eventos de analytics, columna `plan_tier`). Este documento usa **"Pro"** sólo como
etiqueta corta en la matriz; **la recomendación es mantener "Premium" como nombre visible**
para no reescribir la pantalla de pago ni romper URLs/analytics. (Si se prefiere migrar
a "Pro", es un find-and-replace acotado + un redirect `/pro → /premium`.)

---

## 1. Principio rector

> **Free = un rastreador de vida completo para una etapa "simple".
> Pro = capacidad para todas tus áreas a la vez + profundidad histórica + IA + potencia.**

El usuario Free tiene que poder:
- hacer el onboarding entero,
- registrar su día, sus hábitos y su primera meta,
- ver su racha, su nota, su historial reciente y su informe del mes,
- exportar sus datos cuando quiera.

El límite **no se siente el día 1**. Se siente cuando la persona ya incorporó el hábito
y quiere pasar de "trackeo mi entrenamiento" a "organizo entrenamiento + trabajo +
estudio + finanzas + proyectos personales". Ese salto es el momento de compra.

**Anti-objetivos** (explícitos del pedido): nada de popups repetidos, nada de banners
"COMPRÁ PRO", nada de degradar la UI, nada de mensajes tipo "vas a perder tu progreso".

---

## 2. Inventario de funcionalidades y decisión para cada una

Rutas reales (de `src/App.tsx` + `src/domain/navigation.ts`):

| Sección | Sub-pantallas | Entidad de datos |
| --- | --- | --- |
| **Hoy** (`/`) | dashboard, objetivos del día, objetivos semana/mes, racha, prioridad | `DayRecord`, `PeriodRecord` |
| **Agenda** | Día, Mes, Planificador semanal, Enfoque (Pomodoro) | `PlannerItem`, `FocusSession` |
| **Proyectos** (`/proyectos`) | lista + Kanban por proyecto | `Project`, `ProjectTask` |
| **Objetivos** | Hábitos, Metas, Rutinas, Editar (objetivos diarios) | `Goal` (habit/goal), `LifeGoal`, `Routine` |
| **Historial** | Resumen (rango 7/14/30/90), Calendario, Mapa anual, Notas | `data.days`, `Note` |
| **Informes** | Informe mensual (~15 métricas), Revisión mensual guiada | derivado + `Reflection` |
| **Ajustes** | nombre, racha, categorías + colores, orden de nav, backup, borrar | `Settings`, `Category` |

Pantallas sin ruta montada (fuera de alcance): Momento Mori, Matriz de Eisenhower.

### Análisis por funcionalidad

Para cada una: ¿gratis? ¿con límite? ¿sólo Pro? ¿básica gratis + avanzada Pro? ¿qué límite? ¿por qué? ¿cuándo se percibe el valor de Pro?

1. **Objetivos diarios** (`Goal`, `trackingKind='goal'`, `period='daily'`)
   → **Gratis con límite: 5.** Es el límite principal. 5 objetivos diarios alcanzan
   para una vida enfocada ("salud + trabajo + una cosa personal"). El valor de Pro
   aparece cuando la persona quiere sumar áreas (estudio, finanzas, entrenamiento
   específico, proyectos) y necesita el 6.º, 7.º, 8.º.

2. **Objetivos semanales / mensuales** (`Goal`, `period='weekly'|'monthly'`)
   → **Gratis con límite: 2 de cada uno.** Mismo mecanismo que los diarios; casi nadie
   los usa al principio, así que el límite es holgado y no molesta. Se percibe Pro
   junto con el de diarios.

3. **Hábitos** (`Goal`, `trackingKind='habit'`)
   → **Gratis con límite: 5.** El consejo sano es "un hábito nuevo por vez", pero la
   gente trackea 4-5 básicos (agua, moverse, dormir, leer). 5 no aprieta el primer mes.
   Aprieta cuando arma un "sistema" de hábitos por área.

4. **Metas de vida** (`LifeGoal`, contamos las `status='active'`)
   → **Gratis con límite: 3 activas.** 3 metas activas = foco real. Perseguir
   carrera + salud + finanzas + un proyecto creativo a la vez es exactamente el perfil
   que paga. Las metas completadas/abandonadas **no cuentan** (no castigamos el progreso).

5. **Proyectos activos** (`Project`, `status='active'`)
   → **Gratis con límite: 2 activos.** Con 1 no se puede ni entender el tablero; con 2
   se prueba de verdad. El límite pega al querer llevar 3+ frentes (mudanza + side
   project + estudio). Proyectos archivados/completados no cuentan.

6. **Tareas por proyecto** (`ProjectTask`)
   → **Gratis, sin límite.** Limitar tarjetas de un Kanban se siente roto. El valor de
   Pro ya está en "cuántos proyectos", no en "cuántas tarjetas".

7. **Rutinas** (`Routine`)
   → **Gratis con límite: 2.** Matutina + nocturna es el par canónico. La 3.ª
   (entrenamiento, trabajo) es comportamiento de usuario comprometido.

8. **Planificador semanal / Agenda** (`PlannerItem`)
   → **Gratis: semana actual + siguiente** (y semanas pasadas para consultar). **Pro:
   cualquier semana futura.** Planificar el mes que viene entero es señal de compromiso.
   Sin límite de cantidad de tareas por día (limitar eso se siente roto).

9. **Enfoque / Pomodoro** (`FocusSession`)
   → **Gratis, completo.** El timer no se toca. **Pro:** estadísticas de enfoque
   agregadas (minutos por semana, por tarea, tendencia) — hoy sólo muestra "hoy".

10. **Historial — rango** (`HistoryPage`)
    → **Free: 7 / 14 / 30 días. Pro: + 90 días + 1 año.** Nadie mira "hace 3 meses" en
    su primera semana. Cuando lo querés mirar, ya llevás meses usando la app = súper
    retenido = alta intención. Los datos ya están guardados; sólo se desbloquea la vista.

11. **Mapa anual (heatmap 365 días)** (`HabitYearMapPage`)
    → **Free: últimos ~90 días del heatmap visibles. Pro: año completo.** Mismo
    argumento que el rango de historial.

12. **Informe mensual** (`InformesPage`)
    → **Básico gratis + avanzado Pro.**
    - **Free:** informe del **mes actual** con métricas núcleo (cumplimiento del mes,
      mejor/peor día, racha, días perfectos, gráfico de evolución del mes).
    - **Pro:** meses anteriores (comparar evolución mes a mes) + métricas avanzadas
      (mejor día de la semana, objetivo más consistente / más difícil, categoría a
      reforzar, planificado vs. realizado, delta vs. mes anterior).
    El valor de Pro aparece en el mes 2, cuando hay algo con qué comparar.

13. **Revisión mensual guiada** (`MonthlyReviewPage`)
    → **Gratis, completa.** Es una herramienta de hábito/retención, no se limita.
    (Opcional Pro: historial completo de revisiones anteriores; Free ve las últimas 3.)

14. **Notas** (`Note`)
    → **Gratis con límite: 15.** Holgado; casi nadie lo toca. Es un límite "de red de
    seguridad" contra abuso, no de conversión.

15. **Categorías** (`Category`)
    → **Gratis con límite: 8.** El seed trae 4. 8 cubre cualquier organización
    razonable; más categorías = alguien con muchas áreas = perfil Pro.

16. **Personalización** (nombre de la app, orden de pestañas, colores de categoría)
    → **Gratis, sin límite.** Es cosmético y barato; esconderlo se siente mezquino.

17. **Backup export / import** (`SettingsPage → Datos`)
    → **Gratis, sin límite, siempre.** El usuario nunca es rehén de sus datos. Esto
    además **baja** la fricción de probar Pro ("si no me sirve, me llevo todo").

18. **IA** (sugerencias de hábitos + insights de historial)
    → **Ya implementado: 3/mes Free, ilimitado Pro.** Se mantiene igual.

---

## 3. Matriz Free vs Pro

| Función | FREE | PRO | Motivo del límite |
| --- | --- | --- | --- |
| Objetivos diarios | **5** | Ilimitado* | Límite principal. 5 = una etapa enfocada; sumar áreas de la vida lo supera solo. |
| Objetivos semanales | 2 | Ilimitado* | Mismo mecanismo; holgado, no molesta al inicio. |
| Objetivos mensuales | 2 | Ilimitado* | Ídem. |
| Hábitos | **5** | Ilimitado* | Los básicos entran en 5; el "sistema" de hábitos por área no. |
| Metas de vida activas | 3 | Ilimitado* | 3 metas activas = foco. Perseguir muchas a la vez es el perfil que paga. |
| Proyectos activos | 2 | Ilimitado* | Con 2 se prueba el Kanban; 3+ frentes = usuario comprometido. |
| Tareas por proyecto | Ilimitado | Ilimitado | Limitar tarjetas de un Kanban se siente roto. |
| Rutinas | 2 | Ilimitado* | Matutina + nocturna gratis; la 3.ª es power-user. |
| Planificador — semanas | Actual + siguiente (pasado libre) | Cualquier semana | Planificar el mes entero = compromiso. |
| Tareas por día (agenda) | Ilimitado | Ilimitado | Limitar esto se siente roto. |
| Enfoque / Pomodoro | Completo | Completo + stats de enfoque | El timer no se limita nunca. |
| Historial — rango | 7 / 14 / 30 días | + 90 días + 1 año | "Hace 3 meses" recién importa cuando llevás meses. |
| Mapa anual | ~90 días | Año completo | Ídem. |
| Informe mensual | Mes actual, métricas núcleo | + meses anteriores + métricas avanzadas | Comparar evolución necesita historia. |
| Revisión mensual guiada | Completa (últimas 3 guardadas) | Completa + historial full | Herramienta de retención, no se limita. |
| Notas | 15 | Ilimitado* | Red de seguridad anti-abuso, no de conversión. |
| Categorías | 8 | Ilimitado* | El seed trae 4; 8 cubre cualquier caso normal. |
| Personalización (nombre, orden, colores) | Sí | Sí | Cosmético; esconderlo es mezquino. |
| Backup export / import | Sí | Sí | Nadie es rehén de sus datos. Baja la fricción de probar Pro. |
| IA (sugerencias + insights) | 3 / mes | Ilimitado | Ya implementado. |

`*` "Ilimitado" tiene un tope técnico silencioso (p. ej. 100) para que nadie rompa el
blob de guardado por accidente o abuso — nunca se comunica como límite.

---

## 4. Momentos de conversión (recorrido → intención de compra)

```
REGISTRO → ONBOARDING → PRIMER DÍA → USO DIARIO (racha) → arma su sistema
   → [1] toca el límite de 5 objetivos diarios          ← intención MEDIA-ALTA
   → [2] quiere 3.er proyecto / 3.ª rutina / 4.ª meta    ← intención ALTA (organiza varias áreas)
   → MES 2:
   → [3] quiere ver historial > 30 días                  ← intención ALTA (muy retenido)
   → [4] quiere comparar el informe con el mes pasado    ← intención ALTA
   → [5] agota los 3 usos de IA del mes                  ← intención MEDIA (ya implementado)
```

**Regla:** no se vende Pro antes de `[1]`. Onboarding, primer día y primera meta están
100% libres de mención a Pro. El primer contacto con "Pro" es contextual, en el momento
`[1]`, y **explica un beneficio**, no bloquea con culpa.

Los momentos `[3]` y `[4]` (mes 2) son los de mayor intención: la persona ya demostró
retención. Ahí el mensaje puede ser un poco más presente (una fila "Con Pro ves tu
evolución mes a mes" dentro del informe, no un popup).

---

## 5. Paywalls inteligentes — dónde y cómo

Tres formatos, de menos a más intrusivo:

### a) `<ProBadge>` — etiqueta pasiva
Una lozenge chiquita "Pro" al lado de un control bloqueado. No hace nada al montarse
(no dispara analytics de "paywall viewed", no ocupa espacio). Ejemplos:
- botones de rango "90 días" / "1 año" en Historial,
- filas de métricas avanzadas del informe,
- selector de semanas futuras lejanas en el Planificador.

### b) `<UpgradeCard>` — tarjeta contextual (reemplaza `AiUpsellCard`, generalizada)
Aparece **en lugar de la acción**, sólo cuando el usuario **intenta** hacer algo que
supera el límite. Nunca antes. Copy orientado a valor. Un solo botón "Ver Pro".
Dispara `track({ name: 'limit_reached', limit })`.

Ejemplo (límite de objetivos diarios), al tocar "Agregar" con 5 ya creados:
> **Llegaste a 5 objetivos diarios**
> Es un buen número para mantener el foco. Cuando quieras organizar más áreas de tu
> día —trabajo, estudio, entrenamiento— Pro te deja sumar todos los que necesites.
> `[ Ver Pro ]`

Ejemplo (historial > 30 días):
> **Estás mirando los últimos 30 días**
> Con Pro podés ver tu progreso de los últimos 90 días y del último año completo —
> tus datos ya están guardados, sólo se desbloquea la vista.
> `[ Ver Pro ]`

Ejemplo (informe, mes anterior):
> **Este es tu informe de {mes actual}**
> Pro suma los informes de los meses anteriores y las métricas que comparan tu
> evolución mes a mes.
> `[ Ver Pro ]`

### c) `PremiumPage` (`/premium`) — la única pantalla de venta
Se le agrega una **tabla comparativa Free vs Pro** generada desde `src/domain/plan.ts`
(fuente única). Se llega ahí sólo por: la entrada de Ajustes, un botón "Ver Pro" de una
`UpgradeCard`, o el `<ProBadge>` al tocarlo.

### Contador de capacidad (informativo, no alarmante)
En las cabeceras que ya muestran "N activos de M" (Editar objetivos, Hábitos, etc.),
para usuarios Free y **sólo a partir del 80 % del límite**, se agrega un sufijo tenue:
`· 4 / 5` y al llegar `· 5 / 5 · Pro para más`. Antes del 80 % no se muestra nada.

### Lo que NO se hace
- No hay banner global ni nada en la barra de navegación.
- No hay popup modal que interrumpa (todas son tarjetas inline en el flujo).
- No se repite el mensaje: si ya vio la `UpgradeCard` de un límite hoy, sigue ahí
  mientras esté al límite, pero no aparece un segundo aviso.
- Nada bloquea **editar, reordenar, completar o borrar** lo que ya existe — sólo
  **crear de más**.

---

## 6. Grandfathering (usuarios que ya superan un límite)

Crítico: la cuenta real de Ulises y el seed de ejemplo (`createInitialData`) tienen
**11 objetivos diarios**. Un usuario que baja de Pro a Free también puede quedar por
encima. Regla única:

> El límite bloquea **agregar** cuando `cantidad_actual >= límite`.
> Nunca borra, oculta ni deshabilita nada que ya exista. Nunca hace fallar un guardado
> de datos que no aumentan la cantidad.

Es decir: si tenés 11 y el límite es 5, seguís viendo y editando tus 11; al tocar
"Agregar" ves la `UpgradeCard`. Si borrás hasta 4, podés volver a agregar hasta 5.

---

## 7. Onboarding y el límite de 5

El wizard de onboarding hoy deja elegir cualquier cantidad de objetivos (recomienda
≤ 8, `RECOMMENDED_MAX_GOALS`). Un usuario nuevo Free podría terminar el onboarding con
8 objetivos y sentir que "ya nace limitado".

**Propuesta (a confirmar):** bajar `RECOMMENDED_MAX_GOALS` a **5** y, para Free, hacer
el 5 un tope real en el paso de objetivos, con copy de producto (no de paywall):

> Con el plan gratuito arrancás con 5 objetivos diarios — es el número que mejor
> funciona para sostener el hábito. Vas a poder sumar más cuando quieras.

Así el "5" se lee como **consejo de la app** ("empezá con pocos"), no como un muro. El
usuario que de verdad necesita más lo descubre cuando su uso crece, no en el minuto 2.

Alternativa más blanda: dejar que el onboarding supere 5 con una advertencia no
bloqueante y aplicar grandfathering. Menos abrupto el día 1, pero el "5" pierde fuerza
como número de referencia.

---

## 8. Trial de Pro — recomendación

**Para v1: NO incluir trial automático.** Razones:
- El producto es barato (~US$3/mes). Un trial de 14 días con tarjeta agrega fricción de
  cobro que no se justifica a este precio.
- Un trial al registrarse se "gasta" antes de que la persona entienda el valor
  (contradice el principio rector).
- Los límites propuestos son holgados: el primer contacto con un muro real llega
  cuando ya hay hábito formado. Ahí una buena `UpgradeCard` convierte mejor que un
  trial vencido.

**Para v2 (si los números lo piden):** un botón **"Probar Pro 14 días gratis"** en la
`UpgradeCard` y en `PremiumPage`, **sin tarjeta**, una sola vez por cuenta:
- Se marca `subscriptions.status='trial'` + `trial_end` (columnas ya existen en
  `0023_subscriptions.sql`).
- El trigger `sync_profile_plan` debe pasar a contar `'trial'` como premium (hoy sólo
  cuenta `'active'`) — cambio de una línea.
- Al vencer: `status` vuelve a `'free'`; se aplica grandfathering (todo sigue visible y
  editable, sólo no podés agregar de más). Un aviso único y calmo: "Terminó tu prueba
  de Pro. Todo tu progreso sigue acá."
- Comunicación: al activarlo, tarjeta de bienvenida con las 3 cosas que se desbloquean.
  A 3 días del final, un aviso contextual (no email todavía — está fuera de alcance).

---

## 9. Concepto del Plan Pro

**Nombre visible:** "Premium" (se mantiene el actual).

**Propuesta de valor (una frase):**
> Mi Progreso Premium es para cuando una sola parte de tu vida ya no alcanza.

**Los 4 pilares (para `PremiumPage` y la tabla comparativa):**
1. **Sin límites de capacidad.** Todos los objetivos, hábitos, proyectos, rutinas y
   metas que necesites para organizar todas tus áreas a la vez.
2. **Tu historia completa.** Progreso de los últimos 90 días y del último año; el mapa
   anual entero.
3. **Informes que comparan.** Tu evolución mes a mes y las métricas avanzadas que
   muestran qué reforzar.
4. **IA sin tope.** Sugerencias e insights las veces que quieras.

Precio y checkout: **sin cambios** (`CONTEXTO_MONETIZACION.md`, Mercado Pago, labels por
env var).

---

## 10. Implementación técnica

Reutiliza la arquitectura actual. **No** crea tablas nuevas ni cambia el modelo de datos.

### 10.1 `src/domain/plan.ts` (nuevo — funciones puras, con tests)

Fuente única de verdad:

```ts
export const PLAN_LIMITS = {
  free:    { dailyGoals: 5, weeklyGoals: 2, monthlyGoals: 2, habits: 5,
             activeLifeGoals: 3, activeProjects: 2, routines: 2,
             notes: 15, categories: 8, plannerWeeksAhead: 1 },
  premium: { /* mismas claves, Number.POSITIVE_INFINITY salvo topes técnicos */ },
} as const

export const LIMIT_COPY: Record<LimitKey, { title: string; body: string }> // para UpgradeCard
export function limitFor(plan, key): number
export function isAtLimit(plan, key, currentCount): boolean
export function historyRangesFor(plan): number[]          // [7,14,30] | [7,14,30,90,365]
export function reportMonthsBackFor(plan): number         // 0 | 12
// contadores puros sobre AppData:
export function countDailyGoals(goals): number            // trackingKind!=='habit' && period==='daily'
export function countHabits(goals): number
export function countActiveLifeGoals(lifeGoals): number   // status==='active'
export function countActiveProjects(projects): number     // status==='active'
```

### 10.2 Componentes UI (nuevos, chicos)

- `src/components/ProBadge.tsx` — lozenge "Pro", opcional `onClick` → navega a `/premium`.
- `src/components/UpgradeCard.tsx` — tarjeta contextual. Recibe `limitKey`. Toma el copy
  de `LIMIT_COPY`, dispara analytics al montar, botón "Ver Pro".
- `AiUpsellCard.tsx` pasa a ser un wrapper delgado de `UpgradeCard` (o se reemplaza en
  sus 2 call sites — `HabitInsightsCard`, `HabitSuggestionModal`).
- CSS: `.pro-badge`, `.upgrade-card` en `src/styles/global.css` (usa tokens existentes,
  `--accent`, `--surface-2`, `--radius-sm`).

### 10.3 `src/domain/analytics.ts` — nuevos eventos

```ts
| { name: 'limit_reached'; limit: LimitKey }
| { name: 'upgrade_cta_clicked'; from: LimitKey | 'settings' | 'badge' }
```

### 10.4 Gating en frontend (bloquea sólo el "crear de más")

En cada handler de alta, si `isAtLimit(plan, key, count)` → mostrar `UpgradeCard` en
lugar de `dispatch`. Pantallas afectadas:

| Pantalla | Límite |
| --- | --- |
| `EditGoalsPage` | objetivos diarios / semanales / mensuales (según `newGoalPeriod`) |
| `HabitsPage` + `GoalsPage.confirmSuggestedHabits` | hábitos |
| `GoalsPage` | metas activas |
| `ProjectsPage` | proyectos activos |
| `RoutinesPage` | rutinas |
| `NotesPage` | notas |
| `SettingsPage` | categorías |
| `PlannerPage` / `DayAgendaPage` | límite de semanas hacia adelante |
| `HistoryPage` | rangos 90 / 365 → `ProBadge`, click abre `UpgradeCard` inline |
| `InformesPage` | navegación a meses anteriores + `Stat` avanzadas tras `plan==='premium'` |
| `HabitYearMapPage` | recorte de ventana del heatmap para Free |
| `FocusPage` | (v2) card de stats avanzadas |

### 10.5 Enforcement en backend — `supabase/migrations/0024_plan_limits.sql`

Sólo para las entidades **contables y con incentivo real de bypass**: objetivos
diarios, hábitos, metas activas, proyectos activos, rutinas. (Notas/categorías: sólo
frontend — abuso irrelevante.)

Se redefine `save_app_data` para, **después** de leer `profiles.plan`, aplicar por cada
entidad gateada la regla de grandfathering:

```
si plan = 'free'
   y  cantidad_entrante(entidad)  >  límite_free(entidad)
   y  cantidad_entrante(entidad)  >  cantidad_actual_en_db(entidad):
      raise exception 'plan_limit_exceeded:<entidad>'
```

Es decir: se rechaza el guardado **sólo si Free intenta aumentar por encima del límite**.
Guardar datos que no crecen (editar, reordenar, borrar, o simplemente estar
grandfathered) siempre pasa. El frontend ya frena antes, así que este error casi nunca
se ve; si se ve (devtools, request falsificado), `AppProvider` ya tiene el banner
"no pudimos guardar" y se puede mapear el código a un mensaje claro.

> **Cuidado de implementación:** `save_app_data` hoy no lee `profiles.plan`. Agregar
> `select plan into v_plan ...` al inicio. Mantener la función idempotente y en una
> sola transacción (ya lo es). No tocar el orden de upserts/deletes existente.

### 10.6 `PremiumPage.tsx`

- Agregar `<PlanComparisonTable>` (data de `plan.ts`).
- Actualizar `BENEFITS` a los 4 pilares de la sección 9.
- Checkout, cancelación y vista "ya sos Premium": **sin cambios**.

### 10.7 Tests

- `src/__tests__/plan.test.ts` — nuevo: `isAtLimit`, contadores, `historyRangesFor`, la
  regla de grandfathering.
- `src/__tests__/app.test.tsx` — el harness usa `createInitialData` (11 diarios) con
  plan `'free'`. Verificar los flujos que **agregan** objetivos/hábitos: o el test pasa
  a `plan: 'premium'` en el `createMemoryRepository`, o asserta la `UpgradeCard`.
  Confirmar que editar/borrar/completar los 11 existentes **sigue funcionando** (regla
  de grandfathering en el frontend).
- Migración 0024: bloque de verificación manual al pie (como en `0023`).

### 10.8 Orden de trabajo

1. `domain/plan.ts` + tests.
2. `ProBadge`, `UpgradeCard`, CSS, eventos de analytics.
3. Gating frontend pantalla por pantalla (empezando por objetivos diarios — el límite
   principal — y validando UX en cada una).
4. `PremiumPage` + tabla comparativa.
5. Migración `0024_plan_limits.sql` + aplicar en Supabase.
6. Ajuste de onboarding (`RECOMMENDED_MAX_GOALS` + tope Free) — según decisión sección 7.
7. Suite verde (`npm test`, `tsc -b`, `vite build`) + prueba manual en dev.
8. Commit(s) a `master` → deploy automático a Vercel.

---

## 11. Riesgos de UX y mitigaciones

| Riesgo | Mitigación |
| --- | --- |
| El seed de ejemplo (11 diarios) hace que un Free "de prueba" vea la card enseguida | Grandfathering: nunca bloquea lo existente. Además los signups reales usan `createEmptyData` + onboarding, no el seed. |
| El límite de 5 se siente mezquino si aparece en el onboarding | Copy de producto ("es el número que mejor funciona"), no de paywall. Decisión sección 7. |
| Usuario Pro que cancela y pierde acceso siente que "le rompieron la app" | Grandfathering + copy: "Todo tu progreso sigue acá, sólo no podés agregar más de X hasta volver a Pro." |
| Demasiados `ProBadge` = sensación de app llena de candados | Sólo en 2 lugares (rangos de historial, métricas de informe). El resto es `UpgradeCard` que aparece únicamente al intentar la acción. |
| El contador `5/5` genera ansiedad | Sólo se muestra a partir del 80 % del límite y con tono neutro. |
| Backend rechaza un guardado legítimo y el usuario pierde cambios | La regla sólo rechaza aumentos por encima del límite; el frontend ya frena antes; el banner de guardado ya existe. |

---

## 12. Resumen ejecutivo

- **Free** = rastreador completo para una etapa enfocada de la vida: 5 objetivos
  diarios, 5 hábitos, 3 metas, 2 proyectos, 2 rutinas, historial de 30 días, informe
  del mes, IA 3×/mes, backup siempre.
- **Pro** = todas tus áreas sin límite + historial de meses/año + informes comparativos
  + IA sin tope. Nombre visible: "Premium" (sin cambios).
- Los muros aparecen **sólo al intentar la acción**, con copy de valor, y **nunca**
  tocan lo que ya existe (grandfathering).
- Backend valida los límites contables (regla "sólo rechaza si Free aumenta por encima
  del tope"); el frontend frena antes.
- Sin trial automático en v1.
- Se construye sobre lo que ya hay: `profiles.plan`, `save_app_data`, `analytics.ts`,
  `PremiumPage`. Un archivo nuevo de dominio (`plan.ts`), dos componentes chicos, una
  migración.

---

## 13. Lo que se implementó (esta sesión)

Decisiones tomadas: tope de 5 en el onboarding · sin trial en v1 · matriz completa.

**Nuevos:**
- `src/domain/plan.ts` — fuente única: `PLAN_LIMITS`, `isAtLimit`, contadores,
  `historyRangesFor`, `yearMapWeeksFor`, `canOpenPlannerWeek`, `LIMIT_COPY`, `PRO_NAME`.
- `src/components/UpgradeCard.tsx` — aviso contextual (analytics `limit_reached` /
  `upgrade_cta_clicked`).
- `src/components/ProBadge.tsx` — etiqueta pasiva "Premium".
- `src/components/PlanComparison.tsx` — tabla Free vs Premium (data de `plan.ts`).
- `src/styles/global.css` — `.pro-badge`, `.upgrade-card`, `.plan-compare`.
- `supabase/migrations/0024_plan_limits.sql` — `enforce_free_plan_limits()` +
  `save_app_data` redefinida (regla de grandfathering). **Pendiente: aplicar en Supabase.**
- Tests: `src/__tests__/plan.test.ts`, `src/__tests__/upgradeCard.test.tsx`, +
  casos en `app.test.tsx`.

**Modificados (gating):** `EditGoalsPage` (objetivos diarios/semanales/mensuales),
`HabitsPage` + `GoalsPage` (hábitos, metas activas, cap del flujo de sugerencias IA),
`ProjectsPage`, `RoutinesPage`, `NotesPage`, `SettingsPage` (categorías),
`HistoryPage` (rangos 90/365), `InformesPage` (métricas avanzadas), `HabitYearMapPage`
(heatmap recortado), `PlannerPage` (semanas hacia adelante), `PremiumPage` (4 pilares +
tabla), `OnboardingWizard` + `onboardingCatalog` (`RECOMMENDED_MAX_GOALS` 8 → 5, tope
real para Free), `analytics.ts` (eventos nuevos).

**Verde:** `tsc -b`, `vite build`, 321/321 tests.

**Gotcha documentado:** el seed de ejemplo (`createInitialData`, botón "usar ejemplos"
del onboarding) tiene 11 objetivos diarios — un usuario Free que lo elige queda
grandfathered (ve y edita los 11, no puede agregar el 12.º). El wizard normal ya topea
en 5. No se tocó el seed para no rehacer la matemática de pesos ni romper tests de %.

**Edge conocido (no bloqueante):** multi-dispositivo + downgrade de Premium + podar por
debajo del límite en un dispositivo puede hacer que el otro (con estado viejo) reciba un
rechazo del backend hasta recargar. Muy improbable; el `hydrate` al recargar lo resuelve.
