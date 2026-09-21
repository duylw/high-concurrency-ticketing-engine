import { httpClient } from './http.client'
import type { ApiResponse, EventItem, OrganizerMetrics, TicketTier } from '@/types'

export interface OrganizerDashboardData {
  metrics: OrganizerMetrics
  events: EventItem[]
}

export interface CreateEventPayload {
  title: string
  description?: string
  venue?: string
  saleStartTime: string
  saleEndTime: string
  eventDate: string
  ticketTiers?: Array<{
    name: string
    price: number
    totalStock: number
    description?: string
  }>
}

export const organizerApi = {
  getMyEvents: async (): Promise<OrganizerDashboardData> => {
    const res = await httpClient.get<ApiResponse<OrganizerDashboardData>>('/events/organizer/my-events')
    if (!res.data.data) {
      throw new Error(res.data.message || 'Failed to fetch organizer dashboard')
    }
    return res.data.data
  },

  createEvent: async (payload: CreateEventPayload): Promise<EventItem> => {
    const res = await httpClient.post<ApiResponse<EventItem>>('/events', payload)
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

  updateEvent: async (eventId: string, payload: Partial<CreateEventPayload>): Promise<EventItem> => {
    const res = await httpClient.patch<ApiResponse<EventItem>>(`/events/${eventId}`, payload)
    if (!res.data.data) {
      throw new Error(res.data.message || 'Update event failed')
    }
    return res.data.data
  },

  deleteEvent: async (eventId: string): Promise<void> => {
    await httpClient.delete(`/events/${eventId}`)
  },
}
