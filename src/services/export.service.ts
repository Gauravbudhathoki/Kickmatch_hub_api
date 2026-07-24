import { User } from "../models/User";
import { TeamMember } from "../models/TeamMember";
import { Team } from "../models/Team";
import { MatchRequest } from "../models/MatchRequest";
import { ActivityLog } from "../models/ActivityLog";
import { Session } from "../models/Session";
import { AppError } from "../middleware/errorHandler";
import { recordActivity } from "./activityLog.service";

export interface RequestContext {
  ipAddress: string;
  userAgent: string;
}

export async function exportUserData(userId: string, ctx: RequestContext) {
  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found.", 404);

  const memberships = await TeamMember.find({ userId });
  const teamIds = memberships.map((m) => m.teamId);
  const teams = await Team.find({ _id: { $in: teamIds } });
  const captainedTeams = await Team.find({ captainId: userId });
  const captainedTeamIds = captainedTeams.map((t) => t._id);

  const matchRequests = await MatchRequest.find({
    $or: [{ requestingTeamId: { $in: captainedTeamIds } }, { opponentTeamId: { $in: captainedTeamIds } }],
  });

  const activityLogs = await ActivityLog.find({ userId }).sort({ createdAt: -1 }).limit(500);

  const sessions = await Session.find({ userId }).select(
    "ipAddress userAgent createdAt lastSeenAt expiresAt revoked"
  );

  await recordActivity({
    userId,
    action: "DATA_EXPORT_REQUESTED",
    targetType: "user",
    targetId: userId,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    severity: "info",
  });

  return {
    exportedAt: new Date().toISOString(),
    account: {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
      mfaEnabled: user.mfaEnabled,
      profile: user.profile,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    },
    teamMemberships: memberships.map((m) => {
      const team = teams.find((t) => t._id.toString() === m.teamId.toString());
      return {
        teamId: m.teamId.toString(),
        teamName: team?.name ?? null,
        status: m.status,
        requestedAt: m.requestedAt,
        decidedAt: m.decidedAt,
      };
    }),
    teamsCaptained: captainedTeams.map((t) => ({
      id: t._id.toString(),
      name: t.name,
      description: t.description,
      createdAt: t.createdAt,
    })),
    matchRequestsInvolvingCaptainedTeams: matchRequests.map((m) => ({
      id: m._id.toString(),
      requestingTeamId: m.requestingTeamId.toString(),
      opponentTeamId: m.opponentTeamId.toString(),
      proposedDate: m.proposedDate,
      venue: m.venue,
      status: m.status,
    })),
    activityLog: activityLogs.map((l) => ({
      action: l.action,
      targetType: l.targetType ?? null,
      severity: l.severity,
      createdAt: l.createdAt,
    })),
    sessions: sessions.map((s) => ({
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      createdAt: s.createdAt,
      lastSeenAt: s.lastSeenAt,
      expiresAt: s.expiresAt,
      revoked: s.revoked,
    })),
  };
}
