import { Router } from "express";
import {
  listUsersHandler,
  changeRoleHandler,
  setDisabledHandler,
  forceLogoutHandler,
  getLogsHandler,
  getAlertsHandler,
} from "../controllers/admin.controller";
import { asyncHandler } from "../utils/asyncHandler";
import { requireAuth, requireRole } from "../middleware/requireAuth";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole("admin"));

adminRouter.get("/users", asyncHandler(listUsersHandler));
adminRouter.patch("/users/:id/role", asyncHandler(changeRoleHandler));
adminRouter.patch("/users/:id/disabled", asyncHandler(setDisabledHandler));
adminRouter.post("/users/:id/force-logout", asyncHandler(forceLogoutHandler));
adminRouter.get("/logs", asyncHandler(getLogsHandler));
adminRouter.get("/alerts", asyncHandler(getAlertsHandler));
