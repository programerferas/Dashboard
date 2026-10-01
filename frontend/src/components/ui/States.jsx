// Loading, empty and error states. Every list and page uses these, so a slow
// request or a failed one always looks the same and always offers a way forward.
import Icon from "./Icon.jsx";
import { Button } from "./Primitives.jsx";

export const Loading = ({ label = "جارٍ التحميل..." }) => (
  <div className="state" role="status" aria-live="polite">
    <div className="spinner" />
    <p className="state__text">{label}</p>
  </div>
);

export const EmptyState = ({
  icon = "inbox",
  title = "لا يوجد شيء هنا بعد",
  text,
  action,
}) => (
  <div className="state">
    <div className="state__icon">
      <Icon name={icon} style={{ width: 20, height: 20 }} />
    </div>
    <h3 className="state__title">{title}</h3>
    {text ? <p className="state__text">{text}</p> : null}
    {action}
  </div>
);

/**
 * Something went wrong. The message comes from the API when it sent one, and
 * `onRetry` re-runs the request rather than making the person reload the page.
 */
export const ErrorState = ({ error, onRetry, title = "تعذّر التحميل" }) => (
  <div className="state state--error" role="alert">
    <div className="state__icon">
      <Icon name="warning" style={{ width: 20, height: 20 }} />
    </div>
    <h3 className="state__title">{title}</h3>
    <p className="state__text">
      {error?.message ?? "حدث خطأ غير متوقع."}
    </p>
    {onRetry ? (
      <Button icon="refresh" onClick={onRetry}>
        إعادة المحاولة
      </Button>
    ) : null}
  </div>
);

// Placeholder rows, so a table does not collapse to nothing while it reloads.
export const TableSkeleton = ({ columns = 5, rows = 6 }) => (
  <tbody aria-hidden="true">
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <tr key={rowIndex}>
        {Array.from({ length: columns }).map((__, columnIndex) => (
          <td key={columnIndex}>
            <div className="skeleton" style={{ width: columnIndex === 0 ? "60%" : "80%" }} />
          </td>
        ))}
      </tr>
    ))}
  </tbody>
);
