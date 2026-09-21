export type ItemKind = "video" | "podcast" | "libro" | "curso" | "articulo" | "documento" | "hilo" | "otro";
export type ItemOrigin = "instagram" | "tiktok" | "youtube" | "threads" | "x" | "web" | "otro";
export type ItemStatus = "por_vincular" | "pendiente" | "en_curso" | "terminado";
export type MediaProvider = "youtube" | "openlibrary" | "itunes" | "manual";
export type Rarity = "comun" | "rara" | "legendaria";

export type Chapter = { start: number; title: string };

/** Resultado normalizado de cualquier buscador (YouTube, Open Library, iTunes). */
export type MediaResult = {
  provider: Exclude<MediaProvider, "manual">;
  id: string;
  title: string;
  author: string | null;
  url: string;
  thumbnail: string | null;
  durationSeconds: number | null;
  totalPages: number | null;
  published: string | null;
};

export type Profile = {
  id: string;
  timezone: string;
  cutoff_hour: number;
  min_words: number;
  freezes_per_month: number;
  start_day: string;
  evaluated_through: string | null;
  api_token: string;
};

export type Item = {
  id: string;
  title: string;
  kind: ItemKind;
  origin: ItemOrigin | null;
  origin_url: string | null;
  status: ItemStatus;
  media_provider: MediaProvider | null;
  media_id: string | null;
  media_title: string | null;
  media_author: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  total_pages: number | null;
  chapters: Chapter[];
  candidates: MediaResult[];
  progress_seconds: number;
  progress_pages: number;
  note: string | null;
  created_at: string;
  updated_at: string;
  finished_at: string | null;
};

export type Entry = {
  id: string;
  day: string;
  item_id: string | null;
  mystery_id: string | null;
  kind: string;
  title: string;
  note: string;
  word_count: number;
  minutes: number | null;
  created_at: string;
};

export type MysteryTopic = {
  id: string;
  title: string;
  hook: string;
  why: string;
  area: string;
  rarity: Rarity;
  searchQuery: string;
  questions: string[];
  minutes: number;
};

export type MysteryOpen = {
  id: string;
  topic_id: string;
  rarity: Rarity;
  day: string;
  status: "abierta" | "investigada";
  created_at: string;
};

export type Failure = {
  id: string;
  day: string;
  level: number;
  status: "pendiente" | "castigo" | "perdonado";
  created_at: string;
};

export type PunishmentKind = "ventana" | "dias";
export type PunishmentUnit = "reps" | "seg" | "km";
export type PunishmentStatus = "asignado" | "en_curso" | "cumplido" | "vencido";

export type Punishment = {
  id: string;
  failure_id: string | null;
  parent_id: string | null;
  challenge_id: string;
  kind: PunishmentKind;
  title: string;
  level: number;
  target: number;
  unit: PunishmentUnit;
  window_hours: number | null;
  days: number | null;
  status: PunishmentStatus;
  progress: number;
  start_by: string;
  started_at: string | null;
  due_at: string | null;
  completed_at: string | null;
  created_at: string;
};

export type PunishmentLog = {
  id: string;
  punishment_id: string;
  amount: number;
  created_at: string;
};
