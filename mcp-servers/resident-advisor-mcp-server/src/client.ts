/**
 * GraphQL client for the Resident Advisor API (https://ra.co/graphql).
 *
 * RA does not publish this API; it is the same GraphQL endpoint the ra.co
 * website uses. No authentication is required, but requests need
 * browser-like headers or Cloudflare rejects them.
 */

const RA_GRAPHQL_URL = "https://ra.co/graphql";
const REQUEST_TIMEOUT_MS = 30_000;

const DEFAULT_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
  Accept: "application/json",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
  Referer: "https://ra.co/events",
};

export class RaApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RaApiError";
  }
}

interface GraphQLErrorEntry {
  message: string;
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: GraphQLErrorEntry[];
}

/**
 * Execute a GraphQL query against ra.co and return the `data` payload.
 * Throws RaApiError with an actionable message on any failure.
 */
export async function raQuery<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(RA_GRAPHQL_URL, {
      method: "POST",
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new RaApiError(
        "Request to ra.co timed out after 30s. The RA API may be slow or unreachable; try again.",
      );
    }
    throw new RaApiError(
      `Network error reaching ra.co: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!response.ok) {
    switch (response.status) {
      case 403:
        throw new RaApiError(
          "ra.co rejected the request (403). Cloudflare may be blocking this IP; wait a bit and retry.",
        );
      case 429:
        throw new RaApiError(
          "ra.co rate limit exceeded (429). Wait before making more requests.",
        );
      default:
        throw new RaApiError(
          `ra.co returned HTTP ${response.status}. Try again later.`,
        );
    }
  }

  let body: GraphQLResponse<T>;
  try {
    body = (await response.json()) as GraphQLResponse<T>;
  } catch {
    throw new RaApiError(
      "ra.co returned a non-JSON response (likely a Cloudflare challenge page). Wait a bit and retry.",
    );
  }

  if (body.errors?.length) {
    const messages = body.errors.map((e) => e.message).join("; ");
    throw new RaApiError(`RA GraphQL error: ${messages}`);
  }

  if (body.data === undefined || body.data === null) {
    throw new RaApiError("RA GraphQL response contained no data.");
  }

  return body.data;
}

/** Convert a thrown error into a user-facing error string for tool output. */
export function errorText(error: unknown): string {
  if (error instanceof RaApiError) {
    return `Error: ${error.message}`;
  }
  return `Error: Unexpected error: ${error instanceof Error ? error.message : String(error)}`;
}

/** Turn an ra.co relative path (e.g. "/events/123") into a full URL. */
export function raUrl(contentUrl: string | null | undefined): string | null {
  if (!contentUrl) return null;
  return `https://ra.co${contentUrl}`;
}
