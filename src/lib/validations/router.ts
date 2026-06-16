import { z } from "zod/v4";

export const routerCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  ipAddress: z
    .string()
    .min(1, "IP Address is required")
    .regex(
      /^(\d{1,3}\.){3}\d{1,3}$|^[a-zA-Z0-9.-]+$/,
      "Must be a valid IP address or hostname"
    ),
  port: z.coerce.number().int().min(1).max(65535).default(443),
  useSSL: z.boolean().default(true),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const routerUpdateSchema = routerCreateSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type RouterCreateInput = z.infer<typeof routerCreateSchema>;
export type RouterUpdateInput = z.infer<typeof routerUpdateSchema>;
