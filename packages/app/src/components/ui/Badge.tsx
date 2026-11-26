import React from 'react'
import { cn } from '@/lib/utils'

type BadgeVariant = 'green' | 'yellow' | 'red' | 'blue' | 'gray' | 'slate'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md'
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'gray',
  children,
  className,
  size = 'sm',
}) => {
  const variants: Record<BadgeVariant, string> = {
    green: 'bg-green-100 text-green-800 border-green-200',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    red: 'bg-red-100 text-red-800 border-red-200',
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    gray: 'bg-slate-100 text-slate-600 border-slate-200',
    slate: 'bg-prithvi-slate text-white border-transparent',
  }

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center font-semibold rounded-full border',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  )
}
