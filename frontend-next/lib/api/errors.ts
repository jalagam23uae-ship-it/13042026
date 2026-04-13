export class ApiError extends Error {
  readonly status: number;
  readonly detail: unknown;

  constructor(status: number, detail: unknown, message?: string) {
    super(message ?? `API error ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

/**
 * Given an openapi-fetch `{ data, error }` tuple, throw ApiError on failure
 * and return the unwrapped data on success. Call sites never deal with null
 * data or raw fetch errors.
 */
export function unwrap<T>(result: { data?: T; error?: unknown; response: Response }): T {
  if (result.error !== undefined || result.data === undefined) {
    throw new ApiError(
      result.response.status,
      result.error,
      typeof result.error === 'object' && result.error && 'detail' in result.error
        ? String((result.error as { detail: unknown }).detail)
        : undefined,
    );
  }
  return result.data;
}
