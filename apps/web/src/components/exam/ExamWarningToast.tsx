'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, ShieldAlert, XOctagon } from 'lucide-react'

interface ExamWarningToastProps {
  warning: string | null
  tabSwitchCount: number
}

export function ExamWarningToast({ warning, tabSwitchCount }: ExamWarningToastProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (warning) {
      setVisible(true)
      const timer = setTimeout(() => setVisible(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [warning])

  if (!visible || !warning) return null

  let level: 'warning' | 'danger' | 'critical' = 'warning'
  let Icon = AlertTriangle
  let bgColor = 'bg-amber-50 border-amber-300'
  let textColor = 'text-amber-800'
  let iconColor = 'text-amber-600'

  if (tabSwitchCount >= 5) {
    level = 'critical'
    Icon = XOctagon
    bgColor = 'bg-red-50 border-red-300'
    textColor = 'text-red-800'
    iconColor = 'text-red-600'
  } else if (tabSwitchCount >= 3) {
    level = 'danger'
    Icon = ShieldAlert
    bgColor = 'bg-orange-50 border-orange-300'
    textColor = 'text-orange-800'
    iconColor = 'text-orange-600'
  }

  return (
    <div className={`fixed top-4 right-4 z-[90] max-w-sm animate-slide-in-right`}>
      <div className={`${bgColor} border rounded-lg p-4 shadow-lg flex items-start gap-3`}>
        <Icon className={`w-5 h-5 ${iconColor} shrink-0 mt-0.5`} />
        <p className={`text-sm ${textColor} font-medium`}>{warning}</p>
      </div>
    </div>
  )
}
