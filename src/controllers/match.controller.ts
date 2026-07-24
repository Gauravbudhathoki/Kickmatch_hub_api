import { Request, Response } from "express";
import { createMatchRequestSchema, decideMatchRequestSchema } from "../schemas/match.schema";
import {
  createMatchRequest,
  listMatchesForTeam,
  listIncomingMatchRequests,
  decideMatchRequest,
} from "../services/match.service";
import { AppError } from "../middleware/errorHandler";

function requestContext(req: Request) {
  return { ipAddress: req.ip ?? "unknown", userAgent: req.get("user-agent") ?? "unknown" };
}

function assertValidObjectId(id: string | undefined): asserts id is string {
  if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
    throw new AppError("Invalid ID.", 400);
  }
}

function serializeMatch(m: {
  _id: { toString(): string };
  requestingTeamId: { toString(): string };
  opponentTeamId: { toString(): string };
  proposedDate: Date;
  venue: string;
  status: string;
  createdBy: { toString(): string };
  decidedBy: { toString(): string } | null;
}) {
  return {
    id: m._id.toString(),
    requestingTeamId: m.requestingTeamId.toString(),
    opponentTeamId: m.opponentTeamId.toString(),
    proposedDate: m.proposedDate,
    venue: m.venue,
    status: m.status,
    createdBy: m.createdBy.toString(),
    decidedBy: m.decidedBy ? m.decidedBy.toString() : null,
  };
}

export async function createMatchRequestHandler(req: Request, res: Response): Promise<void> {
  const input = createMatchRequestSchema.parse(req.body);
  const matchRequest = await createMatchRequest(req.user!.id, req.user!.role, input, requestContext(req));
  res.status(201).json(serializeMatch(matchRequest));
}

export async function listMatchesForTeamHandler(req: Request, res: Response): Promise<void> {
  const { teamId } = req.params;
  assertValidObjectId(teamId);

  const matches = await listMatchesForTeam(teamId);
  res.status(200).json(matches.map(serializeMatch));
}

export async function listIncomingMatchRequestsHandler(req: Request, res: Response): Promise<void> {
  const { teamId } = req.params;
  assertValidObjectId(teamId);

  const requests = await listIncomingMatchRequests(teamId, req.user!.id, req.user!.role);
  res.status(200).json(requests.map(serializeMatch));
}

export async function decideMatchRequestHandler(req: Request, res: Response): Promise<void> {
  const { matchId } = req.params;
  assertValidObjectId(matchId);

  const input = decideMatchRequestSchema.parse(req.body);
  const matchRequest = await decideMatchRequest(matchId, req.user!.id, req.user!.role, input, requestContext(req));
  res.status(200).json(serializeMatch(matchRequest));
}