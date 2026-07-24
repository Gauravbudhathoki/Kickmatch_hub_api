import { User, IUser } from "../ models/ User";
import { PasswordHistory } from "../ models/ PasswordHistory";
import { hashPassword, validatePasswordPolicy, verifyPassword } from "../utils/password";
import { AppError } from "../middleware/errorHandler";
import { logger } from "../utils/logger";
import { RegisterInput, LoginPasswordStepInput, LoginMfaStepInput } from "../schemas/auth.schema";
import { createPendingLoginToken, verifyPendingLoginToken, decryptSecret } from "../utils/crypto";
import { verifyTotpCode, verifyBackupCode } from "../utils/mfa";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export interface RequestContext {
  ipAddress: string;
  userAgent: string;
}

export async function registerUser(input: RegisterInput, ctx: RequestContext): Promise<IUser> {
  const { username, email, password } = input;

  const policyResult = validatePasswordPolicy(password, { username, email });
  if (!policyResult.valid) {
    throw new AppError(policyResult.errors.join(" "), 400);
  }

  const existing = await User.findOne({ $or: [{ email }, { username }] });
  if (existing) {
    logger.warn({ email, username, ip: ctx.ipAddress }, "Registration attempted with existing email/username");
    throw new AppError("An account with this email or username already exists.", 409);
  }

  const passwordHash = await hashPassword(password);

  const user = await User.create({
    username,
    email,
    passwordHash,
    role: "player",
  });

  await PasswordHistory.create({ userId: user._id, passwordHash });

  logger.info(
    { userId: user._id.toString(), ip: ctx.ipAddress, userAgent: ctx.userAgent },
    "New user registered"
  );

  return user;
}

export interface PasswordStepResult {
  requiresMfa: boolean;
  pendingToken?: string;
  user?: IUser;
}

export async function loginPasswordStep(
  input: LoginPasswordStepInput,
  ctx: RequestContext
): Promise<PasswordStepResult> {
  const { email, password } = input;
  const GENERIC_ERROR = "Invalid email or password.";

  const user = await User.findOne({ email }).select("+passwordHash");

  if (!user) {
    await verifyPassword(password, "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva");
    logger.warn({ email, ip: ctx.ipAddress }, "Login attempt for non-existent account");
    throw new AppError(GENERIC_ERROR, 401);
  }

  if (user.isDisabled) {
    logger.warn({ userId: user._id.toString(), ip: ctx.ipAddress }, "Login attempt on disabled account");
    throw new AppError(GENERIC_ERROR, 401);
  }

  if (user.lockoutUntil && user.lockoutUntil.getTime() > Date.now()) {
    logger.warn({ userId: user._id.toString(), ip: ctx.ipAddress }, "Login attempt on locked-out account");
    throw new AppError("Account temporarily locked due to failed login attempts. Please try again later.", 429);
  }

  const passwordValid = await verifyPassword(password, user.passwordHash);

  if (!passwordValid) {
    user.failedLoginCount += 1;
    if (user.failedLoginCount >= MAX_FAILED_ATTEMPTS) {
      user.lockoutUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
      logger.warn(
        { userId: user._id.toString(), ip: ctx.ipAddress, failedLoginCount: user.failedLoginCount },
        "Account locked out after repeated failed logins"
      );
    }
    await user.save();
    logger.warn({ userId: user._id.toString(), ip: ctx.ipAddress }, "Failed login attempt (wrong password)");
    throw new AppError(GENERIC_ERROR, 401);
  }

  user.failedLoginCount = 0;
  user.lockoutUntil = null;
  await user.save();

  if (user.mfaEnabled) {
    logger.info({ userId: user._id.toString(), ip: ctx.ipAddress }, "Password step succeeded, MFA required");
    return { requiresMfa: true, pendingToken: createPendingLoginToken(user._id.toString()) };
  }

  user.lastLoginAt = new Date();
  await user.save();
  logger.info({ userId: user._id.toString(), ip: ctx.ipAddress }, "Login succeeded (no MFA configured)");
  return { requiresMfa: false, user };
}

export async function loginMfaStep(input: LoginMfaStepInput, ctx: RequestContext): Promise<IUser> {
  const GENERIC_ERROR = "Invalid or expired verification code.";

  const pending = verifyPendingLoginToken(input.pendingToken);
  if (!pending) {
    throw new AppError("Login session expired. Please log in again.", 401);
  }

  const user = await User.findById(pending.userId).select("+mfaSecretEncrypted +mfaBackupCodesHashed");
  if (!user || !user.mfaEnabled || !user.mfaSecretEncrypted) {
    throw new AppError(GENERIC_ERROR, 401);
  }

  if (user.lockoutUntil && user.lockoutUntil.getTime() > Date.now()) {
    throw new AppError("Account temporarily locked due to failed attempts. Please try again later.", 429);
  }

  let verified = false;

  if (input.code) {
    const secret = decryptSecret(user.mfaSecretEncrypted);
    verified = verifyTotpCode(secret, input.code);
  } else if (input.backupCode) {
    const matchIndex = await verifyBackupCode(input.backupCode, user.mfaBackupCodesHashed);
    if (matchIndex !== null) {
      verified = true;
      user.mfaBackupCodesHashed.splice(matchIndex, 1);
    }
  }

  if (!verified) {
    user.failedLoginCount += 1;
    if (user.failedLoginCount >= MAX_FAILED_ATTEMPTS) {
      user.lockoutUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
      logger.warn({ userId: user._id.toString(), ip: ctx.ipAddress }, "Account locked out after repeated failed MFA attempts");
    }
    await user.save();
    logger.warn({ userId: user._id.toString(), ip: ctx.ipAddress }, "Failed MFA verification attempt");
    throw new AppError(GENERIC_ERROR, 401);
  }

  user.failedLoginCount = 0;
  user.lockoutUntil = null;
  user.lastLoginAt = new Date();
  await user.save();

  logger.info({ userId: user._id.toString(), ip: ctx.ipAddress }, "Login succeeded (MFA verified)");
  return user;
}