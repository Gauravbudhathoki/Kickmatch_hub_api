import { z } from "zod";

export const changeRoleSchema = z
  .object({
    role: z.enum(["player", "captain", "admin"]),
  })
  .strict();

export type ChangeRoleInput = z.infer<typeof changeRoleSchema>;

export const setDisabledSchema = z
  .object({
    disabled: z.boolean(),
  })
  .strict();

export type SetDisabledInput = z.infer<typeof setDisabledSchema>;

export const logsQuerySchema = z
  .object({
    userId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    action: z.string().max(100).optional(),
    severity: z.enum(["info", "warning", "critical"]).optional(),
    limit: z.coerce.number().int().positive().max(200).default(50),
  })
  .strict();

export type LogsQueryInput = z.infer<typeof logsQuerySchema>;
