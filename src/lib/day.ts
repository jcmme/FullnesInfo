/**
 * Un "día" de FullnesInfo no termina a medianoche: termina a la hora de corte
 * (2:30 AM por defecto; admite medias horas, 2.5 = 2:30). Registrar a las 2:00
 * cuenta para el día anterior. Los días se representan como claves "YYYY-MM-DD".
 */

const HOUR = 3_600_000;

export function dayKey(date: Date, timezone: string, cutoffHour: number): string {
  const shifted = new Date(date.getTime() - cutoffHour * HOUR);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(shifted);
}

export function addDays(key: string, amount: number): string {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + amount);
  return d.toISOString().slice(0, 10);
}

export function compareDays(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function daysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

export function monthOf(key: string): string {
  return key.slice(0, 7);
}

/** Minutos que faltan para el próximo corte, según el reloj local de la zona horaria. */
export function minutesUntilCutoff(now: Date, timezone: string, cutoffHour: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(now);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  const diff = (Math.round(cutoffHour * 60) - (h * 60 + m) + 1440) % 1440;
  return diff === 0 ? 1440 : diff;
}

/** 2.5 -> "2:30 AM"; 0 -> "12:00 AM". */
export function formatCutoff(cutoffHour: number): string {
  const total = Math.round(cutoffHour * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h === 0 ? 12 : h}:${String(m).padStart(2, "0")} AM`;
}

const longDate = (timezone: string) =>
  new Intl.DateTimeFormat("es-MX", { timeZone: timezone, weekday: "long", day: "numeric", month: "long" });

export function formatDayLong(key: string): string {
  return longDate("UTC").format(new Date(`${key}T12:00:00Z`));
}

export function formatDayShort(key: string): string {
  return new Intl.DateTimeFormat("es-MX", { timeZone: "UTC", day: "numeric", month: "short" }).format(
    new Date(`${key}T12:00:00Z`),
  );
}
