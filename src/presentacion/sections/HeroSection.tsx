export function HeroSection() {
  return (
    <header className="pr-hero">
      <div className="pr-hero__glow pr-hero__glow--a" aria-hidden="true" />
      <div className="pr-hero__glow pr-hero__glow--b" aria-hidden="true" />
      <p className="pr-eyebrow">Mi Progreso</p>
      <h1 className="pr-hero__title">Dejá de adivinar si estás progresando de verdad.</h1>
      <p className="pr-hero__subtitle">
        Hábitos, objetivos, proyectos y agenda — todo convertido en un número que no miente.
        Cada día que cumplís queda registrado, pesado y sumado a un progreso real. No es una
        lista de tareas: es un sistema que te muestra el patrón detrás de tus días.
      </p>
      <div className="pr-hero__actions">
        <a className="pr-btn pr-btn--primary" href="/?signup=1">
          Crear mi cuenta gratis
        </a>
        <a className="pr-btn pr-btn--ghost" href="#recorrido">
          Ver cómo funciona
        </a>
      </div>
      <p className="pr-hero__note">Esta página es interactiva de verdad: tocá, marcá, mirá cómo reacciona.</p>
    </header>
  )
}
