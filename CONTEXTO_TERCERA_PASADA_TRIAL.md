# Mi Progreso — Handoff: tercera pasada de límites Free + trial reverso de 14 días

Prompt de contexto para retomar esto en **otro chat**. Leé esto entero antes de tocar
nada — tiene el diseño completo ya decidido, para no tener que re-derivarlo.

---

## 0. Por qué existe este documento

Se interrumpió la implementación a mitad de camino (el usuario pidió en cambio este
handoff para seguir en otro chat). Hay UN cambio de código ya aplicado pero sin
commitear, y el resto del trabajo está diseñado pero no escrito. Este documento tiene
todo lo necesario para que la próxima sesión termine sin adivinar nada.

**Primer mensaje sugerido para el chat nuevo:**
> Retomo `CONTEXTO_TERCERA_PASADA_TRIAL.md` en `C:\Users\Tobi\Claude\mi-progreso`. Leelo
> entero y seguí desde la sección 3 (pendientes).

---

## 1. Qué se decidió (conversación previa, no volver a discutir)

Contexto de negocio: el usuario dijo *"creo que la versión gratis es suficiente... muchos
se van a quedar con esa versión"*. Se descartó reemplazar el freemium por un modelo de
"trial y después cobrás el 100%" (matar el free tier) porque en una app de hábitos el
valor se siente recién en el mes 2-3 (`CONTEXTO_FREEMIUM.md` sección 4) — un trial puro
corta a la gente justo antes de engancharse y pierde el boca a boca del free tier.

**Decisión final, confirmada por el usuario ("hacelo"):**
1. **Apretar un poco más los límites Free** (tercera pasada, con criterio — ver sección 2).
2. **Sumar un trial reverso de 14 días**: toda cuenta nueva arranca con Premium completo
   (sin tarjeta) y, al vencer, cae a Free. Como el grandfathering ya existente nunca borra
   nada y sólo bloquea *agregar* de más, alguien que en el trial armó 6 objetivos diarios
   o 2 proyectos activos se encuentra con avisos de upgrade reales (generados por su
   propio uso), no con un paywall inventado. Esto reemplaza la idea de "trial-y-pagás-todo":
   el free tier de siempre sigue estando para quien no convierte.

