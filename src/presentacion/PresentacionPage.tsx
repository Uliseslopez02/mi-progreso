import '../styles/presentacion.css'
import { PresentacionProvider } from './PresentacionState'
import { useDocumentMeta } from './useDocumentMeta'
import { HeroSection } from './sections/HeroSection'
import { ProblemSection } from './sections/ProblemSection'
import { SolutionSection } from './sections/SolutionSection'
import { DashboardSection } from './sections/DashboardSection'
import { HabitsSection } from './sections/HabitsSection'
import { ProjectsSection } from './sections/ProjectsSection'
import { PercentageSystemSection } from './sections/PercentageSystemSection'
import { ProgressSection } from './sections/ProgressSection'
import { JourneySection } from './sections/JourneySection'
import { SecondaryFeaturesSection } from './sections/SecondaryFeaturesSection'
import { FinalCtaSection } from './sections/FinalCtaSection'

/**
 * Página pública `/presentacion`: presentación comercial de Mi Progreso,
 * independiente de `/producto` (ver plan de auditoría — `/producto` quedó
 * desactualizado y Ulises pidió una ruta nueva en vez de tocarlo). No
 * requiere cuenta; ver `main.tsx` para el mount condicional por pathname.
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
          <ProjectsSection />
          <PercentageSystemSection />
          <ProgressSection />
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
