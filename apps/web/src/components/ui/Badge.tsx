import { HTMLAttributes } from 'react'

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-sand text-charcoal',
  success: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
  warning: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
  error: 'bg-red-50 text-error ring-1 ring-inset ring-red-200',
  info: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200',
}

export function Badge({ variant = 'default', className = '', children, ...props }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center px-2 py-0.5
        text-xs font-medium rounded-subtle
        ${variantStyles[variant]}
        ${className}
      `}
      {...props}
    >
      {children}
    </span>
  )
}

export function statusBadge(status: string): BadgeVariant {
  switch (status) {
    case 'PUBLISHED': return 'success'
    case 'DRAFT': return 'warning'
    case 'ARCHIVED': return 'default'
    case 'IN_PROGRESS': return 'info'
    case 'SUBMITTED': return 'warning'
    case 'GRADED': return 'success'
    default: return 'default'
  }
}
