import React from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  isLoading?: boolean
  fullWidth?: boolean
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  className,
  children,
  disabled,
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 active:scale-95 focus:outline-none focus:ring-4 disabled:opacity-50 disabled:pointer-events-none select-none'

  const variants = {
    primary: 'bg-prithvi-green text-white hover:bg-green-600 focus:ring-green-300 shadow-lg shadow-green-200',
    secondary: 'bg-prithvi-slate text-white hover:bg-slate-700 focus:ring-slate-300 shadow-md',
    danger: 'bg-prithvi-red text-white hover:bg-red-600 focus:ring-red-300 shadow-lg shadow-red-200',
    ghost: 'bg-transparent text-prithvi-slate hover:bg-slate-100 focus:ring-slate-200',
    outline: 'border-2 border-prithvi-green text-prithvi-green bg-transparent hover:bg-green-50 focus:ring-green-200',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2.5 text-base gap-2',
    lg: 'px-6 py-3.5 text-lg gap-2.5',
    xl: 'px-8 py-5 text-xl gap-3',
  }

  return (
    <button
      className={cn(
        base,
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg
          className="animate-spin h-5 w-5"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  )
}
