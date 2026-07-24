import { Request, Response } from "express";
import { changeRoleSchema, setDisabledSchema, logsQuerySchema } from "../schemas/admin.schema";
import {
  listAllUsers,
  changeUserRole,
  setUserDisabled,
  forceLogoutUser,
  queryActivityLogs,
  getSecurityAlerts,
} from "../services/admin.service";
import { AppError } from "../middleware/errorHandler";

function requestContext(req: Request) {
  return { ipAddress: req.ip ?? "unknown", userAgent: req.get("user-agent") ?? "unknown" };
}

function assertValidObjectId(id: string | undefined): asserts id is string {
  if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
    throw new AppError("Invalid ID.", 400);
  }
}

export async function listUsersHandler(_req: Request, res: Response): Promise<void> {
  const users = await listAllUsers();
  res.status(200).json(users);
}

export async function changeRoleHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  assertValidObjectId(id);

  const input = changeRoleSchema.parse(req.body);
  const user = await changeUserRole(req.user!.id, id, input, requestContext(req));
  res.status(200).json(user);
}

export async function setDisabledHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  assertValidObjectId(id);

  const input = setDisabledSchema.parse(req.body);
  const user = await setUserDisabled(req.user!.id, id, input, requestContext(req));
  res.status(200).json(user);
}

export async function forceLogoutHandler(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  assertValidObjectId(id);

  await forceLogoutUser(req.user!.id, id, requestContext(req));
  res.status(200).json({ message: "All sessions revoked for this user." });
}

export async function getLogsHandler(req: Request, res: Response): Promise<void> {
  const filters = logsQuerySchema.parse(req.query);
  const logs = await queryActivityLogs(filters);
  res.status(200).json(logs);
}

export async function getAlertsHandler(_req: Request, res: Response): Promise<void> {
  const alerts = await getSecurityAlerts();
  res.status(200).json(alerts);
}
