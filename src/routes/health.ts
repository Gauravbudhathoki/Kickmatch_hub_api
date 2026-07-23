import { Router } from "express";
import mongoose from "mongoose";

export const healthRouter = Router();

/**
 * Lightweight liveness/readiness check.
 * Intentionally returns minimal information - no version numbers, no stack
 * details, no internal hostnames - since this endpoint is unauthenticated
 * and reachable by anyone (including Docker healthchecks and load balancers).
 */
healthRouter.get("/", (_req, res) => {
  const dbState = mongoose.connection.readyState; // 1 = connected
  res.status(dbState === 1 ? 200 : 503).json({
    status: dbState === 1 ? "ok" : "degraded",
  });
});