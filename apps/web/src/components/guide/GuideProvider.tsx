'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { BookOpen, Check, ChevronLeft, ChevronRight, HelpCircle, X } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import {
  defaultGuide,
  getGuideByKey,
  getGuideForPath,
  getOnboardingSteps,
  getRoleLabel,
  sectionGuides,
  type SectionGuide,
} from '@/lib/guides'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

function isAuthenticatedPath(pathname: string) {
  return (
    pathname.startsWith('/teacher') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/learning') ||
    pathname.startsWith('/review') ||
    pathname.startsWith('/history') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/attempts') ||
    pathname.startsWith('/exams') ||
    pathname.startsWith('/parent')
  )
}

function ManualContent({ guide }: { guide: SectionGuide }) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm leading-relaxed text-stone">{guide.summary}</p>
        {guide.related?.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {guide.related.map((item) => (
              <span
                key={item}
                className="rounded-full border border-border-cream bg-sand/60 px-2.5 py-1 text-xs font-medium text-olive"
              >
                {item}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        {guide.bullets.map((bullet) => (
          <div key={bullet} className="flex gap-2 rounded-comfortable bg-sand/50 p-3 text-sm text-charcoal">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-terracotta" />
            <span>{bullet}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function GuideProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user } = useAuthStore()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingStep, setOnboardingStep] = useState(0)
  const [manualGuide, setManualGuide] = useState<SectionGuide | null>(null)

  const currentGuide = useMemo(() => getGuideForPath(pathname), [pathname])
  const onboardingSteps = useMemo(() => getOnboardingSteps(user?.role), [user?.role])
  const showFloatingHelp = Boolean(user && isAuthenticatedPath(pathname))

  useEffect(() => {
    if (!user || !isAuthenticatedPath(pathname)) return

    const key = `examflow:onboarding:${user.id}`
    if (!localStorage.getItem(key)) {
      setOnboardingStep(0)
      setShowOnboarding(true)
    }
  }, [pathname, user])

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ guideKey?: string }>).detail
      setManualGuide(getGuideByKey(detail?.guideKey) ?? currentGuide ?? defaultGuide)
    }

    window.addEventListener('examflow:open-guide', handler)
    return () => window.removeEventListener('examflow:open-guide', handler)
  }, [currentGuide])

  const finishOnboarding = () => {
    if (user) localStorage.setItem(`examflow:onboarding:${user.id}`, new Date().toISOString())
    setShowOnboarding(false)
  }

  const activeStep = onboardingSteps[onboardingStep] ?? onboardingSteps[0]
  const lastStep = onboardingStep === onboardingSteps.length - 1

  return (
    <>
      {children}

      {showFloatingHelp && (
        <div className="fixed bottom-4 right-4 z-40">
          <div className="group relative">
            <button
              type="button"
              onClick={() => setManualGuide(currentGuide)}
              aria-label="Open page guide"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border-cream bg-nearblack text-ivory shadow-whisper transition hover:bg-charcoal-warm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
            >
              <HelpCircle className="h-5 w-5" />
            </button>
            <div className="pointer-events-none absolute bottom-14 right-0 hidden w-72 rounded-comfortable border border-border-cream bg-ivory p-3 text-left shadow-whisper group-hover:block">
              <p className="text-sm font-semibold text-nearblack">{currentGuide.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-stone">{currentGuide.summary}</p>
              <p className="mt-2 text-[11px] font-medium text-terracotta">Click ? to open the manual</p>
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={showOnboarding}
        onClose={finishOnboarding}
        title={getRoleLabel(user?.role)}
        className="max-w-xl"
      >
        {activeStep && (
          <div className="space-y-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-comfortable bg-terracotta/10 text-terracotta ring-1 ring-inset ring-terracotta/20">
                <BookOpen className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-stone">
                  Step {onboardingStep + 1} of {onboardingSteps.length}
                </p>
                <h3 className="mt-1 text-lg font-semibold text-nearblack">{activeStep.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-stone">{activeStep.description}</p>
              </div>
            </div>

            <div className="space-y-2">
              {activeStep.bullets.map((bullet) => (
                <div key={bullet} className="flex gap-2 rounded-comfortable bg-sand/50 p-3 text-sm text-charcoal">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-terracotta" />
                  <span>{bullet}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-border-cream pt-4">
              <Button type="button" variant="ghost" onClick={finishOnboarding}>
                <X className="h-4 w-4" />
                Skip
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={onboardingStep === 0}
                  onClick={() => setOnboardingStep((step) => Math.max(0, step - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    if (lastStep) finishOnboarding()
                    else setOnboardingStep((step) => step + 1)
                  }}
                >
                  {lastStep ? 'Finish' : 'Next'}
                  {!lastStep && <ChevronRight className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={Boolean(manualGuide)}
        onClose={() => setManualGuide(null)}
        title={manualGuide?.title ?? 'Guide'}
        className="max-w-2xl"
      >
        {manualGuide && (
          <div className="grid gap-6 lg:grid-cols-[1fr_13rem]">
            <ManualContent guide={manualGuide} />
            <aside className="rounded-comfortable border border-border-cream bg-sand/40 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone">Other guides</p>
              <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
                {sectionGuides.map((guide) => (
                  <button
                    key={guide.key}
                    type="button"
                    onClick={() => setManualGuide(guide)}
                    className={`block w-full rounded px-2 py-1.5 text-left text-xs font-medium transition ${
                      guide.key === manualGuide.key
                        ? 'bg-terracotta/10 text-terracotta'
                        : 'text-olive hover:bg-ivory hover:text-charcoal'
                    }`}
                  >
                    {guide.title}
                  </button>
                ))}
              </div>
            </aside>
          </div>
        )}
      </Modal>
    </>
  )
}
