import { Team, ITeam } from "../models/Team";
import { TeamMember, ITeamMember } from "../models/TeamMember";
import { User } from "../models/User";
import { AppError } from "../middleware/errorHandler";
import { CreateTeamInput, DecideJoinRequestInput } from "../schemas/team.schema";
import { recordActivity } from "./activityLog.service";
import { Types } from "mongoose";

export interface RequestContext {
  ipAddress: string;
  userAgent: string;
}

export async function createTeam(userId: string, input: CreateTeamInput, ctx: RequestContext): Promise<ITeam> {
  const existing = await Team.findOne({ name: input.name });
  if (existing) {
    throw new AppError("A team with this name already exists.", 409);
  }

  const team = await Team.create({
    name: input.name,
    description: input.description ?? "",
    captainId: userId,
  });

  await TeamMember.create({
    teamId: team._id,
    userId,
    status: "approved",
    decidedAt: new Date(),
    decidedBy: userId,
  });

  const user = await User.findById(userId);
  if (user && user.role === "player") {
    user.role = "captain";
    await user.save();
    await recordActivity({
      userId,
      action: "ROLE_CHANGE_PLAYER_TO_CAPTAIN",
      targetType: "user",
      targetId: userId,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      severity: "warning",
      metadata: { reason: "team_creation", teamId: team._id.toString() },
    });
  }

  await recordActivity({
    userId,
    action: "TEAM_CREATED",
    targetType: "team",
    targetId: team._id,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    severity: "info",
  });

  return team;
}

export async function listTeams(): Promise<Pick<ITeam, "_id" | "name" | "description" | "captainId">[]> {
  return Team.find().select("name description captainId").sort({ name: 1 });
}

export async function getTeamById(teamId: string): Promise<ITeam> {
  const team = await Team.findById(teamId);
  if (!team) throw new AppError("Team not found.", 404);
  return team;
}

export async function requestToJoinTeam(
  userId: string,
  teamId: string,
  ctx: RequestContext
): Promise<ITeamMember> {
  const team = await Team.findById(teamId);
  if (!team) throw new AppError("Team not found.", 404);

  if (team.captainId.toString() === userId) {
    throw new AppError("You are already the captain of this team.", 400);
  }

  const existing = await TeamMember.findOne({ teamId, userId });

  if (existing) {
    if (existing.status === "approved") {
      throw new AppError("You are already a member of this team.", 409);
    }
    if (existing.status === "pending") {
      throw new AppError("You already have a pending request for this team.", 409);
    }
    existing.status = "pending";
    existing.requestedAt = new Date();
    existing.decidedAt = null;
    existing.decidedBy = null;
    await existing.save();

    await recordActivity({
      userId,
      action: "TEAM_JOIN_REQUESTED",
      targetType: "team",
      targetId: teamId,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      severity: "info",
    });

    return existing;
  }

  const membership = await TeamMember.create({ teamId, userId, status: "pending" });

  await recordActivity({
    userId,
    action: "TEAM_JOIN_REQUESTED",
    targetType: "team",
    targetId: teamId,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    severity: "info",
  });

  return membership;
}

async function assertCanManageTeam(teamId: string, requesterId: string, requesterRole: string): Promise<ITeam> {
  const team = await Team.findById(teamId);
  if (!team) throw new AppError("Team not found.", 404);

  const isOwner = team.captainId.toString() === requesterId;
  const isAdmin = requesterRole === "admin";

  if (!isOwner && !isAdmin) {
    throw new AppError("You do not have permission to manage this team.", 403);
  }

  return team;
}

export interface PendingJoinRequestView {
  membershipId: string;
  userId: string;
  username: string;
  displayName: string;
  requestedAt: Date;
}

export async function listPendingJoinRequests(
  teamId: string,
  requesterId: string,
  requesterRole: string
): Promise<PendingJoinRequestView[]> {
  await assertCanManageTeam(teamId, requesterId, requesterRole);

  const pending = await TeamMember.find({ teamId, status: "pending" }).sort({ requestedAt: 1 });

  const results: PendingJoinRequestView[] = [];
  for (const membership of pending) {
    const user = await User.findById(membership.userId);
    if (!user) continue;
    results.push({
      membershipId: membership._id.toString(),
      userId: user._id.toString(),
      username: user.username,
      displayName: user.profile.displayName,
      requestedAt: membership.requestedAt,
    });
  }
  return results;
}

export async function decideJoinRequest(
  teamId: string,
  membershipId: string,
  requesterId: string,
  requesterRole: string,
  input: DecideJoinRequestInput,
  ctx: RequestContext
): Promise<ITeamMember> {
  await assertCanManageTeam(teamId, requesterId, requesterRole);

  const membership = await TeamMember.findOne({ _id: membershipId, teamId });
  if (!membership) {
    throw new AppError("Join request not found.", 404);
  }
  if (membership.status !== "pending") {
    throw new AppError("This request has already been decided.", 409);
  }

  membership.status = input.decision === "approve" ? "approved" : "rejected";
  membership.decidedAt = new Date();
  membership.decidedBy = new Types.ObjectId(requesterId);
  await membership.save();

  await recordActivity({
    userId: requesterId,
    action: input.decision === "approve" ? "TEAM_JOIN_APPROVED" : "TEAM_JOIN_REJECTED",
    targetType: "team",
    targetId: teamId,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    severity: "info",
    metadata: { membershipId, decidedForUserId: membership.userId.toString() },
  });

  return membership;
}

export interface RosterEntry {
  userId: string;
  username: string;
  displayName: string;
  position: string;
}

export async function getTeamRoster(teamId: string): Promise<RosterEntry[]> {
  const approved = await TeamMember.find({ teamId, status: "approved" });

  const results: RosterEntry[] = [];
  for (const membership of approved) {
    const user = await User.findById(membership.userId);
    if (!user) continue;
    results.push({
      userId: user._id.toString(),
      username: user.username,
      displayName: user.profile.displayName,
      position: user.profile.position,
    });
  }
  return results;
}
