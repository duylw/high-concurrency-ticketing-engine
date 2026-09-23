import { httpClient } from './http.client'
import type { ApiResponse, Order, TicketItem } from '@/types'

export interface HoldTicketPayload {
  ticketTierId: string
  quantity: number
  eventId?: string
}

export const ordersApi = {
  holdTicket: async (payload: HoldTicketPayload): Promise<Order> => {
    const res = await httpClient.post<ApiResponse<Order>>('/orders/hold', payload)
    if (!res.data.data) {
      throw new Error(res.data.message || 'Hold ticket failed')
    }
    return res.data.data
  },

  checkout: async (orderId: string, idempotencyKey: string): Promise<Order> => {
    const res = await httpClient.post<ApiResponse<Order>>(
      `/orders/${orderId}/checkout`,
      {},
      {
        headers: {
          'X-Idempotency-Key': idempotencyKey,
        },
      }
    )
    if (!res.data.data) {
      throw new Error(res.data.message || 'Checkout failed')
    }
    return res.data.data
  },

  getMyOrders: async (): Promise<Order[]> => {
    const res = await httpClient.get<ApiResponse<Order[]>>('/orders/my-orders')
    return res.data.data || []
  },

  checkInTicket: async (ticketId: string): Promise<{ ticket: TicketItem; order: Order }> => {
    const res = await httpClient.post<ApiResponse<{ ticket: TicketItem; order: Order }>>(
      `/tickets/${ticketId}/check-in`
    )
    if (!res.data.data) {
      throw new Error(res.data.message || 'Check-in failed')
    }
    return res.data.data
  },
}
