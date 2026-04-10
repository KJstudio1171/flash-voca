import { AppError } from "@/src/core/errors/AppError";

type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

type LogEntry = {
  level: LogLevel;
  category: string;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
};

function formatEntry(entry: LogEntry): string {
  const output: LogEntry = { ...entry };
  if (output.context === undefined) {
    delete output.context;
  }
  return JSON.stringify(output, null, 2);
}

function createEntry(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
): LogEntry {
  return {
    level,
    category: "app",
    message,
    context,
    timestamp: new Date().toISOString(),
  };
}

export const logger = {
  debug(message: string, context?: Record<string, unknown>): void {
    console.debug(formatEntry(createEntry("DEBUG", message, context)));
  },

  info(message: string, context?: Record<string, unknown>): void {
    console.info(formatEntry(createEntry("INFO", message, context)));
  },

  warn(message: string, context?: Record<string, unknown>): void {
    console.warn(formatEntry(createEntry("WARN", message, context)));
  },

  error(appError: AppError): void {
    const entry: LogEntry = {
      level: "ERROR",
      category: appError.category,
      message: `${appError.name}: ${appError.message}`,
      context: appError.context,
      timestamp: appError.timestamp,
    };
    console.error(formatEntry(entry));
  },
};
