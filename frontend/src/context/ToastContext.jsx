// Brief confirmations ("Customer saved") in the corner of the screen.
//
// A toast is for feedback that does not need a decision. Anything that needs a
// decision is a ConfirmDialog, and anything that blocks the page is an ErrorState.
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import Icon from "../components/ui/Icon.jsx";

const ToastContext = createContext(null);

let nextId = 1;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (message, tone = "success") => {
      const id = nextId++;
      setToasts((current) => [...current, { id, message, tone }]);
      // Long enough to read, short enough not to get in the way.
      setTimeout(() => dismiss(id), 3500);
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({
      show,
      success: (message) => show(message, "success"),
      error: (message) => show(message, "error"),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* aria-live so a screen reader announces the confirmation too. */}
      <div className="toast-stack" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast${toast.tone === "error" ? " toast--error" : ""}`}
            onClick={() => dismiss(toast.id)}
          >
            <Icon
              name={toast.tone === "error" ? "warning" : "check"}
              style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1 }}
            />
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside a ToastProvider");
  return context;
};
