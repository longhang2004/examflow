import { ButtonHTMLAttributes, forwardRef } from 'react'
import { Spinner } from './Spinner'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'dark'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const variantStyles = {
  primary:
    'bg-terracotta text-ivory hover:bg-terracotta-light shadow-ring-brand',
  secondary:
    'bg-sand text-charcoal hover:bg-border-warm shadow-ring',
  danger:
    'bg-error text-ivory hover:bg-red-700 shadow-[0px_0px_0px_1px_#b53333]',
  ghost:
    'bg-transparent text-olive hover:bg-sand hover:text-charcoal',
  dark:
    'bg-nearblack text-silver border border-darksurface hover:bg-darksurface',
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
