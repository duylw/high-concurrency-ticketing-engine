import React, { type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/utils/cn'

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-semibold text-center whitespace-nowrap align-middle select-none transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none relative overflow-hidden',
  {
    variants: {
      variant: {
        primary:
          'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-500/25 hover:from-indigo-600 hover:to-indigo-700 hover:shadow-lg hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:translate-y-0',
        secondary:
          'bg-dark-tertiary text-text-primary border border-border-subtle hover:bg-dark-card-hover hover:border-border-medium hover:-translate-y-0.5 active:translate-y-0',
        neon:
          'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-500/25 hover:from-emerald-600 hover:to-emerald-700 hover:shadow-lg hover:shadow-emerald-500/40 hover:-translate-y-0.5 active:translate-y-0',
        ghost:
          'bg-white/5 text-text-primary border border-border-subtle backdrop-blur-sm hover:bg-white/10 hover:border-border-hover hover:text-white hover:-translate-y-0.5 active:translate-y-0',
        outline:
          'bg-transparent border border-border-medium text-text-primary hover:border-brand-primary hover:text-brand-neon hover:shadow-[0_0_12px_rgba(99,102,241,0.28)]',
        danger:
          'bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-rose-500/25 hover:border-rose-500/60 hover:-translate-y-0.5 active:translate-y-0',
      },
      size: {
        sm: 'px-3.5 py-1.5 text-xs rounded-md',
        md: 'px-5 py-2.5 text-sm rounded-md',
        lg: 'px-7 py-3.5 text-base rounded-lg',
        icon: 'w-10 h-10 p-0 rounded-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

export type ButtonVariant = 'primary' | 'secondary' | 'neon' | 'ghost' | 'outline' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  children?: ReactNode
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  className,
  disabled,
  ...props
}) => {
  const isDisabled = disabled || isLoading

  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      {...props}
    >
      {isLoading ? (
        <>
          <span className="spinner mr-2" aria-hidden="true" />
          <span>{children || 'Đang xử lý...'}</span>
        </>
      ) : (
        <>
          {leftIcon && <span className="inline-flex items-center" aria-hidden="true">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="inline-flex items-center" aria-hidden="true">{rightIcon}</span>}
        </>
      )}
    </button>
  )
}
