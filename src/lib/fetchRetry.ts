// raw.githubusercontent.com (y GitHub Pages/API en general) tiene caídas
// reales cada tanto — confirmado en vivo el 2026-08-17 contra
// githubstatus.com ("Partially Degraded Service") mientras Pablo reportaba
// "Failed to fetch" en el Monitor. No es un bug de nuestro código, pero sí
// algo que vale la pena tolerar: reintenta con backoff antes de rendirse.
export class FetchRetryError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "FetchRetryError";
    this.status = status;
  }
}

const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);

export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  { retries = 3, baseDelayMs = 800 }: { retries?: number; baseDelayMs?: number } = {}
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, init);
      if (res.ok) return res;
      if (!RETRYABLE_STATUS.has(res.status) || attempt === retries) {
        throw new FetchRetryError(`HTTP ${res.status}`, res.status);
      }
      lastError = new FetchRetryError(`HTTP ${res.status}`, res.status);
    } catch (e) {
      lastError = e;
      if (attempt === retries) break;
    }
    await new Promise((r) => setTimeout(r, baseDelayMs * Math.pow(2, attempt)));
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
