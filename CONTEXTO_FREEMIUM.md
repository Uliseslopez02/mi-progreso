# Mi Progreso — Estrategia de límites Free / Pro (freemium)

Documento de diseño. Define **qué se limita, cuánto, por qué, dónde aparece el mensaje
de upgrade y cómo se implementa** — antes de tocar código. Complementa
`CONTEXTO_MONETIZACION.md` (que ya dejó armado el cobro por Mercado Pago y el gating de IA).

> **Estado:** implementado (frontend + backend). Ver sección 13 al pie para el
> detalle de archivos. Falta sólo aplicar la migración `0024` en Supabase.
> **Sección 13.1** documenta una segunda pasada (2026-09-15) que ajustó varios
> números hacia abajo — este documento ya refleja los definitivos.

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
   → **Gratis con límite: 1 de cada uno.** Casi nadie los usa al principio, así que
   con 1 se alcanza a probar la función entera (crear, marcar, verla en Hoy). El
   segundo ya es organización deliberada de un tramo más largo — Pro.

3. **Hábitos** (`Goal`, `trackingKind='habit'`)
   → **Gratis con límite: 3.** El consejo sano es "un hábito nuevo por vez"; 3 cubre
   los básicos más comunes (agua, moverse, dormir) sin dejar margen para "guardar"
   hábitos sin usarlos de verdad. Aprieta apenas la persona quiere armar un sistema
   por área (salud + estudio + trabajo), que es rápido si ya viene de Objetivos.

4. **Metas de vida** (`LifeGoal`, contamos las `status='active'`)
   → **Gratis con límite: 2 activas.** 2 metas activas es foco real (una personal,
   una profesional, por ejemplo). La 3.ª en paralelo ya es el perfil que persigue
   varias áreas a la vez — exactamente el que paga. Las completadas/abandonadas
   **no cuentan** (no castigamos el progreso).

5. **Proyectos activos** (`Project`, `status='active'`)
   → **Gratis con límite: 1 activo.** Con 1 proyecto se prueba el Kanban entero
   (columnas, tarjetas, arrastrar) sin límite de tareas — la experiencia no se siente
   corta. Querer un 2.º proyecto en paralelo es motivación de compra clara y llega
   rápido para cualquiera que use la app para más de una cosa a la vez.

6. **Tareas por proyecto** (`ProjectTask`)
   → **Gratis, sin límite.** Limitar tarjetas de un Kanban se siente roto. El valor de
   Pro ya está en "cuántos proyectos", no en "cuántas tarjetas".

7. **Rutinas** (`Routine`)
   → **Gratis con límite: 1.** Alcanza para probar el ritual completo (pasos, marcar,
   modo enfocado). La 2.ª rutina (el par matutina+nocturna, o sumar entrenamiento) ya
   es armar una estructura diaria más completa — ahí aparece Pro.

8. **Planificador semanal / Agenda** (`PlannerItem`)
   → **Gratis: semana actual + siguiente** (y semanas pasadas para consultar). **Pro:
   cualquier semana futura.** Planificar el mes que viene entero es señal de compromiso.
   Sin límite de cantidad de tareas por día (limitar eso se siente roto).

9. **Enfoque / Pomodoro** (`FocusSession`)
   → **Gratis, completo.** El timer no se toca. **Pro:** estadísticas de enfoque
   agregadas (minutos por semana, por tarea, tendencia) — hoy sólo muestra "hoy".

10. **Historial — rango** (`HistoryPage`)
    → **Free: 7 / 14 días. Pro: + 30 / 90 días + 1 año.** Ver la evolución de un mes
    entero ya es señal de uso retenido (mes 2+), uno de los momentos de mayor
    intención de compra. 7/14 días alcanza para el seguimiento de corto plazo sin
    sentirse roto. Los datos ya están guardados; sólo se desbloquea la vista.

11. **Mapa anual (heatmap 365 días)** (`HabitYearMapPage`)
    → **Free: últimas ~8 semanas (~2 meses) del heatmap visibles. Pro: año completo.**
    Mismo argumento que el rango de historial.

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
    → **Gratis con límite: 10.** Sigue siendo generoso — casi nadie lo toca — pero ya
    no es tan holgado como para no funcionar como límite "de red de seguridad" contra
    abuso; no es una palanca de conversión.

