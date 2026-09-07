import z from "zod"

export const orderCheckoutSchema = z.object({
    params: z.object({
        id: z.uuid()
    })
}) 