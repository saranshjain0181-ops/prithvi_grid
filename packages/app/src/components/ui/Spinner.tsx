import React from 'react'
import { cn } from '@/lib/utils'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  color?: 'green' | 'white' | 'slate'
  className?: string
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  color = 'green',
  className,
}) => {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
    xl: 'w-16 h-16 border-4',
  }

  const colors = {
    green: 'border-green-200 border-t-prithvi-green',
    white: 'border-white/30 border-t-white',
    slate: 'border-slate-200 border-t-prithvi-slate',
  }

  return (
    <div
      className={cn(
        'rounded-full animate-spin',
        sizes[size],
        colors[color],
        className
      )}
      role="status"
      aria-label="Loading"
    />
  )
}
