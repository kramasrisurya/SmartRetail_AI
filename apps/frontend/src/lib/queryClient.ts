import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";

interface QueryCacheEntry<T> {
  data: T | undefined;
  error: Error | null;
  isLoading: boolean;
  isFetching: boolean;
  updatedAt: number;
}

type QueryFn<T> = () => Promise<T>;

interface QueryOptions {
  staleTime?: number;
  refetchInterval?: number;
  enabled?: boolean;
  refetchOnWindowFocus?: boolean;
}

class EnterpriseQueryClient {
  private cache = new Map<string, QueryCacheEntry<unknown>>();
  private subscribers = new Map<string, Set<() => void>>();
  private promises = new Map<string, Promise<unknown>>();

  getQueryData<T>(key: string): T | undefined {
    return this.cache.get(key)?.data as T | undefined;
  }

  setQueryData<T>(key: string, data: T | ((prev: T | undefined) => T)): void {
    const prev = this.getQueryData<T>(key);
    const next = typeof data === "function" ? (data as (p: T | undefined) => T)(prev) : data;
    const entry: QueryCacheEntry<T> = {
      data: next,
      error: null,
      isLoading: false,
      isFetching: false,
      updatedAt: Date.now(),
    };
    this.cache.set(key, entry as QueryCacheEntry<unknown>);
    this.notify(key);
  }

  invalidateQueries(keyPrefix: string): void {
    for (const [key] of this.cache.entries()) {
      if (key.startsWith(keyPrefix)) {
        const entry = this.cache.get(key);
        if (entry) {
          entry.updatedAt = 0; // Mark as stale
          this.notify(key);
        }
      }
    }
  }

  subscribe(key: string, callback: () => void): () => void {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key)!.add(callback);
    return () => {
      this.subscribers.get(key)?.delete(callback);
      if (this.subscribers.get(key)?.size === 0) {
        this.subscribers.delete(key);
      }
    };
  }

  private notify(key: string): void {
    this.subscribers.get(key)?.forEach((cb) => cb());
  }

  async fetchQuery<T>(key: string, queryFn: QueryFn<T>, staleTime = 5000): Promise<T> {
    const existing = this.cache.get(key) as QueryCacheEntry<T> | undefined;
    const now = Date.now();

    if (existing?.data !== undefined && now - existing.updatedAt < staleTime) {
      return existing.data;
    }

    if (this.promises.has(key)) {
      return this.promises.get(key) as Promise<T>;
    }

    const currentEntry: QueryCacheEntry<T> = existing || {
      data: undefined,
      error: null,
      isLoading: existing ? false : true,
      isFetching: true,
      updatedAt: 0,
    };
    currentEntry.isFetching = true;
    this.cache.set(key, currentEntry as QueryCacheEntry<unknown>);
    this.notify(key);

    const promise = (async () => {
      try {
        const data = await queryFn();
        this.cache.set(key, {
          data,
          error: null,
          isLoading: false,
          isFetching: false,
          updatedAt: Date.now(),
        });
        this.notify(key);
        return data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        this.cache.set(key, {
          data: existing?.data,
          error,
          isLoading: false,
          isFetching: false,
          updatedAt: Date.now(),
        });
        this.notify(key);
        throw error;
      } finally {
        this.promises.delete(key);
      }
    })();

    this.promises.set(key, promise);
    return promise;
  }
}

export const queryClient = new EnterpriseQueryClient();

const QueryContext = createContext<EnterpriseQueryClient>(queryClient);

export function QueryClientProvider({
  client = queryClient,
  children,
}: {
  client?: EnterpriseQueryClient;
  children: React.ReactNode;
}) {
  return <QueryContext.Provider value={client}>{children}</QueryContext.Provider>;
}

export function useQuery<T>(
  key: string | (string | number | undefined | null)[],
  queryFn: QueryFn<T>,
  options: QueryOptions = {}
) {
  const { staleTime = 4000, refetchInterval, enabled = true, refetchOnWindowFocus = true } = options;
  const keyStr = Array.isArray(key) ? key.filter(Boolean).join(":") : key;
  const client = useContext(QueryContext);

  const [, forceUpdate] = useState({});
  const entry = client.getQueryData<T>(keyStr);

  const fetchRef = useRef(queryFn);
  fetchRef.current = queryFn;

  const executeFetch = useCallback(
    (isBackground = false) => {
      if (!enabled || !keyStr) return;
      client.fetchQuery(keyStr, () => fetchRef.current(), isBackground ? 0 : staleTime).catch(() => {});
    },
    [client, keyStr, enabled, staleTime]
  );

  useEffect(() => {
    if (!enabled || !keyStr) return;

    const unsubscribe = client.subscribe(keyStr, () => forceUpdate({}));
    executeFetch();

    let intervalId: number | undefined;
    if (refetchInterval && refetchInterval > 0) {
      intervalId = window.setInterval(() => {
        if (document.visibilityState === "visible") {
          executeFetch(true);
        }
      }, refetchInterval);
    }

    const handleFocus = () => {
      if (refetchOnWindowFocus && document.visibilityState === "visible") {
        executeFetch(true);
      }
    };

    window.addEventListener("visibilitychange", handleFocus);
    window.addEventListener("focus", handleFocus);

    return () => {
      unsubscribe();
      if (intervalId) clearInterval(intervalId);
      window.removeEventListener("visibilitychange", handleFocus);
      window.removeEventListener("focus", handleFocus);
    };
  }, [client, keyStr, enabled, refetchInterval, refetchOnWindowFocus, executeFetch]);

  const rawEntry = (client as unknown as { cache: Map<string, QueryCacheEntry<T>> }).cache?.get(keyStr);

  return {
    data: rawEntry?.data,
    error: rawEntry?.error,
    isLoading: rawEntry?.isLoading ?? (rawEntry?.data === undefined && enabled),
    isFetching: rawEntry?.isFetching ?? false,
    refetch: () => executeFetch(true),
  };
}

export function useMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: {
    onSuccess?: (data: TData, variables: TVariables) => void | Promise<void>;
    onError?: (error: Error, variables: TVariables) => void | Promise<void>;
    onSettled?: () => void;
  }
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(
    async (variables: TVariables) => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await mutationFn(variables);
        if (options?.onSuccess) {
          await options.onSuccess(data, variables);
        }
        return data;
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        setError(errorObj);
        if (options?.onError) {
          await options.onError(errorObj, variables);
        }
        throw errorObj;
      } finally {
        setIsLoading(false);
        if (options?.onSettled) {
          options.onSettled();
        }
      }
    },
    [mutationFn, options]
  );

  return {
    mutate,
    isLoading,
    error,
  };
}
