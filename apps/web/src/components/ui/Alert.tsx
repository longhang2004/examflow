import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react'

type AlertType = 'error' | 'success' | 'warning' | 'info'

interface AlertProps {
  type: AlertType
  message: string
  className?: string
}

const config: Record<AlertType, { bg: string; text: string; border: string; icon: typeof AlertCircle }> = {
  error: { bg: 'bg-red-50', text: 'text-error', border: 'border-red-200', icon: AlertCircle },
  success: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle },
  warning: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: AlertTriangle },
  info: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: Info },
}

export function Alert({ type, message, className = '' }: AlertProps) {
  const { bg, text, border, icon: Icon } = config[type]

  return (
    <div
      className={`flex items-center gap-3 p-4 rounded-comfortable border ${bg} ${border} ${className}`}
      role="alert"
    >
      <Icon className={`w-4 h-4 shrink-0 ${text}`} />
      <p className={`text-sm ${text}`}>{message}</p>
    </div>
  )
}
