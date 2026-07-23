import { z } from "zod";


export const registerSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3)
      .max(30)
      .regex(/^[a-zA-Z0-9_]+$/, "Username may only contain letters, numbers, and underscores."),
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(1), // deep policy check happens separately (validatePasswordPolicy)
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginPasswordStepSchema = z
  .object({
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(1),
  })
  .strict();

export type LoginPasswordStepInput = z.infer<typeof loginPasswordStepSchema>;

export const loginMfaStepSchema = z
  .object({
    // Short-lived pending-login token issued after the password step succeeds.
    pendingToken: z.string().min(1),
    code: z
      .string()
      .trim()
      .regex(/^[0-9]{6}$/, "Code must be a 6-digit number.")
      .optional(),
    backupCode: z.string().trim().min(1).optional(),
  })
  .strict()
  .refine((data) => data.code || data.backupCode, {
    message: "Either a TOTP code or a backup code is required.",
  });

export type LoginMfaStepInput = z.infer<typeof loginMfaStepSchema>;