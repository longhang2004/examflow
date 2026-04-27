'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { api } from '@/lib/api-client'

interface UseExamTimerReturn {
  remainingSeconds: number | null
  isExpired: boolean
  formatted: string
}

export function useExamTimer(
  attemptId: string,
  hasDuration: boolean,
  onExpire: () => void,
): UseExamTimerReturn {
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null)
  const [isExpired, setIsExpired] = useState(false)
  const expiredRef = useRef(false)
  const onExpireRef = useRef(onExpire)
  onExpireRef.current = onExpire

  // Sync with server on mount and every 60s
  const syncWithServer = useCallback(async () => {
    try {
      const result = await api.get<any>(`/attempts/${attemptId}/timer-status`)
      if (result.expired) {
        if (!expiredRef.current) {
          expiredRef.current = true
          setIsExpired(true)
          onExpireRef.current()
        }
        return
      }
      if (result.remainingSeconds !== null) {
        setRemainingSeconds(result.remainingSeconds)
      }
    } catch {
      // Fallback: keep counting locally
    }
  }, [attemptId])

  useEffect(() => {
    if (!hasDuration) return

    syncWithServer()
    const syncInterval = setInterval(syncWithServer, 60_000) // sync every 60s

    return () => clearInterval(syncInterval)
  }, [hasDuration, syncWithServer])

  // Local countdown
  useEffect(() => {
    if (!hasDuration || remainingSeconds === null) return

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev === null) return null
        const next = prev - 1
        if (next <= 0 && !expiredRef.current) {
          expiredRef.current = true
          setIsExpired(true)
          onExpireRef.current()
          clearInterval(interval)
          return 0
        }
        return Math.max(0, next)
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [hasDuration, remainingSeconds !== null]) // restart interval when initial sync completes

  const mins = Math.floor((remainingSeconds ?? 0) / 60)
  const secs = Math.floor((remainingSeconds ?? 0) % 60)
  const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`

  return { remainingSeconds, isExpired, formatted }
}
