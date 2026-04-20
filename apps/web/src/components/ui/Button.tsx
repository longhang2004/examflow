import { ButtonHTMLAttributes, forwardRef } from 'react'
import { Spinner } from './Spinner'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'dark'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const variantStyles = {
  primary:
    'bg-terracotta text-ivory hover:bg-terracotta-light shadow-sm focus-visible:ring-offset-2',
  secondary:
    'bg-sand text-charcoal border border-border-cream hover:bg-border-warm/50 shadow-sm',
  danger:
    'bg-error text-ivory hover:bg-red-700 shadow-sm',
  ghost:
    'bg-transparent text-link hover:underline hover:bg-transparent',
  dark:
    'bg-nearblack text-ivory border border-transparent hover:bg-charcoal-warm',
}

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, disabled, children, className = '', ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`
          inline-flex items-center justify-center font-medium
          rounded-comfortable transition-all duration-150
          disabled:opacity-50 disabled:cursor-not-allowed
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-parchment
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `}
        {...props}
      >
        {loading && <Spinner className="w-4 h-4" />}
        {children}
      </button>
    )
  },
)

Button.displayName = 'Button'
