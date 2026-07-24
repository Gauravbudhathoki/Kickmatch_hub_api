import { MatchRequest, IMatchRequest } from "../ models/MatchRequest";
import { Team } from "../models/Team";
import { AppError } from "../middleware/errorHandler";
import { CreateMatchRequestInput, DecideMatchRequestInput } from "../schemas/match.schema";
import { recordActivity } from "./activityLog.service";
import { Types } from "mongoose";

export interface RequestContext {
  ipAddress: string;
  userAgent: string;
}

async function assertCaptainsTeam(teamId: string, requesterId: string, requesterRole: string): Promise<void> {
  const team = await Team.findById(teamId);
  if (!team) throw new AppError("Team not found.", 404);

  const isOwner = team.captainId.toString() === requesterId;
  const isAdmin = requesterRole === "admin";

  if (!isOwner && !isAdmin) {
    throw new AppError("You do not have permission to act on behalf of this team.", 403);
  }
}

export async function createMatchRequest(
  requesterId: string,
  requesterRole: string,
  input: CreateMatchRequestInput,
  ctx: RequestContext
): Promise<IMatchRequest> {
  await assertCaptainsTeam(input.requestingTeamId, requesterId, requesterRole);

  const opponent = await Team.findById(input.opponentTeamId);
  if (!opponent) throw new AppError("Opponent team not found.", 404);

  const matchRequest = await MatchRequest.create({
    requestingTeamId: input.requestingTeamId,
    opponentTeamId: input.opponentTeamId,
    proposedDate: new Date(input.proposedDate),
    venue: input.venue,
    status: "pending",
    createdBy: requesterId,
  });

  await recordActivity({
    userId: requesterId,
    action: "MATCH_REQUEST_CREATED",
    targetType: "match_request",
    targetId: matchRequest._id,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    severity: "info",
    metadata: { requestingTeamId: input.requestingTeamId, opponentTeamId: input.opponentTeamId },
  });

  return matchRequest;
}

export async function listMatchesForTeam(teamId: string): Promise<IMatchRequest[]> {
  const team = await Team.findById(teamId);
  if (!team) throw new AppError("Team not found.", 404);

  return MatchRequest.find({
    $or: [{ requestingTeamId: teamId }, { opponentTeamId: teamId }],
  }).sort({ proposedDate: 1 });
}

export async function listIncomingMatchRequests(
  teamId: string,
  requesterId: string,
  requesterRole: string
): Promise<IMatchRequest[]> {
  await assertCaptainsTeam(teamId, requesterId, requesterRole);

  return MatchRequest.find({ opponentTeamId: teamId, status: "pending" }).sort({ createdAt: 1 });
}

export async function decideMatchRequest(
  matchId: string,
  requesterId: string,
  requesterRole: string,
  input: DecideMatchRequestInput,
  ctx: RequestContext
): Promise<IMatchRequest> {
  const matchRequest = await MatchRequest.findById(matchId);
  if (!matchRequest) throw new AppError("Match request not found.", 404);

  await assertCaptainsTeam(matchRequest.opponentTeamId.toString(), requesterId, requesterRole);

  if (matchRequest.status !== "pending") {
    throw new AppError("This match request has already been decided.", 409);
  }

  matchRequest.status = input.decision === "accept" ? "accepted" : "rejected";
  matchRequest.decidedBy = new Types.ObjectId(requesterId);
  await matchRequest.save();

  await recordActivity({
    userId: requesterId,
    action: input.decision === "accept" ? "MATCH_REQUEST_ACCEPTED" : "MATCH_REQUEST_REJECTED",
    targetType: "match_request",
    targetId: matchRequest._id,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    severity: "info",
  });

  return matchRequest;
}