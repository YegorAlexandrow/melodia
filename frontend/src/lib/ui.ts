import type { CopyStatus, SoundMode } from "../types";

export interface StatusMeta {
  label: string;
  bg: string;
  fg: string;
}

// Бейджи статуса. Фиксированные статусные цвета (не зависят от темы).
export const STATUS_META: Record<CopyStatus, StatusMeta> = {
  owned: { label: "в коллекции", bg: "var(--status-owned-bg)", fg: "var(--status-owned-fg)" },
  wanted: { label: "в розыске", bg: "var(--status-wanted-bg)", fg: "var(--status-wanted-fg)" },
  ordered: { label: "заказано", bg: "var(--status-sold-bg)", fg: "var(--status-sold-fg)" },
  sold: { label: "продан", bg: "var(--status-sold-bg)", fg: "var(--status-sold-fg)" },
  gifted: { label: "подарен", bg: "var(--status-lent-bg)", fg: "var(--status-lent-fg)" },
  lent_out: { label: "отдал", bg: "var(--status-lent-bg)", fg: "var(--status-lent-fg)" },
};

// Палитра обложек-плейсхолдеров (из дизайн-системы).
const COVER_PALETTE = ["#1c1a17", "#9e2f20", "#21459a", "#3a3f8a", "#7d4a86", "#2f6b4d"];

export function coverBg(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return COVER_PALETTE[h % COVER_PALETTE.length];
}

export const COVER_FG = "#ede4d2";

export function soundModeLabel(m?: SoundMode | null): string | null {
  if (!m) return null;
  return { mono: "моно", stereo: "стерео", quad: "квадро" }[m];
}

// «муз 5 · зв 4» компактный вид оценок
export function ratingCompact(
  album?: number | null,
  sound?: number | null,
): string {
  if (album == null && sound == null) return "—";
  return `${album ?? "—"}·${sound ?? "—"}`;
}

export function formatEpoch(ms?: number | null): string {
  if (!ms) return "";
  const d = new Date(ms);
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
}
