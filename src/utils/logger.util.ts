import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";
const logLevel = process.env.LOG_LEVEL || (isProduction ? "info" : "debug");

/**
 * Enterprise Production-Grade Logger using Pino
 * - High performance asynchronous non-blocking stream
 * - NDJSON in production (CloudWatch / Loki ready)
 * - Pretty colored format in development
 * - Automatic redaction of sensitive credentials (passwords, tokens)
 */
export const logger = pino({
  level: logLevel,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "password",
      "*.password",
      "refreshToken",
      "*.refreshToken",
      "creditCardNumber",
      "cvv",
    ],
    censor: "[Redacted]",
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: isProduction
    ? undefined
    : {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:yyyy-mm-dd HH:MM:ss",
          ignore: "pid,hostname",
        },
      },
});

export default logger;
