import { Fragment, ReactNode } from 'react'

interface RichTextProps {
  text?: string | null
  imageUrl?: string | null
  className?: string
  imageAlt?: string
}

function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_|`[^`]+`)/g)

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('_') && part.endsWith('_')) {
      return <em key={index}>{part.slice(1, -1)}</em>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={index} className="rounded bg-sand px-1 py-0.5 text-[0.9em]">
          {part.slice(1, -1)}
        </code>
      )
    }

    const lines = part.split('\n')
    return (
      <Fragment key={index}>
        {lines.map((line, lineIndex) => (
          <Fragment key={lineIndex}>
            {lineIndex > 0 && <br />}
            {line}
          </Fragment>
        ))}
      </Fragment>
    )
  })
}

export function RichText({ text, imageUrl, className = '', imageAlt = 'Attached image' }: RichTextProps) {
  const paragraphs = String(text ?? '')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)

  return (
    <div className={`space-y-3 ${className}`}>
      {imageUrl && (
        <img
          src={imageUrl}
          alt={imageAlt}
          className="max-h-72 w-auto max-w-full rounded-comfortable border border-border-cream object-contain"
        />
      )}
      {paragraphs.length > 0 ? (
        paragraphs.map((paragraph, index) => (
          <p key={index} className="whitespace-pre-wrap">
            {renderInline(paragraph)}
          </p>
        ))
      ) : (
        <span />
      )}
    </div>
  )
}
