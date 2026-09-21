import React, { type HTMLAttributes, type ReactNode } from 'react'

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'glow'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  withDot?: boolean
  children: ReactNode
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  withDot = true,
  children,
  className = '',
  ...props
}) => {
  return (
    <span className={`badge badge-${variant} ${className}`.trim()} {...props}>
      {withDot && <span className="badge-dot" aria-hidden="true" />}
      <span>{children}</span>
    </span>
  )
}
