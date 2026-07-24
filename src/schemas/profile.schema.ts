import { z } from "zod";

export const updateProfileSchema = z
  .object({
    displayName: z.string().trim().max(50).optional(),
    bio: z.string().trim().max(300).optional(),
    position: z.string().trim().max(30).optional(),
  })
  .strict();

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;