'use client'

import { useEffect, ReactNode } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  className?: string
}

export function Modal({ isOpen, onClose, title, children, className = '' }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-nearblack/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`
          relative bg-ivory rounded-very-rounded shadow-whisper
          border border-border-cream
          w-full mx-4 max-h-[85vh] overflow-y-auto
          ${className || 'max-w-lg'}
        `}
      >
        {title && (
          <div className="px-6 pt-6 pb-4 border-b border-border-cream">
            <h2 className="text-lg font-serif">{title}</h2>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
