'use client'

import { ReactNode } from 'react'
import { HelpHint } from '@/components/guide/HelpHint'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  helpKey?: string
}

export function PageHeader({ title, description, actions, helpKey }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="text-2xl font-sans font-semibold tracking-tight text-nearblack">
            {title}
          </h1>
          <HelpHint guideKey={helpKey} />
        </div>
        {description && <p className="mt-1 text-sm text-olive">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  )
}
