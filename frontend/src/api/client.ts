// Тонкая обёртка над fetch для запросов к бэкенду (/api/*).

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`);
  if (!res.ok) {
    throw new Error(`API ${path} → ${res.status}`);
  }
  return (await res.json()) as T;
}

export interface HealthResponse {
  status: string;
  plants: number;
}

export function getHealth(): Promise<HealthResponse> {
  return apiGet<HealthResponse>("/health");
}
