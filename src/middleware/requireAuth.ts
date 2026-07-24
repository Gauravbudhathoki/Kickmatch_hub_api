import { NextFunction, Request, Response } from "express";
import { User, UserRole } from "../models/User";
import { findActiveSessionByToken, SESSION_COOKIE_NAME } from "../services/session.service";
import { AppError } from "./errorHandler";
import { asyncHandler } from "../utils/asyncHandler";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: UserRole;
      };
      sessionId?: string;
    }
  }
}

export const requireAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const rawToken = req.cookies?.[SESSION_COOKIE_NAME];
  if (!rawToken) {
    throw new AppError("Authentication required.", 401);
  }

  const session = await findActiveSessionByToken(rawToken);
  if (!session) {
    throw new AppError("Session expired or invalid. Please log in again.", 401);
  }

  const user = await User.findById(session.userId);
  if (!user || user.isDisabled) {
    throw new AppError("Account is unavailable.", 401);
  }

  req.user = { id: user._id.toString(), role: user.role };
  req.sessionId = session._id.toString();
  next();
});

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError("Authentication required.", 401);
    }
    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError("You do not have permission to perform this action.", 403);
    }
    next();
  };
}