15. **Categorías** (`Category`)
    → **Gratis con límite: 6.** El seed trae 4. 6 sigue cubriendo cualquier
    organización razonable (más categorías = alguien con muchas áreas = perfil Pro),
    pero ya no regala tanto margen como 8.

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
| Objetivos semanales | 1 | Ilimitado* | Alcanza para probar la función; el 2.º ya es planificar a más largo plazo. |
| Objetivos mensuales | 1 | Ilimitado* | Ídem. |
| Hábitos | 2 | Ilimitado* | Con 2 se cubre el básico más común; armar un sistema por área ya pide Pro. |
| Metas de vida activas | 1 | Ilimitado* | 1 meta activa = foco real. La 2.ª en paralelo es el perfil que paga. |
| Proyectos activos | 1 | Ilimitado* | Con 1 se prueba el Kanban entero; el 2.º frente en paralelo = usuario comprometido. |
| Tareas por proyecto | Ilimitado | Ilimitado | Limitar tarjetas de un Kanban se siente roto. |
| Rutinas | 1 | Ilimitado* | Alcanza para probar el ritual completo; la 2.ª ya es estructurar el día entero. |
| Planificador — semanas | Actual + siguiente (pasado libre) | Cualquier semana | Planificar el mes entero = compromiso. |
| Tareas por día (agenda) | Ilimitado | Ilimitado | Limitar esto se siente roto. |
| Enfoque / Pomodoro | Completo | Completo + stats de enfoque | El timer no se limita nunca. |
| Historial — rango | 7 días | + 14 / 30 / 90 días + 1 año | Ver la evolución de un mes ya es señal de uso retenido (mes 2+); "quiero ver 2 semanas" pasa a ser el primer contacto con Premium. |
| Mapa anual | 4 semanas (~1 mes) | Año completo | Ídem. |
| Informe mensual | Mes actual, métricas núcleo | + meses anteriores + métricas avanzadas | Comparar evolución necesita historia. |
| Revisión mensual guiada | Completa (últimas 3 guardadas) | Completa + historial full | Herramienta de retención, no se limita. |
| Notas | 10 | Ilimitado* | Red de seguridad anti-abuso, no de conversión. |
| Categorías | 5 | Ilimitado* | El seed trae 4; 5 cubre cualquier caso normal sin regalar de más. |
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
   → [2] quiere 2.º proyecto / 2.ª rutina / 3.ª meta     ← intención ALTA (organiza varias áreas)
   → MES 2:
   → [3] quiere ver historial > 14 días                  ← intención ALTA (muy retenido)
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
- botones de rango "30 días" / "90 días" / "1 año" en Historial,
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

Ejemplo (historial > 14 días):
> **Estás viendo los últimos 14 días**
> Con Pro ves tu progreso de los últimos 30, 90 días y del último año completo —
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
`· 4 / 5` (u otro límite, p. ej. `· 2 / 3` en hábitos) y al llegar al tope se agrega
"· Pro para más". Antes del 80 % no se muestra nada.

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
2. **Tu historia completa.** Progreso de los últimos 30, 90 días y del último año; el
   mapa anual entero.
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
  free:    { dailyGoals: 5, weeklyGoals: 1, monthlyGoals: 1, habits: 3,
             activeLifeGoals: 2, activeProjects: 1, routines: 1,
             notes: 10, categories: 6, plannerWeeksAhead: 1 },
  premium: { /* mismas claves, Number.POSITIVE_INFINITY salvo topes técnicos */ },
} as const

export const LIMIT_COPY: Record<LimitKey, { title: string; body: string }> // para UpgradeCard
export function limitFor(plan, key): number
export function isAtLimit(plan, key, currentCount): boolean
export function historyRangesFor(plan): number[]          // [7,14] | [7,14,30,90,365]
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
| `HistoryPage` | rangos 30 / 90 / 365 → `ProBadge`, click abre `UpgradeCard` inline |
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
| El contador `n/límite` genera ansiedad | Sólo se muestra a partir del 80 % del límite y con tono neutro. |
| Backend rechaza un guardado legítimo y el usuario pierde cambios | La regla sólo rechaza aumentos por encima del límite; el frontend ya frena antes; el banner de guardado ya existe. |

