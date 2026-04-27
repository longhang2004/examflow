'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, X } from 'lucide-react'
import { api } from '@/lib/api-client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { PreferencesPanel } from '@/components/settings/PreferencesPanel'
import { AccountPanel } from '@/components/settings/AccountPanel'
import { useI18n } from '@/lib/i18n'

interface ParentRequest {
  parentId: string
  parent: { id: string; displayName: string; email: string }
  createdAt: string
}

export default function StudentSettingsPage() {
  const queryClient = useQueryClient()
  const { t } = useI18n()
  const { data, isLoading } = useQuery({
    queryKey: ['student-parent-requests'],
    queryFn: () => api.get<ParentRequest[]>('/student/parent-requests'),
  })

  const respondMutation = useMutation({
    mutationFn: ({ parentId, accept }: { parentId: string; accept: boolean }) =>
      api.patch(`/student/parent-requests/${parentId}`, { accept }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-parent-requests'] })
    },
  })

  const requests = data ?? []

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title={t('common', 'settings')} description={t('settings', 'description')} />

      <PreferencesPanel />
      <AccountPanel />

      <Card>
        <h2 className="font-sans font-semibold tracking-tight text-lg text-nearblack mb-4">
          {t('settings', 'parentRequests')}
        </h2>

        {isLoading ? (
          <p className="text-sm text-stone">{t('settings', 'loadingRequests')}</p>
        ) : requests.length === 0 ? (
          <p className="text-sm text-stone">{t('settings', 'noParentRequests')}</p>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => (
              <div
                key={request.parent.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-border-cream rounded-comfortable p-3"
              >
                <div>
                  <p className="font-medium text-charcoal">{request.parent.displayName}</p>
                  <p className="text-xs text-stone">{request.parent.email}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => respondMutation.mutate({ parentId: request.parent.id, accept: true })}
                    loading={respondMutation.isPending}
                  >
                    <Check className="w-4 h-4" />
                    {t('settings', 'accept')}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => respondMutation.mutate({ parentId: request.parent.id, accept: false })}
                    loading={respondMutation.isPending}
                  >
                    <X className="w-4 h-4" />
                    {t('settings', 'decline')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
