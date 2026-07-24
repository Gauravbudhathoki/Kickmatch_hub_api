import { Request, Response } from "express";
import { mfaVerifySetupSchema, mfaDisableSchema } from "../schemas/mfa.schema";
import { initiateMfaSetup, verifyAndEnableMfa, disableMfa } from "../services/mfa.service";

export async function setupMfa(req: Request, res: Response): Promise<void> {
  const result = await initiateMfaSetup(req.user!.id);
  res.status(200).json(result);
}

export async function verifyMfaSetup(req: Request, res: Response): Promise<void> {
  const input = mfaVerifySetupSchema.parse(req.body);
  const backupCodes = await verifyAndEnableMfa(req.user!.id, input.code);
  res.status(200).json({ message: "MFA enabled.", backupCodes });
}

export async function disableMfaHandler(req: Request, res: Response): Promise<void> {
  const input = mfaDisableSchema.parse(req.body);
  await disableMfa(req.user!.id, input.password);
  res.status(200).json({ message: "MFA disabled." });
}