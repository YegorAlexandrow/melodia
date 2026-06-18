// Типизированная обёртка над fetch для запросов к бэкенду (/api/*).

import type { CopyListItem, CopyRead, ReleaseRead, SearchResponse } from "../types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    let detail = `${res.status}`;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {
      /* ignore */
    }
    throw new ApiError(detail, res.status);
  }
  return (await res.json()) as T;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path);
}

// --- Health ---
export interface HealthResponse {
  status: string;
  plants: number;
}
export function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/health");
}

// --- Discogs ---
export function searchDiscogs(params: {
  cat?: string;
  q?: string;
}): Promise<SearchResponse> {
  const qs = new URLSearchParams();
  if (params.cat) qs.set("cat", params.cat);
  if (params.q) qs.set("q", params.q);
  return request<SearchResponse>(`/discogs/search?${qs.toString()}`);
}

export function importRelease(discogs_release_id: number): Promise<ReleaseRead> {
  return request<ReleaseRead>("/releases/import", {
    method: "POST",
    body: JSON.stringify({ discogs_release_id }),
  });
}

// --- Copies ---
export function createCopies(
  discogs_release_id: number,
  count: number,
): Promise<CopyRead[]> {
  return request<CopyRead[]>("/copies", {
    method: "POST",
    body: JSON.stringify({ discogs_release_id, count }),
  });
}

export interface CopyQuery {
  status?: string;
  genre?: string;
  plant?: string;
  tag?: string;
  favorite?: boolean;
  q?: string;
  sort?: "year" | "artist" | "added";
}

export function listCopies(params: CopyQuery = {}): Promise<CopyListItem[]> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  }
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return request<CopyListItem[]>(`/copies${suffix}`);
}

export interface Facets {
  total: number;
  genres: string[];
  plants: string[];
  status_counts: Record<string, number>;
}

export function getFacets(): Promise<Facets> {
  return request<Facets>("/copies/facets");
}

export function getCopy(id: string): Promise<CopyRead> {
  return request<CopyRead>(`/copies/${id}`);
}

export function updateCopy(id: string, patch: Record<string, unknown>): Promise<CopyRead> {
  return request<CopyRead>(`/copies/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function addRating(
  id: string,
  payload: { album?: number | null; sound?: number | null; note?: string },
): Promise<CopyRead> {
  return request<CopyRead>(`/copies/${id}/ratings`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// --- Notes ---
export interface NoteRead {
  id: string;
  body: string;
  title?: string | null;
  target_kind: string;
  copy_id?: string | null;
  track_position?: string | null;
  pinned: boolean;
  tags: string[];
  created_at: number;
  updated_at: number;
}

export function listNotes(params: { copy_id?: string; pinned?: boolean; q?: string } = {}): Promise<
  NoteRead[]
> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  }
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return request<NoteRead[]>(`/notes${suffix}`);
}

export function createNote(payload: {
  body: string;
  title?: string;
  target_kind?: string;
  copy_id?: string;
  track_position?: string;
  pinned?: boolean;
  tags?: string[];
}): Promise<NoteRead> {
  return request<NoteRead>("/notes", { method: "POST", body: JSON.stringify(payload) });
}

export function updateNote(id: string, patch: Record<string, unknown>): Promise<NoteRead> {
  return request<NoteRead>(`/notes/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}

export function deleteNote(id: string): Promise<void> {
  return fetch(`/api/notes/${id}`, { method: "DELETE" }).then(() => undefined);
}

// --- Audio ---
export interface AudioRead {
  id: string;
  title?: string | null;
  source: string;
  role?: string | null;
  track_position?: string | null;
  side?: string | null;
  file_format?: string | null;
  sample_rate?: number | null;
  bit_depth?: number | null;
  channels?: number | null;
  duration_sec?: number | null;
  url: string;
  created_at: number;
}

export function listAudio(copyId: string): Promise<AudioRead[]> {
  return request<AudioRead[]>(`/audio?copy_id=${encodeURIComponent(copyId)}`);
}

export async function createAudio(form: FormData): Promise<AudioRead> {
  // multipart — Content-Type выставляет браузер сам (с boundary)
  const res = await fetch("/api/audio", { method: "POST", body: form });
  if (!res.ok) {
    let detail = `${res.status}`;
    try {
      detail = (await res.json())?.detail ?? detail;
    } catch {
      /* ignore */
    }
    throw new ApiError(detail, res.status);
  }
  return (await res.json()) as AudioRead;
}

export function deleteAudio(id: string): Promise<void> {
  return fetch(`/api/audio/${id}`, { method: "DELETE" }).then(() => undefined);
}

// --- Plants ---
export interface PlantRead {
  code: string;
  name: string;
  city?: string | null;
}
export function getPlants(): Promise<PlantRead[]> {
  return request<PlantRead[]>("/plants");
}
