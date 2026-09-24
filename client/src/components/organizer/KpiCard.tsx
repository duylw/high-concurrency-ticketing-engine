import React from 'react'
import { cn } from '@/utils'

export interface KpiCardProps {
  title: string
  value: string | number
  subtext?: string
  icon: React.ReactNode
  iconColorClass?: string
  iconBgClass?: string
  progressPercentage?: number
  className?: string
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtext,
  icon,
  iconColorClass = 'text-emerald-400',
  iconBgClass = 'bg-emerald-500/10 border-emerald-500/20',
  progressPercentage,
  className,
}) => {
  return (
    <div
      className={cn(
        'glass-panel p-6 rounded-2xl border border-white/10 flex flex-col justify-between transition-all duration-300 hover:border-white/20 hover:shadow-xl hover:shadow-indigo-500/5',
        className
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-text-secondary uppercase tracking-wider">{title}</span>
        <div
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center border',
            iconBgClass,
            iconColorClass
          )}
        >
          {icon}
        </div>
      </div>

      <div>
        <div className="text-3xl font-extrabold text-text-primary tracking-tight">{value}</div>
        {subtext && <p className="text-xs text-text-secondary mt-1.5 line-clamp-1">{subtext}</p>}

        {typeof progressPercentage === 'number' && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-text-muted mb-1.5">
              <span>Tiến độ bán vé</span>
              <span className="font-semibold text-text-primary">{Math.min(progressPercentage, 100)}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
              {(() => {
                const barStyle: React.CSSProperties = {
                  width: `${Math.min(Math.max(progressPercentage, 0), 100)}%`,
                }
                return (
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-700',
                      progressPercentage >= 100
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                        : progressPercentage >= 50
                        ? 'bg-gradient-to-r from-amber-500 to-orange-400'
                        : 'bg-gradient-to-r from-indigo-500 to-violet-500'
                    )}
                    style={barStyle}
                  />
                )
              })()}
            </div>
          </div>
        )}
      </div>


    </div>
  )
}