---

## 12. Resumen ejecutivo

- **Free** = rastreador completo para una etapa enfocada de la vida: 5 objetivos
  diarios, 3 hábitos, 2 metas, 1 proyecto, 1 rutina, historial de 14 días, informe
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

---

## 13.1 Segunda pasada: límites más estrictos (2026-09-15)

A pedido explícito ("limitá un poco más, con criterio"), se ajustaron hacia abajo los
límites que tenían demasiado margen para funcionar como palanca de conversión real,
manteniendo el principio de la sección 1 (cada función se puede probar entera al menos
una vez en Free antes de pedir upgrade). **No se tocó `dailyGoals` (sigue en 5)** por ser
el límite principal, decidido explícitamente al arrancar este trabajo.

| Función | Antes | Ahora | Por qué se ajustó |
| --- | --- | --- | --- |
| Objetivos semanales / mensuales | 2 c/u | **1 c/u** | Con 2 casi nadie llegaba a sentirlo; 1 alcanza para probar la función. |
| Hábitos | 5 | **3** | 5 dejaba armar un sistema completo sin fricción; 3 cubre los básicos y deja sentir el límite antes. |
| Metas activas | 3 | **2** | 2 sigue siendo foco real (ver principio); la 3.ª ahora es la señal de "varias áreas a la vez". |
| Proyectos activos | 2 | **1** | Con 1 se prueba el Kanban entero igual de bien; el 2.º proyecto es una motivación de compra más nítida y más temprana. |
| Rutinas | 2 | **1** | Con 1 se prueba el ritual completo; antes el par matutina+nocturna nunca llegaba a apretar. |
| Notas | 15 | **10** | Sigue siendo "red de seguridad", no conversión — pero ya no regala tanto margen. |
| Categorías | 8 | **6** | El seed trae 4; 6 sigue alcanzando para cualquier organización razonable. |
| Historial (rango) | 7/14/30 → 90/365 | **7/14 → 30/90/365** | Ver un mes completo pasó a ser Premium: es la señal de retención real (mes 2+), no algo que se necesite en la primera semana. |
| Mapa anual | ~13 semanas (~3 meses) | **~8 semanas (~2 meses)** | Mismo argumento que el historial. |

Sin cambios: `plannerWeeksAhead` (sigue en 1 — cortarlo a 0 impediría planificar el día
de mañana si cae en la semana siguiente, y eso sí se sentiría roto), el gating de
Informes (ya era completo vs. avanzado, no una cuestión de cantidad), IA (3/mes, fuera
de alcance de este trabajo) y todo lo que ya estaba sin límite (tareas por proyecto,
tareas por día, personalización, backup, revisión mensual guiada).

Archivos tocados en este ajuste: `src/domain/plan.ts` (`PLAN_LIMITS`, `FREE_HISTORY_RANGES`,
`FREE_YEAR_MAP_WEEKS`, `LIMIT_COPY`), `supabase/migrations/0024_plan_limits.sql`
(números en `enforce_free_plan_limits`, **todavía no aplicada en Supabase** — se edita en
el archivo sin necesidad de una migración nueva), `src/components/PlanComparison.tsx`,
`src/__tests__/plan.test.ts`. Ningún componente de página necesitó cambios de código: los
contadores y copys ya leían de `plan.ts` dinámicamente.

`0024_plan_limits.sql` ya está aplicada en producción (ver `CONTEXTO_PENDIENTES_FREEMIUM.md`).

## 13.2 Tercera pasada: límites y trial reverso de 14 días (2026-09-16)

Contexto de negocio: "creo que la versión gratis es suficiente... muchos se van a quedar
con esa versión". Se evaluó reemplazar el freemium por un modelo de trial puro (matar el
free tier) y se descartó — en una app de hábitos el valor se siente recién en el mes 2-3
(sección 4); un trial puro corta a la gente justo antes de engancharse y pierde el boca a
boca del free tier. Decisión final, confirmada por el usuario ("hacelo"): apretar un poco
más los límites Free **y además** sumar un trial reverso de 14 días.

