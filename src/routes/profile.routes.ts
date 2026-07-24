import { Router } from "express";
import { getMe, updateMe, getUserPublicProfile, exportMe } from "../controllers/profile.controller";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/requireAuth";

export const profileRouter = Router();

profileRouter.use(requireAuth);

profileRouter.get("/me", asyncHandler(getMe));
profileRouter.patch("/me", asyncHandler(updateMe));
profileRouter.get("/export", asyncHandler(exportMe));
profileRouter.get("/:id/public", asyncHandler(getUserPublicProfile));
