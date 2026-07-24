import { Request, Response } from "express";
import { updateProfileSchema } from "../schemas/profile.schema";
import { getOwnProfile, updateOwnProfile, getPublicProfile } from "../services/profile.service";
import { exportUserData } from "../services/export.service";
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
  // .strict() Zod parse -> throws (400) on any unexpected field, e.g. a
  // "role":"admin" injection attempt, before any service/DB code runs.
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

/**
 * Public-safe view of another user's profile (e.g. clicking a teammate's
 * name on a roster). Deliberately reachable with any valid user ID - the
 * IDOR protection here is in the response *shape* (see getPublicProfile),
 * not in an ownership check, because this data is meant to be shared.
 */
export async function getUserPublicProfile(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
    throw new AppError("Invalid user ID.", 400);
  }
  const profile = await getPublicProfile(id);
  res.status(200).json(profile);
}

export async function exportMe(req: Request, res: Response): Promise<void> {
  const data = await exportUserData(req.user!.id, {
    ipAddress: req.ip ?? "unknown",
    userAgent: req.get("user-agent") ?? "unknown",
  });

  // Content-Disposition triggers a real file download in browsers/Postman,
  // rather than rendering the JSON inline - matches the site map's
  // "Data Export" feature expectation of a downloadable file.
  res.setHeader("Content-Disposition", `attachment; filename="kickmatch-export-${req.user!.id}.json"`);
  res.status(200).json(data);
}
