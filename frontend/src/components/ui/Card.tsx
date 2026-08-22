import React from 'react'
import { cn } from '@/lib/utils'

export interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
}

export const Card: React.FC<CardProps> = ({ children, className, hover = false }) => {
  return (
    <div
      className={cn(
        'bg-white dark:bg-[#181c24] border border-[#e2e8f0] dark:border-[#232833] rounded-2xl shadow-xs',
        hover && 'transition-all duration-200 hover:shadow-md hover:border-[#0eadb9]/40',
        className
      )}
    >
      {children}
    </div>
  )
}

export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => {
  return (
    <div className={cn('px-6 py-4 border-b border-[#e2e8f0] dark:border-[#232833]', className)}>
      {children}
    </div>
  )
}

export const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => {
  return (
    <h3 className={cn('text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight', className)}>
      {children}
    </h3>
  )
}

export const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => {
  return <div className={cn('px-6 py-4', className)}>{children}</div>
}
