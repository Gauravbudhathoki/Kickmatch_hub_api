import { Types } from "mongoose";
import { ActivityLog, LogSeverity } from "../ models/ActivityLog";
import { logger } from "../utils/logger";

export interface RecordActivityInput {
  userId?: string | Types.ObjectId;
  action: string;
  targetType?: string;
  targetId?: string | Types.ObjectId;
  ipAddress: string;
  userAgent: string;
  severity?: LogSeverity;
  metadata?: Record<string, unknown>;
}

export async function recordActivity(input: RecordActivityInput): Promise<void> {
  const doc = {
    userId: input.userId ? new Types.ObjectId(input.userId) : undefined,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId ? new Types.ObjectId(input.targetId) : undefined,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    severity: input.severity ?? "info",
    metadata: input.metadata,
  };

  await ActivityLog.create(doc);

  const logLevel = doc.severity === "critical" ? "error" : doc.severity === "warning" ? "warn" : "info";
  logger[logLevel]({ ...doc, userId: doc.userId?.toString(), targetId: doc.targetId?.toString() }, input.action);
}