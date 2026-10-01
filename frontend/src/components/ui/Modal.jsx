// Modal dialog, plus the confirmation dialog built on top of it.
//
// Both handle the things that are easy to forget: Escape closes, clicking the
// backdrop closes, the page behind does not scroll, and focus moves into the
// dialog so a keyboard user is not left behind on the page.
import { useEffect, useRef } from "react";
import Icon from "./Icon.jsx";
import { Button, IconButton } from "./Primitives.jsx";

export const Modal = ({ open, title, subtitle, onClose, children, footer, size }) => {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    document.addEventListener("keydown", onKeyDown);

    // Stop the page behind the dialog from scrolling.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Move focus into the dialog, so Tab stays where the person is looking.
    panelRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      // Only a click that starts and ends on the backdrop itself closes the
      // dialog, so dragging to select text inside it does not.
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        ref={panelRef}
        className={`modal${size === "sm" ? " modal--sm" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        tabIndex={-1}
      >
        <header className="modal__head">
          <div>
            <h2 className="modal__title">{title}</h2>
            {subtitle ? <p className="modal__subtitle">{subtitle}</p> : null}
          </div>
          <IconButton icon="close" label="إغلاق" onClick={onClose} />
        </header>

        <div className="modal__body">{children}</div>

        {footer ? <footer className="modal__footer">{footer}</footer> : null}
      </div>
    </div>
  );
};

/**
 * Confirmation before anything destructive. Nothing is deleted anywhere in this
 * app without going through here first.
 */
export const ConfirmDialog = ({
  open,
  title = "هل أنت متأكد؟",
  message,
  confirmLabel = "حذف",
  cancelLabel = "إلغاء",
  busy = false,
  onConfirm,
  onClose,
}) => (
  <Modal
    open={open}
    size="sm"
    title={title}
    onClose={busy ? undefined : onClose}
    footer={
      <>
        <Button onClick={onClose} disabled={busy}>
          {cancelLabel}
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={busy}>
          {busy ? "جارٍ التنفيذ..." : confirmLabel}
        </Button>
      </>
    }
  >
    <div className="row" style={{ alignItems: "flex-start", gap: 12 }}>
      <span
        className="state__icon"
        style={{ width: 34, height: 34, flexShrink: 0, color: "var(--red)", background: "var(--red-soft)", borderColor: "#fecaca" }}
      >
        <Icon name="warning" style={{ width: 17, height: 17 }} />
      </span>
      <p className="grow" style={{ fontSize: 13.5, color: "var(--text-muted)" }}>
        {message}
      </p>
    </div>
  </Modal>
);

export default Modal;
