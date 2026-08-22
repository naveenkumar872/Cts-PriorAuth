import React from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'success' | 'danger' | 'secondary' | 'ghost' | 'teal'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0eadb9] focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]',
          {
            'bg-[#0eadb9] text-white hover:bg-[#0897a3] shadow-sm hover:shadow':
              variant === 'primary' || variant === 'teal',
            'bg-[#10b981] text-white hover:bg-[#059669] shadow-sm':
              variant === 'success',
            'bg-[#ef4444] text-white hover:bg-[#dc2626] shadow-sm':
              variant === 'danger',
            'bg-white dark:bg-[#181c24] text-slate-700 dark:text-slate-200 border border-[#e2e8f0] dark:border-[#232833] hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300':
              variant === 'secondary',
            'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800':
              variant === 'ghost',
          },
          {
            'h-8 px-3 text-xs': size === 'sm',
            'h-10 px-4 text-sm': size === 'md',
            'h-11 px-5 text-base': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
