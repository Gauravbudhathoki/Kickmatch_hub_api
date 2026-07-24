import { Schema, model, Document, Types } from "mongoose";

export type LogSeverity = "info" | "warning" | "critical";

export interface IActivityLog extends Document {
  userId?: Types.ObjectId;
  action: string;
  targetType?: string;
  targetId?: Types.ObjectId;
  ipAddress: string;
  userAgent: string;
  severity: LogSeverity;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const activityLogSchema = new Schema<IActivityLog>({
  userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
  action: { type: String, required: true, index: true },
  targetType: { type: String },
  targetId: { type: Schema.Types.ObjectId },
  ipAddress: { type: String, required: true },
  userAgent: { type: String, required: true },
  severity: { type: String, enum: ["info", "warning", "critical"], default: "info", index: true },
  metadata: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: () => new Date(), index: true },
});

activityLogSchema.index({ userId: 1, createdAt: -1 });

export const ActivityLog = model<IActivityLog>("ActivityLog", activityLogSchema);