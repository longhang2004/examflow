'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { api } from '@/lib/api-client'

interface UseFullscreenReturn {
  isFullscreen: boolean
  requestFullscreen: () => Promise<void>
  exitCount: number
}

export function useFullscreen(attemptId: string): UseFullscreenReturn {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [exitCount, setExitCount] = useState(0)
  const exitStartTime = useRef<number | null>(null)
  const exitTimestamp = useRef<string | null>(null)

  const requestFullscreen = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen()
    } catch {
      // Silently fail if fullscreen not supported
    }
  }, [])

  useEffect(() => {
    // Auto-enter fullscreen on mount
    requestFullscreen()

    const handler = () => {
      const isFs = !!document.fullscreenElement
      setIsFullscreen(isFs)

      if (!isFs) {
        // Count a single fullscreen-exit event until user re-enters fullscreen.
        if (!exitStartTime.current) {
          exitStartTime.current = Date.now()
          exitTimestamp.current = new Date().toISOString()
          setExitCount((prev) => prev + 1)
        }
      } else if (exitStartTime.current) {
        const duration = Date.now() - exitStartTime.current
        const timestamp = exitTimestamp.current ?? new Date(exitStartTime.current).toISOString()
        exitStartTime.current = null
        exitTimestamp.current = null

        api
          .post(`/attempts/${attemptId}/events/fullscreen-exit`, {
            timestamp,
            durationMs: duration,
          })
          .catch(() => {})
      }
    }

    document.addEventListener('fullscreenchange', handler)
    // Set initial state
    setIsFullscreen(!!document.fullscreenElement)

    return () => {
      document.removeEventListener('fullscreenchange', handler)
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {})
      }
    }
  }, [attemptId, requestFullscreen])

  return { isFullscreen, requestFullscreen, exitCount }
}
