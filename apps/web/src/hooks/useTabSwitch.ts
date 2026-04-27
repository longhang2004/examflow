'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { api } from '@/lib/api-client'

interface UseTabSwitchReturn {
  switchCount: number
  lastWarning: string | null
  autoSubmitted: boolean
}

export function useTabSwitch(
  attemptId: string,
  onAutoSubmit: () => void,
): UseTabSwitchReturn {
  const [switchCount, setSwitchCount] = useState(0)
  const [lastWarning, setLastWarning] = useState<string | null>(null)
  const [autoSubmitted, setAutoSubmitted] = useState(false)
  const onAutoSubmitRef = useRef(onAutoSubmit)
  onAutoSubmitRef.current = onAutoSubmit

  useEffect(() => {
    const handler = async () => {
      if (document.visibilityState === 'hidden') {
        setSwitchCount((prev) => prev + 1)

        try {
          const result = await api.post<any>(`/attempts/${attemptId}/events/tab-switch`, {
            timestamp: new Date().toISOString(),
          })

          if (result.autoSubmitted) {
            setAutoSubmitted(true)
            onAutoSubmitRef.current()
            return
          }

          if (result.warning) {
            setLastWarning(result.warning)
          }
        } catch {
          // Silently fail
        }
      } else if (document.visibilityState === 'visible') {
        // Clear warning after 5s when user returns
        setTimeout(() => setLastWarning(null), 5000)
      }
    }

    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [attemptId])

  return { switchCount, lastWarning, autoSubmitted }
}
