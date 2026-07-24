import { User } from "../models/User";
import { AppError } from "../middleware/errorHandler";
import { logger } from "../utils/logger";
import { generateTotpEnrollment, verifyTotpCode, generateBackupCodes } from "../utils/mfa";
import { encryptSecret, decryptSecret } from "../utils/crypto";
import { verifyPassword } from "../utils/password";
import { revokeAllSessionsForUser } from "./session.service";

export async function initiateMfaSetup(userId: string) {
  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found.", 404);

  const enrollment = await generateTotpEnrollment(user.username);

  user.mfaSecretEncrypted = encryptSecret(enrollment.base32Secret);
  user.mfaEnabled = false;
  await user.save();

  logger.info({ userId }, "MFA enrollment initiated");

  return {
    otpauthUrl: enrollment.otpauthUrl,
    qrCodeDataUrl: enrollment.qrCodeDataUrl,
    manualEntrySecret: enrollment.base32Secret,
  };
}

export async function verifyAndEnableMfa(userId: string, code: string): Promise<string[]> {
  const user = await User.findById(userId).select("+mfaSecretEncrypted");
  if (!user || !user.mfaSecretEncrypted) {
    throw new AppError("No MFA setup in progress. Please start setup again.", 400);
  }

  const secret = decryptSecret(user.mfaSecretEncrypted);
  const valid = verifyTotpCode(secret, code);
  if (!valid) {
    logger.warn({ userId }, "MFA setup verification failed (incorrect code)");
    throw new AppError("Incorrect verification code.", 400);
  }

  const { plaintext, hashed } = await generateBackupCodes();
  user.mfaEnabled = true;
  user.mfaBackupCodesHashed = hashed;
  await user.save();

  logger.info({ userId }, "MFA enabled");

  return plaintext;
}

export async function disableMfa(userId: string, password: string): Promise<void> {
  const user = await User.findById(userId).select("+passwordHash");
  if (!user) throw new AppError("User not found.", 404);

  const passwordValid = await verifyPassword(password, user.passwordHash);
  if (!passwordValid) {
    logger.warn({ userId }, "MFA disable attempt failed (incorrect password confirmation)");
    throw new AppError("Incorrect password.", 401);
  }

  user.mfaEnabled = false;
  user.mfaSecretEncrypted = undefined;
  user.mfaBackupCodesHashed = [];
  await user.save();

  await revokeAllSessionsForUser(user._id);

  logger.warn({ userId }, "MFA disabled - all sessions revoked");
}
