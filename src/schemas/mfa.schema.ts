import { z } from "zod";

export const mfaVerifySetupSchema = z
  .object({
    code: z.string().trim().regex(/^[0-9]{6}$/, "Code must be a 6-digit number."),
  })
  .strict();

export type MfaVerifySetupInput = z.infer<typeof mfaVerifySetupSchema>;

export const mfaDisableSchema = z
  .object({
    password: z.string().min(1),
  })
  .strict();

export type MfaDisableInput = z.infer<typeof mfaDisableSchema>;
