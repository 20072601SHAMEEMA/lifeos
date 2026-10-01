import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Runs an async loader and tracks loading / error / data.
 * `reload()` re-runs it; `setData` allows optimistic local updates.
 */
export function useAsync(loader, deps = []) {
  const [state, setState] = useState({ data: undefined, loading: true, error: null });
  const mounted = useRef(true);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const reload = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await loaderRef.current();
      if (mounted.current) setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      if (mounted.current) setState((s) => ({ ...s, loading: false, error }));
      return undefined;
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    reload();
    return () => {
      mounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const setData = useCallback((updater) => {
    setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater }));
  }, []);

  return { ...state, reload, setData };
}
