import { Schema, model, models, Document, Types, Model } from "mongoose";

export interface ITeam extends Document {
  _id: Types.ObjectId;
  name: string;
  description: string;
  captainId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const teamSchema = new Schema<ITeam>(
  {
    name: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 50 },
    description: { type: String, default: "", maxlength: 300 },
    captainId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

export const Team = (models.Team as Model<ITeam>) || model<ITeam>("Team", teamSchema);
