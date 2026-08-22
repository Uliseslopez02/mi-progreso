import { ProgressPath } from './ProgressPath'

interface Props {
  message: string
}

/** Transición breve de continuidad al entrar (login o registro) — nunca bloquea, sólo acompaña. */
export function EnterTransition({ message }: Props) {
  return (
    <div className="loading-screen">
      <ProgressPath steps={3} activeIndex={2} size="md" />
      <p className="loading-screen__message loading-screen__message--enter" role="status">
        {message}
      </p>
    </div>
  )
}
