/**
 * Ninguna pantalla se queda esperando para siempre: ocho segundos y se rinde con un
 * mensaje claro, en vez de colgarse hasta que el servidor corte.
 */
const TIMEOUT_MS = 8_000;

export async function fetchWithTimeout(url: string, service: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    if (name === "TimeoutError" || name === "AbortError") {
      throw new Error(`${service} tardó demasiado en responder. Intenta otra vez.`);
    }
    throw new Error(`No se pudo conectar con ${service}.`);
  }
}
