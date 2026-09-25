import { httpClient } from './http.client'
import type { ApiResponse, OrganizerEventItem, OrganizerMetrics, TicketTier } from '@/types'

export interface OrganizerDashboardData {
  metrics: OrganizerMetrics
  events: OrganizerEventItem[]
}

export interface CreateEventPayload {
  title: string
  description: string
  venue?: string
  bannerUrl?: string
  startTime: string
  endTime: string
  saleStartTime?: string | null
  saleEndTime?: string | null
  status?: 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'CANCELLED'
  ticketTiers?: Array<{
    name: string
    price: number
    totalStock: number
    description?: string
  }>
}

export const organizerApi = {
  getMyEvents: async (): Promise<OrganizerDashboardData> => {
    const res = await httpClient.get<ApiResponse<OrganizerEventItem[] | { events: OrganizerEventItem[]; metrics?: OrganizerMetrics }>>('/events/organizer/my-events')
    
    // Handle both raw array or object format
    const rawData = res.data.data
    const events: OrganizerEventItem[] = Array.isArray(rawData)
      ? rawData
      : (rawData && 'events' in rawData && Array.isArray(rawData.events))
        ? rawData.events
        : []

    let totalRevenue = 0
    let totalTicketsSold = 0
    let totalStock = 0
    let availableStock = 0

    for (const evt of events) {
      totalRevenue += evt.totalRevenue ?? evt.stats?.totalRevenue ?? 0
      totalTicketsSold += evt.totalTicketsSold ?? evt.stats?.totalTicketsSold ?? 0
      totalStock += evt.totalStock ?? evt.stats?.totalStock ?? 0
      availableStock += evt.availableStock ?? evt.stats?.availableStock ?? 0
    }

    const soldOutPercentage = totalStock > 0 ? Math.round((totalTicketsSold / totalStock) * 100) : 0

    const metrics: OrganizerMetrics = {
      totalEvents: events.length,
      totalStock,
      availableStock,
      totalTicketsSold,
      totalRevenue,
      soldOutPercentage,
    }

    return { metrics, events }
  },

  createEvent: async (payload: Omit<CreateEventPayload, 'ticketTiers'>): Promise<OrganizerEventItem> => {
    const res = await httpClient.post<ApiResponse<OrganizerEventItem>>('/events', payload)
    if (!res.data.data) {
      throw new Error(res.data.message || 'Create event failed')
    }
    return res.data.data
  },

  createTicketTier: async (
    eventId: string,
    tier: { name: string; price: number; totalStock: number; description?: string }
  ): Promise<TicketTier> => {
    const res = await httpClient.post<ApiResponse<TicketTier>>(`/events/${eventId}/tiers`, tier)
    if (!res.data.data) {
      throw new Error(res.data.message || 'Create ticket tier failed')
    }
    return res.data.data
  },

  createEventWithTiers: async (payload: CreateEventPayload): Promise<OrganizerEventItem> => {
    const { ticketTiers, ...eventData } = payload
    const event = await organizerApi.createEvent(eventData)

    if (ticketTiers && ticketTiers.length > 0) {
      const createdTiers: TicketTier[] = []
      for (const tier of ticketTiers) {
        const createdTier = await organizerApi.createTicketTier(event.id, tier)
        createdTiers.push(createdTier)
      }
      event.ticketTiers = createdTiers
    }

    return event
  },

  updateEvent: async (eventId: string, payload: Partial<CreateEventPayload>): Promise<OrganizerEventItem> => {
    const res = await httpClient.patch<ApiResponse<OrganizerEventItem>>(`/events/${eventId}`, payload)
    if (!res.data.data) {
      throw new Error(res.data.message || 'Update event failed')
    }
    return res.data.data
  },

  deleteEvent: async (eventId: string): Promise<void> => {
    await httpClient.delete(`/events/${eventId}`)
  },
}

