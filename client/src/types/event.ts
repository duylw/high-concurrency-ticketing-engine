export interface TicketTier {
  id: string
  eventId: string
  name: string
  price: number
  totalStock: number
  availableStock: number
  description?: string | null
  createdAt?: string
  updatedAt?: string
  event?: EventItem
}

export interface EventItem {
  id: string
  title: string
  description?: string | null
  bannerUrl?: string | null
  venue?: string | null
  saleStartTime: string
  saleEndTime: string
  eventDate: string
  organizerId: string
  totalStock: number
  availableStock: number
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED' | 'CLOSED'
  createdAt?: string
  updatedAt?: string
  ticketTiers?: TicketTier[]
}

export interface OrganizerMetrics {
  totalEvents: number
  totalStock: number
  availableStock: number
  totalTicketsSold: number
  totalRevenue: number
  soldOutPercentage: number
}

export interface OrganizerEventItem extends EventItem {
  stats?: {
    totalStock: number
    availableStock: number
    totalTicketsSold: number
    totalRevenue: number
    soldOutPercentage: number
  }
  totalTicketsSold?: number
  totalRevenue?: number
  soldOutPercentage?: number
  startTime?: string
  endTime?: string
}
