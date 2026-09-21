import React, { type ButtonHTMLAttributes, type ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'neon' | 'ghost' | 'outline' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
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
  className = '',
  disabled,
  ...props
}) => {
  const variantClass = `btn-${variant}`
  const sizeClass = `btn-${size}`
  const isDisabled = disabled || isLoading

  return (
    <button
      className={`btn ${variantClass} ${sizeClass} ${className}`.trim()}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      {...props}
    >
      {isLoading ? (
        <>
          <span className="spinner" aria-hidden="true" />
          <span>{children || 'Đang xử lý...'}</span>
        </>
      ) : (
        <>
          {leftIcon && <span className="btn-icon-slot" aria-hidden="true">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="btn-icon-slot" aria-hidden="true">{rightIcon}</span>}
        </>
      )}
    </button>
  )
}
