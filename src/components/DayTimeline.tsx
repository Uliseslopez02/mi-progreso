import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { PlannerItem } from '../domain/types'
import { formatTimeRange, minutesToTime, snapMinutes, timeToMinutes } from '../domain/time'

const GRID_START_MIN = 6 * 60
const GRID_END_MIN = 23 * 60
const PX_PER_MIN = 64 / 60
const MIN_DURATION = 15
const MIN_BLOCK_HEIGHT = 40

const PRIORITY_COLOR: Record<PlannerItem['priority'], string> = {
  low: 'var(--text-dim)',
  medium: 'var(--band-good)',
  high: 'var(--band-low)',
}

interface Props {
  items: PlannerItem[]
  nowMinutes: number | null
  /** Nombre del hábito por id, para el badge de los ítems vinculados (`item.linkedHabitId`). */
  habitNameById: Record<string, string>
  onToggle: (id: string) => void
  onRemove: (id: string) => void
  onDuplicate: (id: string) => void
  onPostpone: (id: string) => void
  onMove: (id: string, startTime: string) => void
  onResize: (id: string, durationMinutes: number) => void
}

function clampStart(startMin: number, durationMin: number): number {
  return Math.max(GRID_START_MIN, Math.min(GRID_END_MIN - durationMin, startMin))
}

function ItemActions({
  item,
  habitName,
  onToggle,
  onRemove,
  onDuplicate,
  onPostpone,
}: {
  item: PlannerItem
  habitName?: string
  onToggle: (id: string) => void
  onRemove: (id: string) => void
  onDuplicate: (id: string) => void
  onPostpone: (id: string) => void
}) {
  const stop = (e: ReactPointerEvent) => e.stopPropagation()
  return (
    <>
      <input
        type="checkbox"
        checked={item.done}
        aria-label={item.title}
        onPointerDown={stop}
        onChange={() => onToggle(item.id)}
      />
      <div className="timeline-item__body">
        <p className="timeline-item__title">
          {item.type === 'event' ? '📅 ' : ''}
          {item.title}
        </p>
        <div className="planner-item__meta">
          <span className="planner-item__dot" style={{ background: PRIORITY_COLOR[item.priority] }} />
          {habitName && <span className="planner-item__tag">🔗 {habitName}</span>}
        </div>
      </div>
      <div className="timeline-item__actions">
        <button
          type="button"
          className="planner-item__remove"
          aria-label={`Duplicar ${item.title}`}
          onPointerDown={stop}
          onClick={() => onDuplicate(item.id)}
        >
          ⧉
        </button>
        <button
          type="button"
          className="planner-item__remove"
          aria-label={`Posponer ${item.title} a mañana`}
          onPointerDown={stop}
          onClick={() => onPostpone(item.id)}
        >
          →
        </button>
        <button
          type="button"
          className="planner-item__remove"
          aria-label={`Eliminar ${item.title}`}
          onPointerDown={stop}
          onClick={() => onRemove(item.id)}
        >
          ×
        </button>
      </div>
    </>
  )
}

