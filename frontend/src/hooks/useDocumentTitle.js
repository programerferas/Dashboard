import { useEffect } from "react";

// Keeps the browser tab useful when several pages of the tool are open at once.
export const useDocumentTitle = (title) => {
  useEffect(() => {
    document.title = title ? `${title} · Print Style` : "Print Style";
  }, [title]);
};
