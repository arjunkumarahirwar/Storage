import { useCallback, useRef, useState } from 'react'
import type { ToastMessage } from '../lib/types'

export function useToasts() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const counter = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const push = useCallback(
    (text: string, tone: ToastMessage['tone'] = 'info') => {
      const id = ++counter.current
      setToasts((current) => [...current.slice(-2), { id, text, tone }])
      window.setTimeout(() => dismiss(id), 3800)
    },
    [dismiss],
  )

  return { toasts, push, dismiss }
}
