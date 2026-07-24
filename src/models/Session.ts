import { Schema, model, Document, Types } from "mongoose";

export interface ISession extends Document {
  userId: Types.ObjectId;
  sessionTokenHash: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
  revoked: boolean;
}

const sessionSchema = new Schema<ISession>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  sessionTokenHash: { type: String, required: true, unique: true },
  ipAddress: { type: String, required: true },
  userAgent: { type: String, required: true },
  createdAt: { type: Date, default: () => new Date() },
  lastSeenAt: { type: Date, default: () => new Date() },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  revoked: { type: Boolean, default: false },
});

export const Session = model<ISession>("Session", sessionSchema);