| Límite | Antes (2da pasada) | Ahora (3ra pasada) | Por qué |
| --- | --- | --- | --- |
| Objetivos diarios | 5 | **5 (sin cambio)** | Límite principal, ya decidido explícitamente. |
| Objetivos semanales / mensuales | 1 | **1 (sin cambio)** | Ya está en el piso; bajar a 0 elimina la función. |
| Hábitos | 3 | **2** | Con 3 se armaba un sistema completo sin sentir nunca el límite. |
| Metas de vida activas | 2 | **1** | Con 1 se prueba toda la función; la 2da en paralelo es el perfil que paga. |
| Proyectos activos | 1 | **1 (sin cambio)** | Ya está en el piso. |
| Rutinas | 1 | **1 (sin cambio)** | Ya está en el piso. |
| Notas | 10 | **10 (sin cambio)** | Red de seguridad anti-abuso, no palanca de conversión. |
| Categorías | 6 | **5** | El seed trae 4; 5 sigue alcanzando sin regalar margen extra. |
| Historial | 7 / 14 días | **sólo 7 días** | "Quiero ver 2 semanas" pasa a ser el primer contacto con Premium. |
| Mapa anual (heatmap) | ~8 semanas (~2 meses) | **4 semanas (~1 mes)** | Mismo criterio que historial. |
| Planificador (semanas adelante) | 1 | **1 (sin cambio)** | Bajar a 0 se siente roto (anti-objetivo: no degradar la UI). |
| IA | 3/mes | **3/mes (sin cambio)** | Fuera de alcance de esta pasada. |

**Trial reverso (`TRIAL_DAYS = 14`, sin tarjeta):** toda cuenta nueva arranca con Premium
completo al registrarse y cae a Free automáticamente al vencer. Como el grandfathering
existente (sección 6) nunca borra nada y sólo bloquea *agregar* de más, alguien que en el
trial armó 6 objetivos diarios o 2 metas activas se encuentra con avisos de upgrade reales
(generados por su propio uso), no con un paywall inventado. No se aplica retroactivamente
a cuentas ya existentes: siguen resolviendo a `'free'` exactamente igual que antes.

Implementación: `supabase/migrations/0025_free_trial.sql` agrega `get_effective_plan(uid)`
(lee `subscriptions.status`/`trial_end` y devuelve `'premium'` si hay suscripción activa o
trial vigente, `'free'` en cualquier otro caso incluida cuenta sin fila) y actualiza
`handle_new_user()` para crear la fila de `subscriptions` en `'trial'` con
`trial_end = now() + 14 days`. `enforce_free_plan_limits` pasa a resolver el plan con
`get_effective_plan` en vez de leer `profiles.plan` directo. En el frontend,
`src/domain/plan.ts` suma `isTrialActive`/`daysLeftInTrial`, y
`supabaseRepository.getUserPlan`/`getSubscriptionSummary` llaman al RPC
`get_effective_plan` en vez de leer `profiles.plan` — como todo el gating de la app ya lee
`state.plan` (poblado una sola vez desde `getUserPlan()`), el trial se trata como Premium
en toda la UI sin tocar un componente más. Única UI nueva: una tarjeta en `/premium`
(`PremiumPage.tsx`) que muestra los días restantes de trial — sin banner global, por el
anti-objetivo de la sección 5.

Archivos tocados: `src/domain/plan.ts`, `supabase/migrations/0025_free_trial.sql`,
`src/domain/types.ts` (`SubscriptionSummary.trialEnd`), `src/storage/supabaseRepository.ts`,
`src/storage/memoryRepository.ts`, `src/storage/localStorageRepository.ts`,
`src/pages/PremiumPage.tsx`, `src/components/PlanComparison.tsx` (texto del mapa anual
dejó de estar hardcodeado), `src/pages/HistoryPage.tsx` (el rango inicial de 14 días
quedó inválido para Free con `FREE_HISTORY_RANGES = [7]`; ahora arranca en el rango
permitido más alto, `14` para Premium y `7` para Free), `src/__tests__/plan.test.ts`,
`src/__tests__/premiumPage.test.tsx`, `src/__tests__/premiumConfirmationPage.test.tsx`,
`src/__tests__/app.test.tsx`.
