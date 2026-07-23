import pino from "pino";
import { env, isProd } from "../config/env";

/**
 * Structured, redacted application logger.
 *
 * Security rationale:
 * - `redact` ensures secrets/tokens/passwords are never written to logs,
 *   even if a developer accidentally logs a full request/user object.
 * - JSON structured output (rather than console.log strings) makes logs
 *   machine-parseable for the admin log viewer and alerting rules later.
 */
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

void env; // config imported to guarantee env validation runs before logger is used