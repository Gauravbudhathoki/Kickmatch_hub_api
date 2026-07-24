import { Router } from "express";
import {
  createMatchRequestHandler,
  listMatchesForTeamHandler,
  listIncomingMatchRequestsHandler,
  decideMatchRequestHandler,
} from "../controllers/match.controller";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth } from "../middleware/requireAuth";

export const matchRouter = Router();

matchRouter.use(requireAuth);

matchRouter.post("/request", asyncHandler(createMatchRequestHandler));
matchRouter.get("/team/:teamId", asyncHandler(listMatchesForTeamHandler));
matchRouter.get("/team/:teamId/incoming", asyncHandler(listIncomingMatchRequestsHandler));
matchRouter.patch("/:matchId/decide", asyncHandler(decideMatchRequestHandler));