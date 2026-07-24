import { Router } from "express";
import { register, loginStep1, loginStep2, logout } from "../controllers/auth.controller";
import { asyncHandler } from "../utils/asyncHandler";
import { registerRateLimiter, loginRateLimiter } from "../middleware/rateLimiters";
import { requireAuth } from "../middleware/requireAuth";

export const authRouter = Router();

authRouter.post("/register", registerRateLimiter, asyncHandler(register));
authRouter.post("/login", loginRateLimiter, asyncHandler(loginStep1));
authRouter.post("/login/mfa", loginRateLimiter, asyncHandler(loginStep2));
authRouter.post("/logout", requireAuth, asyncHandler(logout));