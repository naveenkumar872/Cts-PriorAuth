import React from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps {
  variant?: 'success' | 'danger' | 'pending' | 'primary' | 'slate' | 'blue' | 'teal'
  children: React.ReactNode
  className?: string
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'primary',
  children,
  className,
}) => {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase border',
        {
          'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30':
            variant === 'success',
          'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30':
            variant === 'danger',
          'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30':
            variant === 'pending',
          'bg-[#e0f7f8] text-[#0eadb9] border-[#b3edef] dark:bg-[#0eadb9]/20 dark:text-[#3bcfd6] dark:border-[#0eadb9]/30':
            variant === 'primary' || variant === 'teal',
          'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700':
            variant === 'slate',
          'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-400 dark:border-sky-500/30':
            variant === 'blue',
        },
        className
      )}
    >
      {children}
    </span>
  )
}
