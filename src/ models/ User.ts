import { Schema, model, Document, Types } from "mongoose";

export type UserRole = "player" | "captain" | "admin";

export interface IUser extends Document {
  _id: Types.ObjectId;
  username: string;
  email: string;
  passwordHash: string;
  role: UserRole;

  mfaEnabled: boolean;
  mfaSecretEncrypted?: string;
  mfaBackupCodesHashed: string[];

  isDisabled: boolean;
  failedLoginCount: number;
  lockoutUntil: Date | null;
  lastLoginAt: Date | null;

  profile: {
    displayName: string;
    bio: string;
    position: string;
  };

  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 30 },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["player", "captain", "admin"], default: "player", required: true },

    mfaEnabled: { type: Boolean, default: false },
    // select: false -> never returned by default queries; must opt in explicitly.
    // This is a deliberate defense against accidental data exposure via
    // Team/Profile responses that do `User.find()` without a projection.
    mfaSecretEncrypted: { type: String, select: false },
    mfaBackupCodesHashed: { type: [String], default: [], select: false },

    isDisabled: { type: Boolean, default: false },
    failedLoginCount: { type: Number, default: 0 },
    lockoutUntil: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },

    profile: {
      displayName: { type: String, default: "", maxlength: 50 },
      bio: { type: String, default: "", maxlength: 300 },
      position: { type: String, default: "", maxlength: 30 },
    },
  },
  { timestamps: true }
);


export const User = model<IUser>("User", userSchema);