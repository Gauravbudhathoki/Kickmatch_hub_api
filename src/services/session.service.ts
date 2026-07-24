import { Response } from "express";
import { Session, ISession } from "../models/Session";
import { generateSessionToken, hashSessionToken } from "../utils/crypto";
import { env } from "../config/env";
import { Types } from "mongoose";

export const SESSION_COOKIE_NAME = "kmh_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export interface SessionContext {
  ipAddress: string;
  userAgent: string;
}

export async function createSession(
  res: Response,
  userId: Types.ObjectId,
  ctx: SessionContext
): Promise<ISession> {
  const rawToken = generateSessionToken();
  const tokenHash = hashSessionToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  const session = await Session.create({
    userId,
    sessionTokenHash: tokenHash,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    expiresAt,
  });

  res.cookie(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: "strict",
    expires: expiresAt,
    path: "/",
  });

  return session;
}

export async function findActiveSessionByToken(rawToken: string): Promise<ISession | null> {
  const tokenHash = hashSessionToken(rawToken);
  const session = await Session.findOne({
    sessionTokenHash: tokenHash,
    revoked: false,
    expiresAt: { $gt: new Date() },
  });

  if (session) {
    session.lastSeenAt = new Date();
    await session.save();
  }

  return session;
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
}

export async function revokeSession(sessionId: Types.ObjectId): Promise<void> {
  await Session.updateOne({ _id: sessionId }, { revoked: true });
}

export async function revokeAllSessionsForUser(userId: Types.ObjectId): Promise<void> {
  await Session.updateMany({ userId }, { revoked: true });
}