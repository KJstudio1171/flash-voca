export type AppErrorOptions = {
  context?: Record<string, unknown>;
  cause?: unknown;
};

export abstract class AppError extends Error {
  abstract readonly category: string;
  abstract readonly userMessage: string;
  readonly context?: Record<string, unknown>;
  readonly timestamp: string;

  constructor(message: string, options?: AppErrorOptions) {
    super(message, { cause: options?.cause });
    this.name = this.constructor.name;
    this.context = options?.context;
    this.timestamp = new Date().toISOString();
  }
}
