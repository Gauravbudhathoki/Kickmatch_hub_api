import { z } from "zod";

const objectIdString = z.string().regex(/^[0-9a-fA-F]{24}$/, "Must be a valid ID.");

export const createMatchRequestSchema = z
  .object({
    requestingTeamId: objectIdString,
    opponentTeamId: objectIdString,
    proposedDate: z.string().datetime({ message: "proposedDate must be an ISO 8601 datetime string." }),
    venue: z.string().trim().min(1).max(100),
  })
  .strict()
  .refine((data) => data.requestingTeamId !== data.opponentTeamId, {
    message: "A team cannot request a match against itself.",
  });

export type CreateMatchRequestInput = z.infer<typeof createMatchRequestSchema>;

export const decideMatchRequestSchema = z
  .object({
    decision: z.enum(["accept", "reject"]),
  })
  .strict();

export type DecideMatchRequestInput = z.infer<typeof decideMatchRequestSchema>;