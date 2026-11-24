import { useCallback, useEffect, useState } from 'react'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../lib/supabase'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const DISMISS_KEY = 'pyq:install-card:v1'

const isStandalone = () => {
  if (typeof window === 'undefined') return false
  const media = window.matchMedia?.('(display-mode: standalone)').matches ?? false
  const ios = (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  return media || ios
}

const isIos = () => {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  // iPadOS 13+ reports a desktop user agent, so check the touch points too.
  return /iphone|ipad|ipod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)
}

const readDismissed = () => {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

export interface PwaState {
  /** The browser is offering us an install prompt right now. */
  canInstall: boolean
  /** Already running from the home screen. */
  installed: boolean
  /** iPhone / iPad: installing is manual, so show the instructions instead. */
  iosHint: boolean
  offline: boolean
  /** A newer version is waiting — a reload picks it up. */
  updateReady: boolean
  dismissed: boolean
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>
  dismissInstall: () => void
  applyUpdate: () => void
  dismissUpdate: () => void
}

/**
 * Everything the site needs to behave like an installable app: the install
 * prompt, the iOS instructions, the offline flag and the "new version" flag.
 * The service worker itself lives in public/sw.js.
 */
export function usePwa(): PwaState {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(isStandalone)
  const [offline, setOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  )
  const [updateReady, setUpdateReady] = useState(false)
  const [dismissed, setDismissed] = useState(readDismissed)

  // The install prompt can appear at any time; hold on to it until asked.
  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setInstallEvent(null)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  // Connection changes drive the offline strip.
  useEffect(() => {
    const online = () => setOffline(false)
    const down = () => setOffline(true)
    window.addEventListener('online', online)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', online)
      window.removeEventListener('offline', down)
    }
  }, [])

  // Register the worker in production only: in dev it would cache the dev
  // server's module graph and cause confusing stale code.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
    if (!import.meta.env.PROD) return

    let hadController = Boolean(navigator.serviceWorker.controller)

    const onControllerChange = () => {
      // The first claim is just this page's own worker starting up; anything
      // after that means a newer build has taken over.
      if (hadController) setUpdateReady(true)
      hadController = true
    }

    /** Hands the worker the listing request so it can save it for offline use. */
    const warmListing = async () => {
      if (!navigator.onLine) return
      try {
        const ready = await navigator.serviceWorker.ready
        const worker = ready.active ?? navigator.serviceWorker.controller
        worker?.postMessage({
          type: 'warm',
          requests: [
            {
              url: `${SUPABASE_URL}/rest/v1/papers?select=*`,
              headers: {
                apikey: SUPABASE_ANON_KEY,
                authorization: `Bearer ${SUPABASE_ANON_KEY}`,
              },
            },
          ],
        })
      } catch {
        /* nothing saved — the app still works online */
      }
    }

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
        if (registration.waiting) setUpdateReady(true)
        registration.addEventListener('updatefound', () => {
          const installing = registration.installing
          if (!installing) return
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateReady(true)
            }
          })
        })
        void warmListing()
        // Check for a new build on each launch and when the tab wakes up.
        const check = () => void registration.update().catch(() => {})
        check()
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') check()
        })
      } catch {
        /* the site works without a worker */
      }
    }

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
    void register()

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (!installEvent) return 'unavailable' as const
    try {
      await installEvent.prompt()
      const choice = await installEvent.userChoice
      setInstallEvent(null)
      return choice.outcome
    } catch {
      return 'unavailable' as const
    }
  }, [installEvent])

  const dismissInstall = useCallback(() => {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* private mode */
    }
  }, [])

  const applyUpdate = useCallback(() => {
    window.location.reload()
  }, [])

  const dismissUpdate = useCallback(() => setUpdateReady(false), [])

  return {
    canInstall: installEvent !== null,
    // On iOS there is no prompt event; the card teaches the Share sheet way.
    iosHint: !installed && isIos() && !installEvent,
    installed,
    offline,
    updateReady,
    dismissed,
    promptInstall,
    dismissInstall,
    applyUpdate,
    dismissUpdate,
  }
}
