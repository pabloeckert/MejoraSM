import "@testing-library/jest-dom";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// ── Guardia de red hermética ────────────────────────────────────────────────
// Prohíbe HTTP real a servicios externos y al backend local de producción (:4002).
// Los tests de integración usan servidores loopback efímeros (puerto 0) propios.
const realFetch = globalThis.fetch?.bind(globalThis);
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);
const PUERTOS_REALES_PROHIBIDOS = new Set(["4002"]);

if (realFetch) {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    let url: URL | null = null;
    try {
      url = new URL(raw, "http://localhost");
    } catch {
      url = null;
    }
    const permitido = url !== null && LOOPBACK_HOSTS.has(url.hostname) && !PUERTOS_REALES_PROHIBIDOS.has(url.port);
    if (!permitido) {
      throw new TypeError(`NetworkGuard: HTTP real bloqueado en tests (${raw})`);
    }
    return realFetch(input, init);
  }) as typeof fetch;
}
