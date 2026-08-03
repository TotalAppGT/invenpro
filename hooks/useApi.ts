"use client";

import { useState, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";

interface UseApiOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  immediate?: boolean;
  headers?: Record<string, string>;
}

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  execute: (overrideOptions?: Partial<UseApiOptions>) => Promise<T | null>;
  refresh: () => Promise<T | null>;
}

export function useApi<T = unknown>(
  url: string,
  options: UseApiOptions = {}
): UseApiReturn<T> {
  const { tenant } = useAuth();
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: options.immediate ?? false,
    error: null,
  });
  const abortControllerRef = useRef<AbortController | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const executeFn = useCallback(
    async (overrideOptions?: Partial<UseApiOptions>): Promise<T | null> => {
      const merged = { ...optionsRef.current, ...overrideOptions };

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          ...merged.headers,
        };

        if (tenant?.id) {
          headers["x-tenant-id"] = tenant.id;
        }

        const fetchOptions: RequestInit = {
          method: merged.method || "GET",
          headers,
          signal: controller.signal,
        };

        if (merged.body && merged.method !== "GET") {
          fetchOptions.body = JSON.stringify(merged.body);
        }

        const response = await fetch(url, fetchOptions);

        if (!response.ok) {
          let errorMessage = `Error ${response.status}: ${response.statusText}`;
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.message || errorMessage;
          } catch {
            const errorText = await response.text();
            if (errorText) errorMessage = errorText;
          }
          throw new Error(errorMessage);
        }

        const result = await response.json();
        const data = result.data !== undefined ? result.data : result;

        setState({ data: data as T, loading: false, error: null });
        return data as T;
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          return null;
        }
        const errorMessage =
          err instanceof Error ? err.message : "An unexpected error occurred";
        setState((prev) => ({ ...prev, loading: false, error: errorMessage }));
        return null;
      }
    },
    [url, tenant]
  );

  const executefn = useCallback(
    async (overrideOptions?: Partial<UseApiOptions>): Promise<T | null> => {
      return executeFn(overrideOptions);
    },
    [executeFn]
  );

  const refresh = useCallback(async (): Promise<T | null> => {
    return executeFn();
  }, [executeFn]);

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    execute: executefn,
    refresh,
  };
}
