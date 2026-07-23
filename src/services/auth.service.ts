import { User, IUser } from "../ models/ User";
import { PasswordHistory } from "../ models/ PasswordHistory";
import { hashPassword, validatePasswordPolicy } from "../utils/password";
import { AppError } from "../middleware/errorHandler";
import { logger } from "../utils/logger";
import { RegisterInput } from "../schemas/auth.schema";

export interface RegisterContext {
  ipAddress: string;
  userAgent: string;
}


export async function registerUser(input: RegisterInput, ctx: RegisterContext): Promise<IUser> {
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
    role: "player", // hard-coded: see security note above
  });

  await PasswordHistory.create({ userId: user._id, passwordHash });

  logger.info(
    { userId: user._id.toString(), ip: ctx.ipAddress, userAgent: ctx.userAgent },
    "New user registered"
  );

  return user;
}