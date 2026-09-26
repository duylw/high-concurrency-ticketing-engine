import React from 'react'
import { Plus, Minus, Check } from 'lucide-react'
import { Badge } from '@/components/common'
import { formatCurrency } from '@/utils/formatters'
import { cn } from '@/utils/cn'
import type { TicketTier } from '@/types'

export interface TicketTierCardProps {
  tier: TicketTier
  selectedQuantity: number
  onQuantityChange: (quantity: number) => void
  disabled?: boolean
  maxPerOrder?: number
}

export const TicketTierCard: React.FC<TicketTierCardProps> = ({
  tier,
  selectedQuantity,
  onQuantityChange,
  disabled = false,
  maxPerOrder = parseInt(import.meta.env.VITE_MAX_TICKETS_PER_ORDER || '4', 10),
}) => {
  const isSoldOut = tier.availableStock <= 0
  const isSelected = selectedQuantity > 0
  const effectiveMax = Math.min(tier.availableStock, maxPerOrder)

  const handleDecrease = () => {
    if (selectedQuantity > 0) {
      onQuantityChange(selectedQuantity - 1)
    }
  }

  const handleIncrease = () => {
    if (selectedQuantity < effectiveMax) {
      onQuantityChange(selectedQuantity + 1)
    }
  }

  return (
    <div
      className={cn(
        'glass-panel p-5 transition-all duration-200 border rounded-xl relative',
        isSelected ? 'border-brand-primary bg-indigo-500/[0.08] shadow-lg shadow-indigo-500/10' : 'border-border-subtle hover:border-border-medium',
        (isSoldOut || disabled) && 'opacity-60 pointer-events-none'
      )}
    >
      {isSelected && (
        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-brand-primary flex items-center justify-center text-white shadow-sm">
          <Check size={12} strokeWidth={3} />
        </div>
      )}

      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h4 className="text-base font-bold text-text-primary mb-1">{tier.name}</h4>
          {tier.description && (
            <p className="text-xs text-text-secondary line-clamp-2">{tier.description}</p>
          )}
        </div>

        <div className="text-right shrink-0">
          <div className="text-lg font-extrabold text-emerald-400">
            {formatCurrency(tier.price)}
          </div>
          <span className="text-[11px] text-text-muted">/ vé</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border-subtle mt-2 flex-wrap gap-2">
        <div>
          {isSoldOut ? (
            <Badge variant="danger" withDot={false}>Hết Vé</Badge>
          ) : (
            <span className="text-xs text-text-muted">
              Còn lại: <strong className="text-text-secondary">{tier.availableStock}</strong> vé
            </span>
          )}
        </div>

        {/* Quantity Controls */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleDecrease}
            disabled={selectedQuantity <= 0 || disabled || isSoldOut}
            className="w-8 h-8 rounded-lg bg-white/5 border border-border-subtle flex items-center justify-center text-text-primary hover:bg-white/10 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            aria-label="Giảm số lượng vé"
          >
            <Minus size={14} />
          </button>

          <span className="w-6 text-center font-bold text-sm text-text-primary">
            {selectedQuantity}
          </span>

          <button
            type="button"
            onClick={handleIncrease}
            disabled={selectedQuantity >= effectiveMax || disabled || isSoldOut}
            className="w-8 h-8 rounded-lg bg-white/5 border border-border-subtle flex items-center justify-center text-text-primary hover:bg-white/10 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            aria-label="Tăng số lượng vé"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
