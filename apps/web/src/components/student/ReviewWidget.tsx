'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, BookOpenCheck, CalendarClock, Flame } from 'lucide-react'
import { api } from '@/lib/api-client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface ReviewStats {
  totalCards: number
  dueToday: number
  dueTomorrow: number
  dueThisWeek: number
  masteredCards: number
  newCards: number
  averageEaseFactor: number
  streakDays: number
}

export function ReviewWidget() {
  const { data: stats } = useQuery({
    queryKey: ['review-stats'],
    queryFn: () => api.get<ReviewStats>('/review/stats'),
  })

  if (!stats || stats.totalCards === 0) {
    return null
  }

  return (
    <Card variant="bordered" padding="lg">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-comfortable bg-sand flex items-center justify-center">
              <BookOpenCheck className="w-5 h-5 text-terracotta" />
            </div>
            <div>
              <h2 className="font-sans font-semibold tracking-tight text-lg text-nearblack">
                Review today
              </h2>
              <p className="text-sm text-stone">
                {stats.dueToday > 0
                  ? `${stats.dueToday} card${stats.dueToday === 1 ? '' : 's'} due now`
                  : 'All due review is complete'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-stone">
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="w-4 h-4 text-olive" />
              {stats.dueTomorrow} due tomorrow
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-terracotta" />
              {stats.streakDays} day streak
            </span>
          </div>
        </div>

        <Link href="/review" className="shrink-0">
          <Button disabled={stats.dueToday === 0}>
            Start review
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    </Card>
  )
}
