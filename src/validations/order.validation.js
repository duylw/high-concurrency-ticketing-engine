import z from "zod";

export const orderIdParamSchema = z.object({
    params: z.object({
        id: z.uuid(),
    }),
});

export const orderCheckoutSchema = orderIdParamSchema;
 