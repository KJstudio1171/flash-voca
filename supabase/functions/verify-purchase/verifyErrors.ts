export class VerifyError extends Error {
  constructor(
    public status: number,
    public code: string,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "VerifyError";
  }
}
