import { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-comfortable border border-border-cream bg-ivory px-6 py-12 text-center">
      {icon && <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-comfortable bg-sand text-stone">{icon}</div>}
      <h2 className="text-base font-semibold text-nearblack">{title}</h2>
      {description && <p className="mx-auto mt-1 max-w-md text-sm text-stone">{description}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}
