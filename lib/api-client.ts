interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
}

export interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: Record<string, unknown>;
}

export async function api<T = unknown>(url: string, options: ApiOptions = {}): Promise<ApiResult<T>> {
  const method = options.method ?? "GET";
  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: options.body && method !== "GET" ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
    });

    let json: ApiResult<T> | null = null;
    try {
      json = (await res.json()) as ApiResult<T>;
    } catch {
      json = null;
    }

    if (!res.ok) {
      return { success: false, error: json?.error || `Error ${res.status}` };
    }
    return json ?? { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Error de red" };
  }
}
