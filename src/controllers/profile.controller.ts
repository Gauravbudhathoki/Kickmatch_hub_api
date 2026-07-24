import { Request, Response } from "express";
import { updateProfileSchema } from "../schemas/profile.schema";
import { getOwnProfile, updateOwnProfile, getPublicProfile } from "../services/profile.service";
import { AppError } from "../middleware/errorHandler";

export async function getMe(req: Request, res: Response): Promise<void> {
  const user = await getOwnProfile(req.user!.id);
  res.status(200).json({
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    role: user.role,
    mfaEnabled: user.mfaEnabled,
    profile: user.profile,
    createdAt: user.createdAt,
  });
}

export async function updateMe(req: Request, res: Response): Promise<void> {
  const input = updateProfileSchema.parse(req.body);

  const user = await updateOwnProfile(req.user!.id, input, {
    ipAddress: req.ip ?? "unknown",
    userAgent: req.get("user-agent") ?? "unknown",
  });

  res.status(200).json({
    id: user._id.toString(),
    username: user.username,
    profile: user.profile,
  });
}

export async function getUserPublicProfile(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
    throw new AppError("Invalid user ID.", 400);
  }
  const profile = await getPublicProfile(id);
  res.status(200).json(profile);
}