function TimedBlock({
  item,
  habitNameById,
  onToggle,
  onRemove,
  onDuplicate,
  onPostpone,
  onMove,
  onResize,
}: {
  item: PlannerItem & { startTime: string }
  habitNameById: Record<string, string>
  onToggle: (id: string) => void
  onRemove: (id: string) => void
  onDuplicate: (id: string) => void
  onPostpone: (id: string) => void
  onMove: (id: string, startTime: string) => void
  onResize: (id: string, durationMinutes: number) => void
}) {
  const duration = item.durationMinutes ?? 30
  const [dragStartMin, setDragStartMin] = useState<number | null>(null)
  const [dragDuration, setDragDuration] = useState<number | null>(null)
  const dragOriginRef = useRef<{ pointerY: number; startMin: number; duration: number } | null>(null)
  const resizeOriginRef = useRef<{ pointerY: number; duration: number } | null>(null)

  const startMin = dragStartMin ?? timeToMinutes(item.startTime)
  const effectiveDuration = dragDuration ?? duration
  const top = (startMin - GRID_START_MIN) * PX_PER_MIN
  const height = Math.max(MIN_BLOCK_HEIGHT, effectiveDuration * PX_PER_MIN)

  const handleBodyPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    ;(e.target as Element).setPointerCapture(e.pointerId)
    dragOriginRef.current = { pointerY: e.clientY, startMin: timeToMinutes(item.startTime), duration }
  }

  const handleBodyPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const origin = dragOriginRef.current
    if (!origin) return
    const deltaMin = (e.clientY - origin.pointerY) / PX_PER_MIN
    const next = clampStart(snapMinutes(origin.startMin + deltaMin), origin.duration)
    setDragStartMin(next)
  }

  const handleBodyPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const origin = dragOriginRef.current
    dragOriginRef.current = null
    ;(e.target as Element).releasePointerCapture(e.pointerId)
    if (!origin) return
    const finalMin = dragStartMin
    setDragStartMin(null)
    if (finalMin !== null && finalMin !== origin.startMin) {
      onMove(item.id, minutesToTime(finalMin))
    }
  }

  const handleResizePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.stopPropagation()
    if (e.button !== 0) return
    ;(e.target as Element).setPointerCapture(e.pointerId)
    resizeOriginRef.current = { pointerY: e.clientY, duration }
  }

  const handleResizePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.stopPropagation()
    const origin = resizeOriginRef.current
    if (!origin) return
    const deltaMin = (e.clientY - origin.pointerY) / PX_PER_MIN
    const maxDuration = GRID_END_MIN - startMin
    const next = Math.max(MIN_DURATION, Math.min(maxDuration, snapMinutes(origin.duration + deltaMin)))
    setDragDuration(next)
  }

  const handleResizePointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.stopPropagation()
    const origin = resizeOriginRef.current
    resizeOriginRef.current = null
    ;(e.target as Element).releasePointerCapture(e.pointerId)
    if (!origin) return
    const finalDuration = dragDuration
    setDragDuration(null)
    if (finalDuration !== null && finalDuration !== origin.duration) {
      onResize(item.id, finalDuration)
    }
  }

  return (
    <div
      className={`timeline-item${item.done ? ' timeline-item--done' : ''}`}
      style={{ top, height }}
      onPointerDown={handleBodyPointerDown}
      onPointerMove={handleBodyPointerMove}
      onPointerUp={handleBodyPointerUp}
    >
      <ItemActions
        item={item}
        habitName={item.linkedHabitId ? habitNameById[item.linkedHabitId] : undefined}
        onToggle={onToggle}
        onRemove={onRemove}
        onDuplicate={onDuplicate}
        onPostpone={onPostpone}
      />
      <p className="timeline-item__time">{formatTimeRange(minutesToTime(startMin), effectiveDuration)}</p>
      <div
        className="timeline-item__resize"
        onPointerDown={handleResizePointerDown}
        onPointerMove={handleResizePointerMove}
        onPointerUp={handleResizePointerUp}
        aria-hidden="true"
      />
    </div>
  )
}

/** Timeline vertical de un día (06:00–23:00). Los ítems sin horario o fuera de ese rango van aparte. */
export function DayTimeline({
  items,
  nowMinutes,
  habitNameById,
  onToggle,
  onRemove,
  onDuplicate,
  onPostpone,
  onMove,
  onResize,
}: Props) {
  const timed = items.filter(
    (i): i is PlannerItem & { startTime: string } =>
      !!i.startTime &&
      timeToMinutes(i.startTime) >= GRID_START_MIN &&
      timeToMinutes(i.startTime) < GRID_END_MIN,
  )
  const untimed = items.filter((i) => !timed.includes(i as PlannerItem & { startTime: string }))

  const hours = Array.from({ length: (GRID_END_MIN - GRID_START_MIN) / 60 }, (_, i) => GRID_START_MIN / 60 + i)
  const gridHeight = (GRID_END_MIN - GRID_START_MIN) * PX_PER_MIN

  return (
    <div className="stack">
      {untimed.length > 0 && (
        <ul className="timeline-untimed">
          {untimed.map((item) => (
            <li key={item.id} className={`planner-item${item.done ? ' planner-item--done' : ''}`}>
              <ItemActions
                item={item}
                habitName={item.linkedHabitId ? habitNameById[item.linkedHabitId] : undefined}
                onToggle={onToggle}
                onRemove={onRemove}
                onDuplicate={onDuplicate}
                onPostpone={onPostpone}
              />
              {item.startTime && <span className="planner-item__tag">{item.startTime}</span>}
            </li>
          ))}
        </ul>
      )}

      <div className="timeline" style={{ height: gridHeight }}>
        <div className="timeline__hours">
          {hours.map((h) => (
            <div key={h} className="timeline__hour" style={{ height: 64 }}>
              <span className="timeline__hour-label">{String(h).padStart(2, '0')}:00</span>
            </div>
          ))}
        </div>
        <div className="timeline__track">
          {hours.map((h) => (
            <div key={h} className="timeline__line" style={{ top: (h * 60 - GRID_START_MIN) * PX_PER_MIN }} />
          ))}
          {nowMinutes !== null && nowMinutes >= GRID_START_MIN && nowMinutes < GRID_END_MIN && (
            <div className="timeline__now" style={{ top: (nowMinutes - GRID_START_MIN) * PX_PER_MIN }} />
          )}
          {timed.map((item) => (
            <TimedBlock
              key={item.id}
              item={item}
              habitNameById={habitNameById}
              onToggle={onToggle}
              onRemove={onRemove}
              onDuplicate={onDuplicate}
              onPostpone={onPostpone}
              onMove={onMove}
              onResize={onResize}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
