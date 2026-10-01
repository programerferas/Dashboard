import { useEffect, useState } from "react";

/**
 * Delays a fast-changing value. The search box updates on every keystroke, but
 * the API should only be called once the person stops typing.
 */
export const useDebounce = (value, delay = 350) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    // Each new keystroke clears the previous timer, so only the last one fires.
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
};
