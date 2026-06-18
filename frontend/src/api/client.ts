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

export function listCopies(): Promise<CopyListItem[]> {
  return request<CopyListItem[]>("/copies");
}

export function getCopy(id: string): Promise<CopyRead> {
  return request<CopyRead>(`/copies/${id}`);
}
