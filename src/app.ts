import express, { Application } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import rateLimit from "express-rate-limit";

import { env } from "./config/env";
import { logger } from "./utils/logger";
import { healthRouter } from "./routes/health";
import { authRouter } from "./routes/auth.routes";
import { mfaRouter } from "./routes/mfa.routes";
import { profileRouter } from "./routes/profile.routes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

export function createApp(): Application {
  const app = express();

  // Trust the first proxy hop (needed for correct req.ip behind Docker/Nginx),
  // which rate limiting and audit logs rely on for accurate IP addresses.
  app.set("trust proxy", 1);

  // --- Baseline security headers ---
  app.use(helmet());

  // --- CORS: locked to the known frontend origin, credentials allowed for cookies ---
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    })
  );

 
  app.use(express.json({ limit: "50kb" })); 
  app.use(cookieParser());

 
  app.use(pinoHttp({ logger }));


  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 300,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  
  app.use("/api/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/mfa", mfaRouter);
  app.use("/api/profile", profileRouter);
;

 
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}