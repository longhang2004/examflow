import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replaceAll(' ', '-')

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-charcoal mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full px-3 py-2 text-sm text-nearblack
            bg-ivory border border-border-cream rounded-generous
            placeholder:text-stone
            focus:outline-none focus:border-focus focus:ring-2 focus:ring-focus/20
            transition-colors duration-150
            ${error ? 'border-error focus:border-error focus:ring-error/20' : ''}
            ${className}
          `}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-error">{error}</p>}
      </div>
    )
  },
)

Input.displayName = 'Input'
