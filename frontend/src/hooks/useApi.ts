import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Minimal hand-rolled data hook: loads once, exposes `reload`.
 * The loader is kept in a ref so callers can pass inline closures without
 * retriggering the effect; `deps` control when a re-fetch happens.
 */
export function useApi<T>(loader: () => Promise<T>, deps: DependencyList) {
  const [state, setState] = useState<ApiState<T>>({ data: null, loading: true, error: null });
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const reload = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await loaderRef.current();
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({ data: null, loading: false, error: error instanceof Error ? error.message : String(error) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { ...state, reload };
}
