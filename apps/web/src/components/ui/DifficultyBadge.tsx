import { Badge } from './Badge'

const labels: Record<number, string> = {
  1: 'Easy',
  2: 'Medium',
  3: 'Hard',
}

export function DifficultyBadge({ value }: { value?: number }) {
  const level = value && value >= 1 && value <= 3 ? value : 1
  return <Badge variant="info">{labels[level]}</Badge>
}
