import React, { type HTMLAttributes, type ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/utils/cn'

export const badgeVariants = cva(
  'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-full border leading-none transition-colors duration-150',
  {
    variants: {
      variant: {
        success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        warning: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        danger: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
        info: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
        neutral: 'bg-white/10 text-text-secondary border-border-subtle',
        glow: 'bg-indigo-500/20 text-indigo-300 border-brand-primary shadow-[0_0_12px_rgba(99,102,241,0.28)]',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  }
)

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'glow'

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  withDot?: boolean
  children: ReactNode
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  withDot = true,
  children,
  className,
  ...props
}) => {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {withDot && <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />}
      <span>{children}</span>
    </span>
  )
}
