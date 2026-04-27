'use client'

import { Plus, X } from 'lucide-react'
import { useMemo, useState } from 'react'

export interface TagOption {
  label: string
  count?: number
}

interface TagSelectorProps {
  label?: string
  selected: string[]
  available?: TagOption[]
  onChange: (tags: string[]) => void
  allowCreate?: boolean
  placeholder?: string
}

function normalizeTag(tag: string) {
  return tag.trim().replace(/\s+/g, ' ')
}

export function TagSelector({
  label = 'Tags',
  selected,
  available = [],
  onChange,
  allowCreate = true,
  placeholder = 'Add tag...',
}: TagSelectorProps) {
  const [draft, setDraft] = useState('')
  const selectedKeys = useMemo(() => new Set(selected.map((tag) => tag.toLowerCase())), [selected])
  const filteredOptions = available.filter((tag) => !selectedKeys.has(tag.label.toLowerCase()))

  const addTag = (rawTag: string) => {
    const tag = normalizeTag(rawTag)
    if (!tag || selectedKeys.has(tag.toLowerCase())) return
    onChange([...selected, tag].sort((a, b) => a.localeCompare(b)))
    setDraft('')
  }

  const removeTag = (tag: string) => {
    onChange(selected.filter((item) => item.toLowerCase() !== tag.toLowerCase()))
  }

  return (
    <div className="space-y-2">
      {label && <label className="block text-sm font-medium text-charcoal">{label}</label>}

      <div className="flex min-h-11 flex-wrap items-center gap-2 rounded-comfortable border border-border-warm bg-ivory px-2 py-2">
        {selected.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => removeTag(tag)}
            className="inline-flex items-center gap-1 rounded-pill bg-terracotta/10 px-2.5 py-1 text-xs font-medium text-terracotta ring-1 ring-inset ring-terracotta/20"
          >
            {tag}
            <X className="h-3 w-3" />
          </button>
        ))}
        {allowCreate && (
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ',') {
                event.preventDefault()
                addTag(draft)
              }
            }}
            onBlur={() => addTag(draft)}
            placeholder={selected.length ? '' : placeholder}
            className="min-w-32 flex-1 bg-transparent px-1 py-1 text-sm text-nearblack placeholder:text-stone focus:outline-none"
          />
        )}
      </div>

      {filteredOptions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {filteredOptions.slice(0, 24).map((tag) => (
            <button
              key={tag.label}
              type="button"
              onClick={() => addTag(tag.label)}
              className="inline-flex items-center gap-1 rounded-pill border border-border-cream bg-sand px-2.5 py-1 text-xs font-medium text-olive transition hover:border-terracotta hover:text-terracotta"
            >
              <Plus className="h-3 w-3" />
              {tag.label}
              {tag.count ? <span className="text-stone">{tag.count}</span> : null}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
