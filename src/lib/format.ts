export function formatDuration(totalSeconds: number | null | undefined): string {
  if (!totalSeconds || totalSeconds <= 0) return "";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return m > 0 ? `${h} h ${m} min` : `${h} h`;
  return `${Math.max(m, 1)} min`;
}

/** 5025 -> "1:23:45"; 245 -> "4:05" */
export function formatTimestamp(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(sec).padStart(2, "0")}`;
}

/** Acepta "1:23:45", "23:45", "45" (minutos) o "1h 20m". Devuelve segundos o null. */
export function parseTimestamp(input: string): number | null {
  const raw = input.trim().toLowerCase();
  if (!raw) return null;
  const hm = raw.match(/^(?:(\d+)\s*h)?\s*(?:(\d+)\s*m(?:in)?)?$/);
  if (hm && (hm[1] || hm[2])) return Number(hm[1] ?? 0) * 3600 + Number(hm[2] ?? 0) * 60;
  if (/^\d+$/.test(raw)) return Number(raw) * 60;
  const parts = raw.split(":").map((p) => Number(p));
  if (parts.some((n) => Number.isNaN(n)) || parts.length < 2 || parts.length > 3) return null;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

export function countWords(text: string): number {
  const words = text.trim().match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu);
  return words ? words.length : 0;
}

export function formatRemaining(ms: number): string {
  if (ms <= 0) return "0 min";
  const totalMin = Math.ceil(ms / 60000);
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  if (d > 0) return h > 0 ? `${d} d ${h} h` : `${d} d`;
  if (h > 0) return m > 0 ? `${h} h ${m} min` : `${h} h`;
  return `${m} min`;
}

export function formatNumber(n: number, digits = 0): string {
  return new Intl.NumberFormat("es-MX", { maximumFractionDigits: digits }).format(n);
}

export function formatDateTime(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: timezone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}
