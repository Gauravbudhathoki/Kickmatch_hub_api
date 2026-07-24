import { User } from "../models/User";
import { ActivityLog } from "../models/ActivityLog";
import { AppError } from "../middleware/errorHandler";
import { recordActivity } from "./activityLog.service";
import { revokeAllSessionsForUser } from "./session.service";
import { ChangeRoleInput, SetDisabledInput, LogsQueryInput } from "../schemas/admin.schema";

export interface RequestContext {
  ipAddress: string;
  userAgent: string;
}

export interface AdminUserView {
  id: string;
  username: string;
  email: string;
  role: string;
  isDisabled: boolean;
  mfaEnabled: boolean;
  failedLoginCount: number;
  lockoutUntil: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export async function listAllUsers(): Promise<AdminUserView[]> {
  const users = await User.find().sort({ createdAt: -1 });
  return users.map((u) => ({
    id: u._id.toString(),
    username: u.username,
    email: u.email,
    role: u.role,
    isDisabled: u.isDisabled,
    mfaEnabled: u.mfaEnabled,
    failedLoginCount: u.failedLoginCount,
    lockoutUntil: u.lockoutUntil,
    lastLoginAt: u.lastLoginAt,
    createdAt: u.createdAt,
  }));
}

export async function changeUserRole(
  adminId: string,
  targetUserId: string,
  input: ChangeRoleInput,
  ctx: RequestContext
): Promise<AdminUserView> {
  if (adminId === targetUserId) {
    throw new AppError("You cannot change your own role.", 400);
  }

  const user = await User.findById(targetUserId);
  if (!user) throw new AppError("User not found.", 404);

  const previousRole = user.role;
  user.role = input.role;
  await user.save();

  await recordActivity({
    userId: adminId,
    action: "ADMIN_ROLE_CHANGE",
    targetType: "user",
    targetId: targetUserId,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    severity: "critical",
    metadata: { previousRole, newRole: input.role },
  });

  return {
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    role: user.role,
    isDisabled: user.isDisabled,
    mfaEnabled: user.mfaEnabled,
    failedLoginCount: user.failedLoginCount,
    lockoutUntil: user.lockoutUntil,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}

export async function setUserDisabled(
  adminId: string,
  targetUserId: string,
  input: SetDisabledInput,
  ctx: RequestContext
): Promise<AdminUserView> {
  if (adminId === targetUserId) {
    throw new AppError("You cannot disable your own account.", 400);
  }

  const user = await User.findById(targetUserId);
  if (!user) throw new AppError("User not found.", 404);

  user.isDisabled = input.disabled;
  await user.save();

  if (input.disabled) {
    await revokeAllSessionsForUser(user._id);
  }

  await recordActivity({
    userId: adminId,
    action: input.disabled ? "ADMIN_USER_DISABLED" : "ADMIN_USER_ENABLED",
    targetType: "user",
    targetId: targetUserId,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    severity: "warning",
  });

  return {
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    role: user.role,
    isDisabled: user.isDisabled,
    mfaEnabled: user.mfaEnabled,
    failedLoginCount: user.failedLoginCount,
    lockoutUntil: user.lockoutUntil,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}

export async function forceLogoutUser(adminId: string, targetUserId: string, ctx: RequestContext): Promise<void> {
  const user = await User.findById(targetUserId);
  if (!user) throw new AppError("User not found.", 404);

  await revokeAllSessionsForUser(user._id);

  await recordActivity({
    userId: adminId,
    action: "ADMIN_FORCE_LOGOUT",
    targetType: "user",
    targetId: targetUserId,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    severity: "warning",
  });
}

export async function queryActivityLogs(filters: LogsQueryInput) {
  const query: Record<string, unknown> = {};
  if (filters.userId) query.userId = filters.userId;
  if (filters.action) query.action = filters.action;
  if (filters.severity) query.severity = filters.severity;

  const logs = await ActivityLog.find(query).sort({ createdAt: -1 }).limit(filters.limit);

  return logs.map((l) => ({
    id: l._id.toString(),
    userId: l.userId ? l.userId.toString() : null,
    action: l.action,
    targetType: l.targetType ?? null,
    targetId: l.targetId ? l.targetId.toString() : null,
    ipAddress: l.ipAddress,
    severity: l.severity,
    metadata: l.metadata ?? null,
    createdAt: l.createdAt,
  }));
}

export interface SecurityAlert {
  type: string;
  severity: string;
  message: string;
  userId: string | null;
  createdAt: Date;
}

export async function getSecurityAlerts(): Promise<SecurityAlert[]> {
  const alerts: SecurityAlert[] = [];

  const lockedOutUsers = await User.find({ lockoutUntil: { $gt: new Date() } });
  for (const u of lockedOutUsers) {
    alerts.push({
      type: "ACCOUNT_LOCKED",
      severity: "warning",
      message: `Account "${u.username}" is locked out until ${u.lockoutUntil?.toISOString()} (${u.failedLoginCount} failed attempts).`,
      userId: u._id.toString(),
      createdAt: new Date(),
    });
  }

  const recentSensitive = await ActivityLog.find({ severity: { $in: ["warning", "critical"] } })
    .sort({ createdAt: -1 })
    .limit(20);

  for (const log of recentSensitive) {
    alerts.push({
      type: log.action,
      severity: log.severity,
      message: `${log.action} (severity: ${log.severity})`,
      userId: log.userId ? log.userId.toString() : null,
      createdAt: log.createdAt,
    });
  }

  return alerts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}
