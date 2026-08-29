/**
 * Error carrying an HTTP status. Thrown from services; the app-level error
 * handler in src/index.ts turns it into a JSON response.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
