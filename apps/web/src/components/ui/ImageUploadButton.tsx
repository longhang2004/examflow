'use client'

import { useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { Button } from './Button'

interface ImageUploadButtonProps {
  imageUrl?: string
  onChange: (url: string | undefined) => void
}

export function ImageUploadButton({ imageUrl, onChange }: ImageUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const upload = async (file: File | null) => {
    setError('')
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Only image files are supported')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be 5MB or smaller')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/uploads/image`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: formData,
      })
      const payload = await res.json()
      if (!res.ok) {
        throw new Error(payload?.error?.message ?? 'Image upload failed')
      }
      onChange(payload?.data?.secureUrl ?? payload?.secureUrl ?? payload?.data?.url ?? payload?.url)
    } catch (err: any) {
      setError(err?.message ?? 'Image upload failed')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-2">
      {imageUrl && (
        <div className="relative inline-block">
          <img
            src={imageUrl}
            alt="Uploaded"
            className="max-h-40 max-w-full rounded-comfortable border border-border-cream object-contain"
          />
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="absolute right-2 top-2 rounded-full bg-nearblack/70 p-1 text-white"
            aria-label="Remove image"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => upload(event.target.files?.[0] ?? null)}
        />
        <Button type="button" variant="secondary" size="sm" loading={uploading} onClick={() => inputRef.current?.click()}>
          <ImagePlus className="h-4 w-4" />
          {imageUrl ? 'Replace image' : 'Add image'}
        </Button>
        {error && <span className="text-xs text-error">{error}</span>}
      </div>
    </div>
  )
}
