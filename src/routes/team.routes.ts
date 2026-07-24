import { Router } from "express";
import {
  createTeamHandler,
  listTeamsHandler,
  getTeamHandler,
  joinTeamHandler,
  listPendingRequestsHandler,
  decideJoinRequestHandler,
} from "../controllers/team.controller";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/requireAuth";

export const teamRouter = Router();

teamRouter.use(requireAuth);

teamRouter.get("/", asyncHandler(listTeamsHandler));
teamRouter.post("/", asyncHandler(createTeamHandler));
teamRouter.get("/:id", asyncHandler(getTeamHandler));
teamRouter.post("/:id/join", asyncHandler(joinTeamHandler));

teamRouter.get("/:id/requests", asyncHandler(listPendingRequestsHandler));
teamRouter.patch("/:id/requests/:membershipId", asyncHandler(decideJoinRequestHandler));
