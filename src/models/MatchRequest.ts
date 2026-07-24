import { Schema, model, models, Document, Types, Model } from "mongoose";

export type MatchRequestStatus = "pending" | "accepted" | "rejected" | "cancelled" | "completed";

export interface IMatchRequest extends Document {
  _id: Types.ObjectId;
  requestingTeamId: Types.ObjectId;
  opponentTeamId: Types.ObjectId;
  proposedDate: Date;
  venue: string;
  status: MatchRequestStatus;
  createdBy: Types.ObjectId;
  decidedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const matchRequestSchema = new Schema<IMatchRequest>(
  {
    requestingTeamId: { type: Schema.Types.ObjectId, ref: "Team", required: true, index: true },
    opponentTeamId: { type: Schema.Types.ObjectId, ref: "Team", required: true, index: true },
    proposedDate: { type: Date, required: true },
    venue: { type: String, required: true, trim: true, maxlength: 100 },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "cancelled", "completed"],
      default: "pending",
      index: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    decidedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

export const MatchRequest =
  (models.MatchRequest as Model<IMatchRequest>) || model<IMatchRequest>("MatchRequest", matchRequestSchema);
