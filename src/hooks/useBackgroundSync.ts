'use client'

import { useEffect, useRef } from 'react'

export function useBackgroundSync(
  onSync: () => void,
  intervalMs = 120000,
  enabled = true
) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!enabled) return

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        onSync()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    intervalRef.current = setInterval(onSync, intervalMs)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [onSync, intervalMs, enabled])
}
