import '../styles/showcase.css'
import { HabitsModule } from './modules/HabitsModule'
import { TodayRitualModule } from './modules/TodayRitualModule'
import { GoalModule } from './modules/GoalModule'
import { StatsModule } from './modules/StatsModule'
import { MomentoMoriModule } from './modules/MomentoMoriModule'
import { FocusModule } from './modules/FocusModule'
import { DreamsModule } from './modules/DreamsModule'
import { OverallProgressModule } from './modules/OverallProgressModule'
import { ProjectsModule } from './modules/ProjectsModule'
import { PercentModule } from './modules/PercentModule'
import { ProblemStrip, JourneySection, SecondaryFeatures } from './NarrativeSections'
import { ShowcaseProvider } from './ShowcaseState'
import { useDocumentMeta } from './useDocumentMeta'

/**
 * Página pública `/producto`: demostración interactiva del producto y a la vez
 * pieza comercial. No requiere cuenta — ver `main.tsx` para el mount
 * condicional por pathname. El bento del medio es Mi Progreso funcionando de
 * verdad (mismas funciones puras de `domain/*`); alrededor, la narrativa de
 * para qué sirve.
 */
export function ProductShowcasePage() {
  useDocumentMeta(
    'Mi Progreso — Convertí tus hábitos y objetivos en un progreso real',
    'Hábitos, objetivos, proyectos y agenda conectados en un solo porcentaje que no miente. Probá una demo interactiva real de Mi Progreso, sin crear cuenta.',
  )

  return (
    <ShowcaseProvider>
      <div className="showcase">
        <a className="sc-back" href="/">
          ← Volver a Mi Progreso
        </a>

        <header className="sc-hero">
          <div className="sc-hero__glow sc-hero__glow--a" aria-hidden="true" />
          <div className="sc-hero__glow sc-hero__glow--b" aria-hidden="true" />
          <p className="hero__eyebrow">Mi Progreso</p>
          <h1 className="sc-hero__title">Un sistema para construir la vida que querés.</h1>
          <p className="sc-hero__subtitle">
            Hábitos, objetivos, proyectos, enfoque y reflexión — conectados en un mismo progreso.
            Esto no es una demo grabada: es Mi Progreso funcionando de verdad. Tocá, marcá, mirá
            cómo reacciona.
          </p>
          <div className="sc-hero__actions">
            <a className="btn btn--primary" href="/?signup=1">
              Crear mi cuenta gratis
            </a>
            <a className="sc-btn-glass" href="#demo">
              Ver cómo funciona
            </a>
          </div>
        </header>

        <ProblemStrip />

        <main className="sc-grid" id="demo">
          <OverallProgressModule />
          <HabitsModule />
          <TodayRitualModule />
          <PercentModule />
          <GoalModule />
          <StatsModule />
          <ProjectsModule />
          <DreamsModule />
          <FocusModule />
          <MomentoMoriModule />
        </main>

        <JourneySection />
        <SecondaryFeatures />

        <section className="sc-cta">
          <h2 className="sc-cta__title">Todo empieza con una pequeña acción.</h2>
          <p className="sc-cta__text">
            Creá tu cuenta y empezá a construir tu propio sistema — hoy mismo, con tus propios
            objetivos.
          </p>
          <div className="sc-cta__actions">
            <a className="btn btn--primary" href="/?signup=1">
              Empezar mi progreso
            </a>
            <a className="sc-btn-glass" href="/">
              Ya tengo cuenta
            </a>
          </div>
        </section>
      </div>
    </ShowcaseProvider>
  )
}
