import React from 'react'
import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
  shadow?: boolean
  border?: boolean
  onClick?: () => void
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  padding = 'md',
  shadow = true,
  border = false,
  onClick,
}) => {
  const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-7',
  }

  return (
    <div
      className={cn(
        'bg-white rounded-2xl',
        paddings[padding],
        shadow && 'shadow-sm',
        border && 'border border-slate-100',
        onClick && 'cursor-pointer hover:shadow-md transition-shadow duration-200',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      {children}
    </div>
  )
}
