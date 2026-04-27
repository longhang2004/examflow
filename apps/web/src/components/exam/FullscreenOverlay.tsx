'use client'

import { Maximize, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface FullscreenOverlayProps {
  exitCount: number
  maxExits?: number
  onRequestFullscreen: () => void
}

export function FullscreenOverlay({
  exitCount,
  maxExits = 3,
  onRequestFullscreen,
}: FullscreenOverlayProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-xl bg-black/70">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-8 text-center space-y-5">
        <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
          <Maximize className="w-8 h-8 text-amber-600" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-nearblack">Bạn đã thoát chế độ toàn màn hình</h2>
          <p className="text-sm text-stone mt-2">
            Vui lòng quay lại để tiếp tục bài thi. Lần thoát: {exitCount}/{maxExits}
          </p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
            <p className="text-xs text-red-800 text-left">
              Thoát {maxExits} lần sẽ bị ghi nhận là vi phạm quy định thi.
            </p>
          </div>
        </div>

        <Button onClick={onRequestFullscreen} className="w-full">
          <Maximize className="w-4 h-4" />
          Quay lại toàn màn hình
        </Button>
      </div>
    </div>
  )
}
