import '../styles/presentacion.css'
import { PresentacionProvider } from './PresentacionState'
import { useDocumentMeta } from './useDocumentMeta'
import { HeroSection } from './sections/HeroSection'
import { ProblemSection } from './sections/ProblemSection'
import { SolutionSection } from './sections/SolutionSection'
import { DashboardSection } from './sections/DashboardSection'
import { HabitsSection } from './sections/HabitsSection'
import { MapaAnualSection } from './sections/MapaAnualSection'
import { PercentageSystemSection } from './sections/PercentageSystemSection'
import { ProgressSection } from './sections/ProgressSection'
import { CalendarioSection } from './sections/CalendarioSection'
import { InformesSection } from './sections/InformesSection'
import { AgendaSection } from './sections/AgendaSection'
import { FocusSection } from './sections/FocusSection'
import { ProjectsSection } from './sections/ProjectsSection'
import { MetasSection } from './sections/MetasSection'
import { RoutinasSection } from './sections/RoutinasSection'
import { NotasSection } from './sections/NotasSection'
import { MomentoMoriSection } from './sections/MomentoMoriSection'
import { JourneySection } from './sections/JourneySection'
import { SecondaryFeaturesSection } from './sections/SecondaryFeaturesSection'
import { FinalCtaSection } from './sections/FinalCtaSection'

/**
 * Página pública `/presentacion`: presentación comercial narrativa de Mi
 * Progreso — se lee de arriba a abajo como una historia (problema → solución →
 * el producto funcionando → recorrido → cierre), con secciones interactivas
 * reales intercaladas. `/producto` es la variante "bento" de la misma idea
 * (todo el demo junto en una grilla). Ambas son públicas, sin cuenta; ver
 * `main.tsx` para el mount condicional por pathname.
 */
export function PresentacionPage() {
  useDocumentMeta(
    'Mi Progreso — Convertí tus hábitos y objetivos en un progreso real',
    'Hábitos, objetivos, proyectos y agenda conectados en un solo porcentaje. Probá una demo interactiva real de Mi Progreso, sin crear cuenta.',
  )

  return (
    <PresentacionProvider>
      <div className="presentacion">
        <a className="pr-back" href="/">
          ← Volver a Mi Progreso
        </a>
        <HeroSection />
        <main className="pr-main">
          <ProblemSection />
          <SolutionSection />
          <DashboardSection />
          <HabitsSection />
          <MapaAnualSection />
          <PercentageSystemSection />
          <ProgressSection />
          <CalendarioSection />
          <InformesSection />
          <AgendaSection />
          <FocusSection />
          <ProjectsSection />
          <MetasSection />
          <RoutinasSection />
          <NotasSection />
          <MomentoMoriSection />
          <div id="recorrido">
            <JourneySection />
          </div>
          <SecondaryFeaturesSection />
        </main>
        <FinalCtaSection />
      </div>
    </PresentacionProvider>
  )
}
