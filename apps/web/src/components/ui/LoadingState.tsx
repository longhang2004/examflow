import { Spinner } from './Spinner'

interface LoadingStateProps {
  label?: string
}

export function LoadingState({ label = 'Loading...' }: LoadingStateProps) {
  return (
    <div className="flex items-center gap-3 rounded-comfortable border border-border-cream bg-ivory px-4 py-3 text-sm text-stone">
      <Spinner className="h-4 w-4" />
      {label}
    </div>
  )
}
