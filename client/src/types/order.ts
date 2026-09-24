import type { EventItem, TicketTier } from './event'

export type OrderStatus = 'PENDING' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED' | 'CHECKED_IN' | 'PARTIALLY_CHECKED_IN'
export type TicketStatus = 'ISSUED' | 'CHECKED_IN' | 'REVOKED'

export interface TicketItem {
  id: string
  orderId: string
  ticketTierId: string
  ticketCode: string
  qrPayload: string
  status: TicketStatus
  checkedInAt?: string | null
  createdAt?: string
  ticketTier?: TicketTier
}

export interface Order {
  id: string
  userId: string
  eventId: string
  ticketTierId: string
  quantity: number
  totalAmount: number
  status: OrderStatus
  expiresAt: string
  qrPayload?: string | null
  checkedInAt?: string | null
  createdAt: string
  updatedAt: string
  event?: EventItem
  ticketTier?: TicketTier
  tickets?: TicketItem[]
}

export interface CheckInResult {
  id: string
  ticketCode: string
  status: TicketStatus
  checkedInAt?: string | null
  attendeeName?: string | null
  user?: {
    id: string
    name: string
    email: string
  }
  ticketTier?: {
    id?: string
    name: string
    price: number
    event?: {
      id?: string
      title: string
    }
  }
  quantity?: number
  order?: {
    id: string
    status: OrderStatus
    quantity: number
    remainingTickets: number
  }
}
