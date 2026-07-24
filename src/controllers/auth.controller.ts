import { Request, Response } from "express";
import { registerSchema, loginPasswordStepSchema, loginMfaStepSchema } from "../schemas/auth.schema";
import { registerUser, loginPasswordStep, loginMfaStep } from "../services/auth.service";
import { createSession, clearSessionCookie, revokeSession } from "../services/session.service";
import { Types } from "mongoose";

export async function register(req: Request, res: Response): Promise<void> {
  const input = registerSchema.parse(req.body);

  const user = await registerUser(input, {
    ipAddress: req.ip ?? "unknown",
    userAgent: req.get("user-agent") ?? "unknown",
  });

  res.status(201).json({
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    role: user.role,
  });
}

function publicUser(user: { _id: Types.ObjectId; username: string; email: string; role: string }) {
  return {
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    role: user.role,
  };
}

export async function loginStep1(req: Request, res: Response): Promise<void> {
  const input = loginPasswordStepSchema.parse(req.body);

  const ctx = { ipAddress: req.ip ?? "unknown", userAgent: req.get("user-agent") ?? "unknown" };
  const result = await loginPasswordStep(input, ctx);

  if (result.requiresMfa) {
    res.status(200).json({ requiresMfa: true, pendingToken: result.pendingToken });
    return;
  }

  await createSession(res, result.user!._id, ctx);
  res.status(200).json({ requiresMfa: false, user: publicUser(result.user!) });
}

export async function loginStep2(req: Request, res: Response): Promise<void> {
  const input = loginMfaStepSchema.parse(req.body);

  const ctx = { ipAddress: req.ip ?? "unknown", userAgent: req.get("user-agent") ?? "unknown" };
  const user = await loginMfaStep(input, ctx);

  await createSession(res, user._id, ctx);
  res.status(200).json({ user: publicUser(user) });
}

export async function logout(req: Request, res: Response): Promise<void> {
  if (req.sessionId) {
    await revokeSession(new Types.ObjectId(req.sessionId));
  }
  clearSessionCookie(res);
  res.status(200).json({ message: "Logged out." });
}