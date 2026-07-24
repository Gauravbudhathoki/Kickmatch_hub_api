import { Router } from "express";
import { setupMfa, verifyMfaSetup, disableMfaHandler } from "../controllers/mfa.controller";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/requireAuth";

export const mfaRouter = Router();

mfaRouter.use(requireAuth);

mfaRouter.post("/setup", asyncHandler(setupMfa));
mfaRouter.post("/verify", asyncHandler(verifyMfaSetup));
mfaRouter.post("/disable", asyncHandler(disableMfaHandler));