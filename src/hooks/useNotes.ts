import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Difficulty, NoteEntry } from '../lib/types'

const LOCAL_KEY = 'mp-pyq-notes:v1'

type LocalNotes = Record<string, { note?: string; difficulty?: Difficulty | null }>

const readLocal = (): LocalNotes => {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? (parsed as LocalNotes) : {}
  } catch {
    return {}
  }
}

const writeLocal = (notes: LocalNotes) => {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(notes))
  } catch {
    // Storage blocked — the note still lives in memory for this visit.
  }
}

const fromLocal = (raw: LocalNotes): Map<string, NoteEntry> => {
  const map = new Map<string, NoteEntry>()
  for (const [paperId, entry] of Object.entries(raw)) {
    const note = typeof entry?.note === 'string' ? entry.note : ''
    const difficulty =
      entry?.difficulty === 'easy' ||
      entry?.difficulty === 'medium' ||
      entry?.difficulty === 'hard'
        ? entry.difficulty
        : null
    if (note || difficulty) map.set(paperId, { note, difficulty })
  }
  return map
}

export interface NotesState {
  notes: Map<string, NoteEntry>
  mode: 'account' | 'device'
  save: (paperId: string, entry: NoteEntry) => Promise<void>
}

/**
 * Notes and difficulty ratings are private. Signed-in students keep them in
 * Supabase, guests on the device (and they move to the account on sign-in).
 */
export function useNotes(userId: string | null): NotesState {
  const [notes, setNotes] = useState<Map<string, NoteEntry>>(new Map())
  const [mode, setMode] = useState<'account' | 'device'>('device')
  const mergedFor = useRef<string | null>(null)

  useEffect(() => {
    let active = true

    const loadDevice = () => {
      setNotes(fromLocal(readLocal()))
      setMode('device')
      mergedFor.current = null
    }

    const loadAccount = async (uid: string) => {
      const { data, error } = await supabase
        .from('paper_notes')
        .select('paper_id, note, difficulty')
        .eq('user_id', uid)

      if (!active) return
      if (error) {
        loadDevice()
        return
      }

      const remote = new Map<string, NoteEntry>()
      for (const row of data ?? []) {
        remote.set(row.paper_id as string, {
          note: (row.note as string) ?? '',
          difficulty: (row.difficulty as Difficulty | null) ?? null,
        })
      }

      // First sign-in on this device: carry device notes into the account.
      if (mergedFor.current !== uid) {
        mergedFor.current = uid
        const local = readLocal()
        const rows = Object.entries(local)
          .filter(([paperId]) => !remote.has(paperId))
          .map(([paperId, entry]) => ({
            user_id: uid,
            paper_id: paperId,
            note: typeof entry?.note === 'string' ? entry.note : '',
            difficulty:
              entry?.difficulty === 'easy' ||
              entry?.difficulty === 'medium' ||
              entry?.difficulty === 'hard'
                ? entry.difficulty
                : null,
          }))
          .filter((row) => row.note || row.difficulty)

        if (rows.length) {
          const { error: mergeError } = await supabase
            .from('paper_notes')
            .upsert(rows, { onConflict: 'user_id,paper_id', ignoreDuplicates: true })
          if (!mergeError) {
            writeLocal({})
            for (const row of rows) {
              remote.set(row.paper_id, { note: row.note, difficulty: row.difficulty })
            }
          }
        }
      }

      setNotes(remote)
      setMode('account')
    }

    if (!userId) loadDevice()
    else void loadAccount(userId)

    return () => {
      active = false
    }
  }, [userId])

  const save = useCallback(
    async (paperId: string, entry: NoteEntry) => {
      const note = entry.note.trim().slice(0, 2000)
      const difficulty = entry.difficulty ?? null
      const empty = !note && !difficulty

      const next = new Map(notes)
      if (empty) next.delete(paperId)
      else next.set(paperId, { note, difficulty })
      setNotes(next)

      if (mode === 'device' || !userId) {
        const raw = readLocal()
        if (empty) delete raw[paperId]
        else raw[paperId] = { note, difficulty }
        writeLocal(raw)
        return
      }

      try {
        if (empty) {
          const { error } = await supabase
            .from('paper_notes')
            .delete()
            .eq('user_id', userId)
            .eq('paper_id', paperId)
          if (error) throw error
        } else {
          const { error } = await supabase.from('paper_notes').upsert(
            { user_id: userId, paper_id: paperId, note, difficulty },
            { onConflict: 'user_id,paper_id' },
          )
          if (error) throw error
        }
      } catch {
        setNotes(notes)
        throw new Error('Could not save the note. Check your connection and try again.')
      }
    },
    [notes, mode, userId],
  )

  return { notes, mode, save }
}
