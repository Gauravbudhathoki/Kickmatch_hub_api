import { z } from "zod";

export const createTeamSchema = z
  .object({
    name: z.string().trim().min(3).max(50),
    description: z.string().trim().max(300).optional(),
  })
  .strict();

export type CreateTeamInput = z.infer<typeof createTeamSchema>;

export const decideJoinRequestSchema = z
  .object({
    decision: z.enum(["approve", "reject"]),
  })
  .strict();

export type DecideJoinRequestInput = z.infer<typeof decideJoinRequestSchema>;
