import { Request, Response } from "express";
import { createTeamSchema, decideJoinRequestSchema } from "../schemas/team.schema";
import {
  createTeam,
  listTeams,
  getTeamById,
  requestToJoinTeam,
  listPendingJoinRequests,
  decideJoinRequest,
  getTeamRoster,
} from "../services/team.service";
import { AppError } from "../middleware/errorHandler";

function requestContext(req: Request) {
  return { ipAddress: req.ip ?? "unknown", userAgent: req.get("user-agent") ?? "unknown" };
}

function assertValidObjectId(id: string | undefined): asserts id is string {
  if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
    throw new AppError("Invalid ID.", 400);
  }
}

export async function createTeamHandler(req: Request, res: Response): Promise<void> {
  const input = createTeamSchema.parse(req.body);
  const team = await createTeam(req.user!.id, input, requestContext(req));
  res.status(201).json({
    id: team._id.toString(),
    name: team.name,
    description: team.description,
    captainId: team.captainId.toString(),
  });
}

export async function listTeamsHandler(_req: Request, res: Response): Promise<void> {
  const teams = await listTeams();
  res.status(200).json(
    teams.map((t) => ({
      id: t._id.toString(),
      name: t.name,
      description: t.description,
      captainId: t.captainId.toString(),
    }))
  );
}

export async function getTeamHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  assertValidObjectId(id);

  const team = await getTeamById(id);
  const roster = await getTeamRoster(id);

  res.status(200).json({
    id: team._id.toString(),
    name: team.name,
    description: team.description,
    captainId: team.captainId.toString(),
    roster,
  });
}

export async function joinTeamHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  assertValidObjectId(id);

  const membership = await requestToJoinTeam(req.user!.id, id, requestContext(req));
  res.status(201).json({
    membershipId: membership._id.toString(),
    status: membership.status,
  });
}

export async function listPendingRequestsHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  assertValidObjectId(id);

  const requests = await listPendingJoinRequests(id, req.user!.id, req.user!.role);
  res.status(200).json(requests);
}

export async function decideJoinRequestHandler(req: Request, res: Response): Promise<void> {
  const { id, membershipId } = req.params;
  assertValidObjectId(id);
  assertValidObjectId(membershipId);

  const input = decideJoinRequestSchema.parse(req.body);
  const membership = await decideJoinRequest(
    id,
    membershipId,
    req.user!.id,
    req.user!.role,
    input,
    requestContext(req)
  );

  res.status(200).json({
    membershipId: membership._id.toString(),
    status: membership.status,
  });
}
