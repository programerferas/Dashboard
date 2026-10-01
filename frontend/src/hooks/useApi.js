// Data fetching, small and explicit. No data-fetching library: every list page
// needs the same four things — data, loading, error, reload — so that is exactly
// what this hook returns.
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Runs `fetcher` when the component mounts and whenever `deps` change.
 *
 * @param fetcher  receives { signal } to pass to the API call
 * @param deps     dependency list, like useEffect
 */
export const useApi = (fetcher, deps = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Bumping this re-runs the effect: that is what reload() does.
  const [reloadToken, setReloadToken] = useState(0);

  // Keeping the fetcher in a ref means callers can pass an inline arrow function
  // without it re-triggering the request on every render.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    // A new request cancels the one before it, so a slow answer to an old search
    // can never overwrite the results of a newer one.
    const controller = new AbortController();
    let active = true;

    setLoading(true);
    setError(null);

    fetcherRef
      .current({ signal: controller.signal })
      .then((result) => {
        if (active) setData(result);
      })
      .catch((requestError) => {
        if (requestError.name === "AbortError" || !active) return;
        setError(requestError);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadToken]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  return { data, loading, error, reload, setData };
};

/**
 * For actions rather than reads: create, update, delete. Tracks "in flight" so a
 * save button can disable itself, and surfaces the error message for the form.
 */
export const useAction = () => {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const run = useCallback(async (action) => {
    setSaving(true);
    setError(null);
    try {
      return await action();
    } catch (actionError) {
      setError(actionError);
      // Re-thrown so the caller can skip its success step (closing a modal).
      throw actionError;
    } finally {
      setSaving(false);
    }
  }, []);

  return { run, saving, error, setError };
};
