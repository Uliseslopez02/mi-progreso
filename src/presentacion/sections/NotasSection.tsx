import { useMemo, useState } from 'react'
import { formatLongDate } from '../../domain/date'
import { createId } from '../../domain/id'
import type { Note } from '../../domain/types'
import { SectionFrame } from '../SectionFrame'
import { TODAY } from '../demoData'

const DEMO_NOTES: Note[] = [
  {
    id: 'nota-1',
    date: TODAY,
    title: 'Idea para el proyecto',
    body: 'Preguntarle a los primeros 5 usuarios qué casi los hizo abandonar en el onboarding.',
    createdAt: TODAY,
  },
]

/**
 * Recreación de Notas (Historial → Notas): texto libre sin consigna fija,
 * distinto de las reflexiones de Momento Mori/Revisión mensual. Mismos campos
 * (título opcional + cuerpo), mismas acciones (editar / eliminar).
 */
export function NotasSection() {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [notes, setNotes] = useState<Note[]>(DEMO_NOTES)

  const sortedNotes = useMemo(
    () =>
      [...notes].sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? 1 : -1
        return a.createdAt < b.createdAt ? 1 : -1
      }),
    [notes],
  )

  const saveNote = () => {
    const text = body.trim()
    if (!text) return
    setNotes((prev) => [
      { id: createId('nota'), date: TODAY, title: title.trim() || undefined, body: text, createdAt: new Date().toISOString() },
      ...prev,
    ])
    setTitle('')
    setBody('')
  }

  return (
    <SectionFrame
      eyebrow="Notas"
      title="Lo que no encaja en un objetivo ni en una tarea."
      subtitle="Texto libre con título opcional y fecha — sin consigna, para cualquier otra cosa."
      className="pr-notas"
    >
      <section className="card">
        <div className="card__header">
          <h3 className="card__title">Nueva nota</h3>
        </div>
        <div className="field" style={{ marginBottom: 12 }}>
          <label className="field__label" htmlFor="pr-note-title">
            Título (opcional)
          </label>
          <input
            id="pr-note-title"
            className="input"
            style={{ width: '100%' }}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="field" style={{ marginBottom: 12 }}>
          <label className="field__label" htmlFor="pr-note-body">
            Nota
          </label>
          <textarea
            id="pr-note-body"
            className="input"
            style={{ width: '100%', minHeight: 90, resize: 'vertical' }}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>
        <button type="button" className="btn btn--primary" onClick={saveNote}>
          Guardar nota
        </button>
      </section>

      {sortedNotes.length > 0 && (
        <section className="card" style={{ marginTop: 16 }}>
          <div className="card__header">
            <h3 className="card__title">Notas anteriores</h3>
          </div>
          <ul className="subgoal-list">
            {sortedNotes.map((note) =>
              editingId === note.id ? (
                <NoteEditor
                  key={note.id}
                  note={note}
                  onSave={(patch) => {
                    setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, ...patch } : n)))
                    setEditingId(null)
                  }}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <li className="subgoal" key={note.id} style={{ alignItems: 'flex-start', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
                    <span className="card__hint" style={{ flex: 1 }}>
                      {formatLongDate(note.date)}
                      {note.title ? ` · ${note.title}` : ''}
                    </span>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Editar nota del ${formatLongDate(note.date)}`}
                      onClick={() => setEditingId(note.id)}
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="subgoal__remove"
                      aria-label={`Eliminar nota del ${formatLongDate(note.date)}`}
                      onClick={() => setNotes((prev) => prev.filter((n) => n.id !== note.id))}
                    >
                      ×
                    </button>
                  </div>
                  <span style={{ whiteSpace: 'pre-wrap' }}>{note.body}</span>
                </li>
              ),
            )}
          </ul>
        </section>
      )}
    </SectionFrame>
  )
}

interface EditorProps {
  note: Note
  onSave: (patch: Partial<Omit<Note, 'id'>>) => void
  onCancel: () => void
}

function NoteEditor({ note, onSave, onCancel }: EditorProps) {
  const [title, setTitle] = useState(note.title ?? '')
  const [body, setBody] = useState(note.body)

  return (
    <li className="subgoal" style={{ alignItems: 'flex-start', flexDirection: 'column' }}>
      <div className="field" style={{ width: '100%', marginBottom: 8 }}>
        <input
          className="input"
          style={{ width: '100%' }}
          aria-label="Título de la nota"
          placeholder="Título (opcional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="field" style={{ width: '100%', marginBottom: 8 }}>
        <textarea
          className="input"
          style={{ width: '100%', minHeight: 90, resize: 'vertical' }}
          aria-label="Cuerpo de la nota"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>
      <div className="row">
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => {
            const text = body.trim()
            if (!text) return
            onSave({ title: title.trim() || undefined, body: text })
          }}
        >
          Guardar cambios
        </button>
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </li>
  )
}
