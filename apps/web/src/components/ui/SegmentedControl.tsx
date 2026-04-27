interface SegmentedControlOption {
  value: string
  label: string
}

interface SegmentedControlProps {
  options: SegmentedControlOption[]
  value: string
  onChange: (value: string) => void
  ariaLabel: string
}

export function SegmentedControl({ options, value, onChange, ariaLabel }: SegmentedControlProps) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex rounded-comfortable border border-border-cream bg-sand p-1"
    >
      {options.map((option) => {
        const active = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-subtle px-3 py-1.5 text-sm font-medium transition ${
              active
                ? 'bg-ivory text-nearblack shadow-ring'
                : 'text-stone hover:text-charcoal'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
