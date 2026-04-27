'use client'

import { Bold, Code, Italic, List } from 'lucide-react'
import { ImageUploadButton } from './ImageUploadButton'
import { RichText } from './RichText'

interface RichTextEditorProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  error?: string
  imageUrl?: string
  onImageChange?: (url: string | undefined) => void
  minHeightClassName?: string
}

export function RichTextEditor({
  label,
  value,
  onChange,
  placeholder,
  error,
  imageUrl,
  onImageChange,
  minHeightClassName = 'min-h-24',
}: RichTextEditorProps) {
  const insert = (before: string, after = before) => {
    onChange(`${value}${value ? ' ' : ''}${before}text${after}`)
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-charcoal">{label}</label>
      <div className="flex flex-wrap items-center gap-1">
        <button type="button" aria-label="Bold" title="Bold" onClick={() => insert('**')} className="rounded border border-border-cream p-1.5 text-stone hover:text-charcoal">
          <Bold className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Italic" title="Italic" onClick={() => insert('_')} className="rounded border border-border-cream p-1.5 text-stone hover:text-charcoal">
          <Italic className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Code" title="Code" onClick={() => insert('`')} className="rounded border border-border-cream p-1.5 text-stone hover:text-charcoal">
          <Code className="h-4 w-4" />
        </button>
        <button type="button" aria-label="Bulleted list" title="Bulleted list" onClick={() => onChange(`${value}${value ? '\n' : ''}- item`)} className="rounded border border-border-cream p-1.5 text-stone hover:text-charcoal">
          <List className="h-4 w-4" />
        </button>
      </div>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`w-full border border-border-warm rounded-comfortable px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta ${minHeightClassName}`}
      />
      {error && <p className="text-xs text-error">{error}</p>}
      {onImageChange && <ImageUploadButton imageUrl={imageUrl} onChange={onImageChange} />}
      {(value || imageUrl) && (
        <div className="rounded-comfortable border border-border-cream bg-sand/30 p-3">
          <p className="mb-2 text-xs font-medium text-stone">Preview</p>
          <RichText text={value} imageUrl={imageUrl} className="text-sm text-charcoal" />
        </div>
      )}
    </div>
  )
}
