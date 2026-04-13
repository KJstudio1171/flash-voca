type LogLevel = "DEBUG" | "INFO" | "WARN";

type LogEntry = {
  level: LogLevel;
  category: "app";
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
};

function formatEntry(entry: LogEntry): string {
  const output: LogEntry = { ...entry };
  if (output.context === undefined) delete output.context;
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

function isDev(): boolean {
  return (globalThis as { __DEV__?: boolean }).__DEV__ === true;
}

export const logger = {
  debug(message: string, context?: Record<string, unknown>): void {
    if (isDev()) console.debug(formatEntry(createEntry("DEBUG", message, context)));
  },
  info(message: string, context?: Record<string, unknown>): void {
    if (isDev()) console.info(formatEntry(createEntry("INFO", message, context)));
  },
  warn(message: string, context?: Record<string, unknown>): void {
    if (isDev()) console.warn(formatEntry(createEntry("WARN", message, context)));
  },
};
