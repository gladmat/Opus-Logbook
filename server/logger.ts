import pino from "pino";

// Pretty output in dev for readability; JSON in test/production for log
// aggregators (Railway log search, future Datadog/Loki ingestion). Tests
// run silent unless LOG_LEVEL is set explicitly so vitest output stays
// scannable.
const isProduction = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isTest ? "silent" : "info"),
  // Strip default `pid`/`hostname` — Railway adds these via container
  // metadata, and they make local pino-pretty output noisy.
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss.l",
            ignore: "pid,hostname",
            singleLine: false,
          },
        },
      }),
});

// Subloggers per module so log lines carry their origin without
// repeating the module name in the message string. Use:
//   import { logger } from "./logger";
//   const log = logger.child({ module: "routes" });
//   log.info({ userId }, "user logged in");
export type Logger = typeof logger;
