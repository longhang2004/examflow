'use client'

import { HelpCircle } from 'lucide-react'
import { getGuideByKey, getGuideForPath, type SectionGuide } from '@/lib/guides'
import { usePathname } from 'next/navigation'

interface HelpHintProps {
  guideKey?: string
  guide?: SectionGuide
  label?: string
  className?: string
}

function openGuide(guideKey: string) {
  window.dispatchEvent(new CustomEvent('examflow:open-guide', { detail: { guideKey } }))
}

export function HelpHint({ guideKey, guide, label = 'Open guide', className = '' }: HelpHintProps) {
  const pathname = usePathname()
  const resolvedGuide = guide ?? getGuideByKey(guideKey) ?? getGuideForPath(pathname)

  return (
    <span className={`relative inline-flex shrink-0 items-center ${className}`}>
      <button
        type="button"
        aria-label={label}
        onClick={() => openGuide(resolvedGuide.key)}
        className="group inline-flex h-7 w-7 items-center justify-center rounded-full border border-border-cream bg-ivory text-stone shadow-sm transition hover:border-ring-warm hover:text-terracotta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
      >
        <HelpCircle className="h-4 w-4" />
        <span className="pointer-events-none absolute right-0 top-9 z-40 hidden w-72 rounded-comfortable border border-border-cream bg-ivory p-3 text-left shadow-whisper group-hover:block group-focus-visible:block">
          <span className="block text-sm font-semibold text-nearblack">{resolvedGuide.title}</span>
          <span className="mt-1 block text-xs leading-relaxed text-stone">{resolvedGuide.summary}</span>
          <span className="mt-2 block text-[11px] font-medium text-terracotta">Click for the full guide</span>
        </span>
      </button>
    </span>
  )
}
