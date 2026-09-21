import { httpClient } from './http.client'
import type { ApiResponse, EventItem, PaginationMeta } from '@/types'

export interface EventsResponse {
  events: EventItem[]
  pagination?: PaginationMeta
}

export const eventsApi = {
  getEvents: async (params?: { page?: number; limit?: number; search?: string }): Promise<EventsResponse> => {
    const res = await httpClient.get<ApiResponse<EventItem[] | { events: EventItem[]; pagination: PaginationMeta }>>('/events', {
      params,
    })

    const payload = res.data.data
    if (Array.isArray(payload)) {
      return { events: payload, pagination: res.data.pagination }
    } else if (payload && 'events' in payload) {
      return { events: payload.events, pagination: payload.pagination }
    }
    return { events: [] }
  },

  getEventById: async (id: string): Promise<EventItem> => {
    const res = await httpClient.get<ApiResponse<EventItem>>(`/events/${id}`)
    if (!res.data.data) {
      throw new Error(res.data.message || 'Event not found')
    }
    return res.data.data
  },
}
