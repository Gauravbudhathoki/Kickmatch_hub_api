import pino from "pino";
import { env, isProd } from "../config/env";

export const logger = pino({
  level: isProd ? "info" : "debug",
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "*.password",
      "*.passwordHash",
      "*.mfaSecret",
      "*.mfaSecretEncrypted",
      "*.token",
      "*.sessionToken",
    ],
    censor: "[REDACTED]",
  },
  transport: isProd
    ? undefined
    : {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "SYS:standard" },
      },
});

void env;