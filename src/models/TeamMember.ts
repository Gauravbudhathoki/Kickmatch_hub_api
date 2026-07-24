import { Schema, model, models, Document, Types, Model } from "mongoose";

export type TeamMemberStatus = "pending" | "approved" | "rejected" | "removed";

export interface ITeamMember extends Document {
  _id: Types.ObjectId;
  teamId: Types.ObjectId;
  userId: Types.ObjectId;
  status: TeamMemberStatus;
  requestedAt: Date;
  decidedAt: Date | null;
  decidedBy: Types.ObjectId | null;
}

const teamMemberSchema = new Schema<ITeamMember>({
  teamId: { type: Schema.Types.ObjectId, ref: "Team", required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  status: { type: String, enum: ["pending", "approved", "rejected", "removed"], default: "pending", index: true },
  requestedAt: { type: Date, default: () => new Date() },
  decidedAt: { type: Date, default: null },
  decidedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
});

teamMemberSchema.index({ teamId: 1, userId: 1 }, { unique: true });

export const TeamMember =
  (models.TeamMember as Model<ITeamMember>) || model<ITeamMember>("TeamMember", teamMemberSchema);
