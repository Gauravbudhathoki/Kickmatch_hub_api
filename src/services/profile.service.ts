import { User, IUser } from "../models/User";
import { AppError } from "../middleware/errorHandler";
import { UpdateProfileInput } from "../schemas/profile.schema";
import { recordActivity } from "./activityLog.service";

export interface RequestContext {
  ipAddress: string;
  userAgent: string;
}

export async function getOwnProfile(userId: string): Promise<IUser> {
  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found.", 404);
  return user;
}

export async function updateOwnProfile(
  userId: string,
  input: UpdateProfileInput,
  ctx: RequestContext
): Promise<IUser> {
  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found.", 404);

  const changedFields: string[] = [];

  if (input.displayName !== undefined) {
    user.profile.displayName = input.displayName;
    changedFields.push("displayName");
  }
  if (input.bio !== undefined) {
    user.profile.bio = input.bio;
    changedFields.push("bio");
  }
  if (input.position !== undefined) {
    user.profile.position = input.position;
    changedFields.push("position");
  }

  await user.save();

  await recordActivity({
    userId,
    action: "PROFILE_UPDATE",
    targetType: "user",
    targetId: userId,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    severity: "info",
    metadata: { changedFields },
  });

  return user;
}

export interface PublicProfile {
  id: string;
  username: string;
  displayName: string;
  position: string;
}

export async function getPublicProfile(targetUserId: string): Promise<PublicProfile> {
  const user = await User.findById(targetUserId);
  if (!user) throw new AppError("User not found.", 404);

  return {
    id: user._id.toString(),
    username: user.username,
    displayName: user.profile.displayName,
    position: user.profile.position,
  };
}