Esto es una continuación del trabajo de `feat/limites-plan-freemium` (mismo PR
[#2](https://github.com/Uliseslopez02/mi-progreso/pull/2), todavía abierto — la migración
`0024_plan_limits.sql` ya está aplicada en producción, ver `CONTEXTO_PENDIENTES_FREEMIUM.md`).
**No mergear el PR sin haber terminado y aplicado también lo de este documento.**

---

## 2. Números nuevos de la "tercera pasada" (ya decididos, ya aplicados en código — ver sección 3.0)

| Límite | Antes (2da pasada) | Ahora (3ra pasada) | Por qué |
| --- | --- | --- | --- |
| Objetivos diarios | 5 | **5 (sin cambio)** | Límite principal, ya decidido explícitamente, no se vuelve a tocar. |
| Objetivos semanales / mensuales | 1 | **1 (sin cambio)** | Ya está en el piso; bajar a 0 elimina la función. |
| Hábitos | 3 | **2** | Con 3 se armaba un sistema completo sin sentir nunca el límite. |
| Metas de vida activas | 2 | **1** | Con 1 se prueba toda la función; la 2da en paralelo es el perfil que paga. |
| Proyectos activos | 1 | **1 (sin cambio)** | Ya está en el piso. |
| Rutinas | 1 | **1 (sin cambio)** | Ya está en el piso. |
| Notas | 10 | **10 (sin cambio)** | Es red de seguridad anti-abuso, no palanca de conversión (ya documentado así). |
| Categorías | 6 | **5** | El seed trae 4; 5 sigue alcanzando sin regalar margen extra. |
| Historial | 7 / 14 días | **sólo 7 días** | "Quiero ver 2 semanas" pasa a ser el primer contacto con Premium. |
| Mapa anual (heatmap) | ~8 semanas (~2 meses) | **4 semanas (~1 mes)** | Mismo criterio que historial. |
| Planificador (semanas adelante) | 1 | **1 (sin cambio)** | Bajar a 0 se siente roto (anti-objetivo explícito: no degradar la UI). |
| IA | 3/mes | **3/mes (sin cambio)** | Ya decidido en otra iteración, fuera de alcance de esta pasada. |

**Trial:** `TRIAL_DAYS = 14`, sin tarjeta, arranca automáticamente al registrarse.
No se aplica retroactivamente a cuentas ya existentes (ver sección 3.2, por qué).

---

## 3. Estado exacto del código — qué falta hacer, en orden

### 3.0 — YA HECHO (uncommitted)

Hay un **worktree ya creado** en `C:\Users\Tobi\Claude\mi-progreso-freemium-2`, en la
rama `feat/limites-plan-freemium` (si ya no existe, recrearlo: `git worktree add
../mi-progreso-freemium-2 feat/limites-plan-freemium` desde `C:\Users\Tobi\Claude\mi-progreso`).

Ahí, **`src/domain/plan.ts` ya tiene aplicados** (sin commitear todavía):
- `PLAN_LIMITS.free`: `habits: 2`, `activeLifeGoals: 1`, `categories: 5` (resto sin cambio).
- `FREE_HISTORY_RANGES = [7] as const` (era `[7, 14]`).
- `FREE_YEAR_MAP_WEEKS = 4` (era `8`).
- `LIMIT_COPY` actualizado para `habits`, `activeLifeGoals`, `categories`, `historyRange`
  (textos con los números nuevos).
- Comentarios explicando el criterio de la "tercera pasada".

Verificar con `git -C ../mi-progreso-freemium-2 diff src/domain/plan.ts` (o la ruta que
corresponda) que sigue así antes de seguir.

**Todavía NO se tocó nada más** — ni los helpers de trial en `plan.ts`, ni la migración,
ni el resto de los archivos de abajo.

### 3.1 — Agregar los helpers de trial a `src/domain/plan.ts`

Al final del archivo, agregar (pensado para ser puro y testeable, mismo estilo que el
resto del archivo):

```ts
// ---------- Trial reverso ----------
//
// Toda cuenta nueva arranca con Premium completo por `TRIAL_DAYS` días (sin
// tarjeta, ver `handle_new_user()` en 0025_free_trial.sql) en vez de arrancar
// limitada. La idea: en una app de hábitos el valor se siente recién con uso
// sostenido (mes 2+, CONTEXTO_FREEMIUM.md sección 4) — dar los límites de Free
// desde el día 1 deja a mucha gente conforme con "lo gratis ya me alcanza" sin
// haber probado nunca el sistema completo. Con el trial, arman más de lo que
// el límite Free permite; al vencer, el grandfathering (nunca borra, sólo
// bloquea agregar más) hace que la presión de upgrade sea genuina — generada
// por su propio uso, no por un paywall inventado.
export const TRIAL_DAYS = 14

/** true si el estado de suscripción implica trial vigente (no vencido). */
export function isTrialActive(status: string, trialEnd: string | null): boolean {
  if (status !== 'trial' || !trialEnd) return false
  return new Date(trialEnd).getTime() > Date.now()
}

/** Días enteros que quedan de trial (0 si ya venció o no hay trial). Redondea
 * hacia arriba: a 30 minutos de vencer todavía se muestra "1 día", no "0". */
export function daysLeftInTrial(trialEnd: string | null): number {
  if (!trialEnd) return 0
  const ms = new Date(trialEnd).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)))
}
```

### 3.2 — Nueva migración `supabase/migrations/0025_free_trial.sql`

`0024_plan_limits.sql` **ya está aplicada en producción** (ver
`CONTEXTO_PENDIENTES_FREEMIUM.md`) — no se edita, se agrega una nueva migración.

Diseño: no hace falta ninguna columna nueva. `subscriptions` (de `0023_subscriptions.sql`)
ya tiene `status` (con el valor `'trial'` ya en el check constraint), `trial_start`,
`trial_end`. Sólo falta: (a) crear la fila de subscriptions al registrarse, (b) una
función que calcule el plan efectivo en el momento (sin depender de un cron que baje el
plan solo al vencer el trial), y (c) que `enforce_free_plan_limits` la use.

**No se aplica retroactivamente**: las cuentas que ya existen (sin fila en
`subscriptions`, como la cuenta real de Ulises) siguen resolviendo a `'free'` exactamente
igual que hoy — `get_effective_plan` devuelve `'free'` cuando no hay fila. Es la opción
seria por defecto: no le regala un trial arbitrario a cuentas que ya vienen usando la app,
ni resetea nada.

```sql
-- 0025_free_trial.sql
-- Trial reverso: toda cuenta nueva arranca con Premium completo 14 días (sin
-- tarjeta) en vez de arrancar limitada — ver razonamiento en `src/domain/plan.ts`
-- (sección "Trial reverso") y CONTEXTO_FREEMIUM.md sección 13.2.
--
-- No se aplica retroactivamente: sólo altas nuevas desde que se aplica esta
-- migración. Las cuentas existentes (sin fila en `subscriptions`) siguen 'free'
-- exactamente igual que antes — `get_effective_plan` resuelve a 'free' cuando
-- no hay fila.

-- Plan efectivo, calculado en el momento (no depende de un cron que baje el
-- plan al vencer el trial): 'premium' si status='active', o si status='trial'
-- y trial_end todavía no pasó. Cualquier otro caso (incluida cuenta sin fila
-- en subscriptions) es 'free'. Reemplaza la lectura directa de profiles.plan
-- tanto en el backend (enforce_free_plan_limits) como en el frontend
-- (ver supabaseRepository.getUserPlan/getSubscriptionSummary, sección 3.3).
create or replace function public.get_effective_plan(uid uuid default auth.uid())
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select case
       when s.status = 'active' then 'premium'
       when s.status = 'trial' and s.trial_end > now() then 'premium'
       else 'free'
     end
     from public.subscriptions s
     where s.user_id = uid),
    'free'
  );
$$;

revoke all on function public.get_effective_plan(uuid) from public;
grant execute on function public.get_effective_plan(uuid) to authenticated;

-- Alta nueva: además del profile + user_settings de siempre, crea la fila de
-- subscriptions en estado 'trial' con 14 días desde el alta. Cuerpo idéntico
-- al de 0022_profile_fields.sql + el insert de subscriptions.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name) values (new.id, new.raw_user_meta_data ->> 'full_name');
  insert into public.user_settings (user_id) values (new.id);
  insert into public.subscriptions (user_id, status, plan_tier, trial_start, trial_end)
  values (new.id, 'trial', 'free', now(), now() + interval '14 days')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

-- enforce_free_plan_limits pasa a resolver el plan con get_effective_plan (así
-- el trial cuenta como premium sin tocar profiles.plan ni depender de un cron
-- que lo baje al vencer) y refleja los números nuevos de la tercera pasada
-- (habits 3→2, activeLifeGoals 2→1 — ver src/domain/plan.ts, sección 2 de este doc).
create or replace function public.enforce_free_plan_limits(uid uuid, payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text;
begin
  v_plan := public.get_effective_plan(uid);
  if v_plan is distinct from 'free' then
    return; -- Premium o trial vigente: sin límites.
  end if;

  perform public.plan_limit_guard('dailyGoals',
    (select count(*)::int from jsonb_array_elements(coalesce(payload->'goals', '[]'::jsonb)) g
       where coalesce(g->>'trackingKind', 'goal') <> 'habit'
         and coalesce(g->>'period', 'daily') = 'daily'),
    (select count(*)::int from public.goals
       where user_id = uid and coalesce(tracking_kind, 'goal') <> 'habit' and period = 'daily'),
    5);

  perform public.plan_limit_guard('weeklyGoals',
    (select count(*)::int from jsonb_array_elements(coalesce(payload->'goals', '[]'::jsonb)) g
       where coalesce(g->>'trackingKind', 'goal') <> 'habit'
         and coalesce(g->>'period', 'daily') = 'weekly'),
    (select count(*)::int from public.goals
       where user_id = uid and coalesce(tracking_kind, 'goal') <> 'habit' and period = 'weekly'),
    1);

  perform public.plan_limit_guard('monthlyGoals',
    (select count(*)::int from jsonb_array_elements(coalesce(payload->'goals', '[]'::jsonb)) g
       where coalesce(g->>'trackingKind', 'goal') <> 'habit'
         and coalesce(g->>'period', 'daily') = 'monthly'),
    (select count(*)::int from public.goals
       where user_id = uid and coalesce(tracking_kind, 'goal') <> 'habit' and period = 'monthly'),
    1);

  perform public.plan_limit_guard('habits',
    (select count(*)::int from jsonb_array_elements(coalesce(payload->'goals', '[]'::jsonb)) g
       where coalesce(g->>'trackingKind', 'goal') = 'habit'),
    (select count(*)::int from public.goals
       where user_id = uid and coalesce(tracking_kind, 'goal') = 'habit'),
    2);

  perform public.plan_limit_guard('activeLifeGoals',
    (select count(*)::int from jsonb_array_elements(coalesce(payload->'lifeGoals', '[]'::jsonb)) lg
       where coalesce(lg->>'status', 'active') = 'active'),
    (select count(*)::int from public.life_goals where user_id = uid and status = 'active'),
    1);

  perform public.plan_limit_guard('activeProjects',
    (select count(*)::int from jsonb_array_elements(coalesce(payload->'projects', '[]'::jsonb)) p
       where coalesce(p->>'status', 'active') = 'active'),
    (select count(*)::int from public.projects where user_id = uid and status = 'active'),
    1);

  perform public.plan_limit_guard('routines',
    (select count(*)::int from jsonb_array_elements(coalesce(payload->'routines', '[]'::jsonb))),
    (select count(*)::int from public.routines where user_id = uid),
    1);
end;
$$;

revoke all on function public.enforce_free_plan_limits(uuid, jsonb) from public;

-- Verificación manual tras aplicar (SQL Editor):
--   select get_effective_plan('<uid de un usuario existente sin fila subscriptions>'); -- 'free'
--   -- crear un usuario de prueba nuevo (signup real) y confirmar:
--   select * from public.subscriptions where user_id = '<ese nuevo uid>';
--     -- status='trial', trial_end ≈ now()+14d
--   select public.get_effective_plan('<ese nuevo uid>'); -- 'premium' (trial vigente)
```

### 3.3 — Frontend: leer el plan efectivo en vez de `profiles.plan`

**`src/domain/types.ts`**: agregar `trialEnd: string | null` a `SubscriptionSummary`.

**`src/storage/supabaseRepository.ts`**:
```ts
async getUserPlan() {
  const { data, error } = await client.rpc('get_effective_plan')
  if (error) throw error
  return (data as UserPlan | undefined) ?? 'free'
},

async getSubscriptionSummary() {
  const yearMonth = new Date().toISOString().slice(0, 7)
  const [planRes, subscriptionRes, usageRes] = await Promise.all([
    client.rpc('get_effective_plan'),
    client.from('subscriptions').select('status, plan_tier, current_period_end, trial_end').maybeSingle(),
    client.from('ai_usage').select('count').eq('year_month', yearMonth).maybeSingle(),
  ])
  if (planRes.error) throw planRes.error
  if (subscriptionRes.error) throw subscriptionRes.error
  if (usageRes.error) throw usageRes.error

  const plan = (planRes.data as UserPlan | undefined) ?? 'free'
  return {
    status: (subscriptionRes.data?.status as SubscriptionSummary['status'] | undefined) ?? 'free',
    planTier: (subscriptionRes.data?.plan_tier as SubscriptionSummary['planTier'] | undefined) ?? 'free',
    currentPeriodEnd: subscriptionRes.data?.current_period_end ?? null,
    trialEnd: subscriptionRes.data?.trial_end ?? null,
    aiUsage: plan === 'premium' ? null : { count: usageRes.data?.count ?? 0, limit: 3 },
  }
},
```
Por qué esto alcanza para que **todo el resto de la app funcione solo**: cada pantalla
que hoy hace `plan === 'premium'` (ProBadge, UpgradeCard, contadores, historial, mapa
anual, planificador) sigue leyendo `state.plan` de siempre (`AppProvider.tsx` ya llama
`repository.getUserPlan()` una sola vez al cargar) — como ahora ese valor va a ser
`'premium'` durante el trial, todo el gating existente trata al trial exactamente como
Premium sin tocar ni un componente más.

**`src/storage/memoryRepository.ts`** y **`src/storage/localStorageRepository.ts`**:
agregar `trialEnd: null` al objeto que devuelve `getSubscriptionSummary()` en cada uno
(sólo para que el tipo compile — estos repos no simulan trial).

### 3.4 — UI: que el usuario sepa que está en trial

**`src/pages/PremiumPage.tsx`**: importar `isTrialActive, daysLeftInTrial` de
`../domain/plan`. Calcular `const isTrialing = summary ? isTrialActive(summary.status, summary.trialEnd) : false`.
Insertar una tarjeta arriba de todo (antes de la sección "Cuando una sola parte de tu
vida ya no alcanza"), sin sacar nada de lo que ya está — durante el trial la persona debe
poder seguir viendo la comparación de planes y suscribirse ya si quiere, no cortarle el
flujo como hace la rama `isPremium` actual:

```tsx
{isTrialing && (
  <section className="card">
    <h1 className="card__title">✨ Estás en tu prueba Premium</h1>
    <p className="card__hint">
      Te quedan {daysLeftInTrial(summary!.trialEnd)} días con acceso completo. Si te
      sirve, podés sumarte a Premium ahora y seguir sin cortes cuando termine la prueba.
    </p>
  </section>
)}
```
(Anti-objetivo del proyecto: nada de banner global ni en la barra de navegación — ver
`CONTEXTO_FREEMIUM.md` sección 5, "Lo que NO se hace". Por eso esto va sólo en
`/premium`, no en un banner que se vea en toda la app. Es un alcance mínimo a propósito;
si se quiere más visibilidad, evaluar con el usuario antes de sumar nada en `Ajustes` o
en la navegación.)

**`src/components/PlanComparison.tsx`**: la fila "Mapa anual de hábitos" tiene el texto
`'Últimos ~2 meses'` **hardcodeado** (no lee de `plan.ts`) — cambiarlo a algo acorde a
`FREE_YEAR_MAP_WEEKS = 4`, p. ej. `` `Último mes` `` o `` `Últimas ${FREE_YEAR_MAP_WEEKS} semanas` ``
(importando la constante). La fila de "Historial de progreso" ya es dinámica
(`freeHistoryDays` sale de `FREE_HISTORY_RANGES`), no hace falta tocarla.

### 3.5 — Tests a actualizar

**`src/__tests__/plan.test.ts`** — estos asserts van a fallar con los números nuevos, hay
que actualizarlos:
- `remainingFor('free', 'habits', 1)).toBe(2)` → ahora el límite es 2, así que
  `remainingFor('free','habits',1)` da `1`. Cambiar el expect (o el input) para que siga
  siendo un caso significativo.
- Bloque "los números de Free coinciden con lo documentado": `habits` → `2`,
  `activeLifeGoals` → `1`, `categories` → `5`.
- `historyRangesFor('free')).toEqual([7, 14])` → ahora `toEqual([7])`.
- `isProHistoryRange(14)).toBe(false)` → ahora `14` ya NO es un rango Free, así que pasa
  a `.toBe(true)`.
- `yearMapWeeksFor('free', 53)).toBe(8)` → ahora `.toBe(4)`.

Agregar tests nuevos para `isTrialActive` y `daysLeftInTrial` (casos: sin trialEnd, trial
vigente, trial vencido, status distinto de `'trial'` con trialEnd seteado igual debe dar
`false`).

Revisar también `src/__tests__/premiumPage.test.tsx` — puede necesitar un caso nuevo para
`status: 'trial'` con `trialEnd` en el futuro, verificando que se ve la tarjeta de trial.

### 3.6 — Documentación

Agregar sección **13.2** a `CONTEXTO_FREEMIUM.md` (en la rama, es el doc de referencia)
con el mismo contenido de la sección 2 de este handoff (tabla de números + trial), y
actualizar la matriz de la sección 3 de ese doc con los números nuevos (Hábitos,
Metas de vida activas, Historial, Mapa anual). Actualizar también
`CONTEXTO_PENDIENTES_FREEMIUM.md` para que el punto "3.1 hecho" no quede huérfano de esta
tercera pasada — dejar claro que hay una migración `0025` nueva pendiente de aplicar,
además de la `0024` ya aplicada.

### 3.7 — Verificar y aplicar

1. En el worktree: `npx tsc -b`, `npx vitest run`, `npm run build` — deben quedar verdes.
2. **Aplicar `0025_free_trial.sql` en Supabase producción**
   (`iwnrmzbdhrqwcbouhyqf`, "Uliseslopez02's Project" → `main`). Usar el método que
   **ya funcionó** en esta misma conversación para `0024` (documentado en detalle en
   `CONTEXTO_PENDIENTES_FREEMIUM.md` sección 3.1): con Claude in Chrome, navegar al SQL
   Editor y setear el contenido directo con
   `window.monaco.editor.getModels()[0].setValue(sql)` vía `javascript_tool` — **nunca
   tipear ni pegar por portapapeles** un SQL largo, Monaco lo corrompe. Confirmar el modal
   "Potential issue detected" que Supabase muestra (es normal, por los `revoke`/
   `create or replace function`). Verificar después con una query de sólo lectura que
   `get_effective_plan` existe (`select proname from pg_proc where proname =
   'get_effective_plan'`).
3. Probar el registro de una cuenta nueva de verdad (o revisar `subscriptions` después
   de un signup de prueba) para confirmar que la fila de trial se crea con
   `trial_end` ≈ 14 días.
4. Commit en la rama `feat/limites-plan-freemium` (worktree
   `C:\Users\Tobi\Claude\mi-progreso-freemium-2`) + push — el PR
   [#2](https://github.com/Uliseslopez02/mi-progreso/pull/2) se actualiza solo, no hace
   falta un PR nuevo.
5. Al terminar, `git worktree remove ../mi-progreso-freemium-2` desde el repo principal.

---

## 4. Gotchas

- El repo principal (`C:\Users\Tobi\Claude\mi-progreso`) casi siempre tiene WIP sin
  commitear de otra sesión en paralelo (visto: `api/habit-insights.ts`,
  `api/suggest-habits.ts`). No tocar esos archivos; por eso todo este trabajo vive en el
  worktree aparte.
- `node_modules` no se comparte entre worktrees. Si hace falta instalar de cero, es más
  rápido linkear con una Junction (PowerShell):
  `New-Item -ItemType Junction -Path node_modules -Target "C:\Users\Tobi\Claude\mi-progreso\node_modules"`
  desde dentro del worktree.
- No confundir esta migración `0025` con la `0024` — la `0024` ya está en producción, no
  se vuelve a aplicar ni se edita.
- El trial es **sólo para altas nuevas**. Si en algún momento se decide dar trial también
  a cuentas existentes, es una decisión de negocio aparte (impacto en usuarios ya
  convertidos a Premium real, o en cuentas Free viejas) — no asumirlo, preguntar primero.
