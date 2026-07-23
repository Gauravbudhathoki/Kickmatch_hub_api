import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { logger } from "../utils/logger";
import { isProd } from "../config/env";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: "Not found" });
}


export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    logger.warn({ err: err.flatten(), path: req.path }, "Validation error");
    res.status(400).json({ error: "Validation failed", details: err.flatten().fieldErrors });
    return;
  }

  if (err instanceof AppError) {
    const level = err.statusCode >= 500 ? "error" : "warn";
    logger[level]({ err, path: req.path }, err.message);
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  logger.error({ err, path: req.path }, "Unhandled error");
  res.status(500).json({ error: isProd ? "Internal server error" : (err as Error)?.message });
}