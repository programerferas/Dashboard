// Small presentational pieces used everywhere: buttons, cards, badges, stats and
// form fields. They only map props to the class names defined in styles/index.css,
// which keeps the pages readable and the styling in one place.
import Icon from "./Icon.jsx";

// ── Button ───────────────────────────────────────────────────────────
export const Button = ({
  variant = "default", // default | primary | danger | ghost
  size,
  icon,
  block = false,
  children,
  className = "",
  type = "button",
  ...props
}) => {
  const classes = [
    "btn",
    variant !== "default" ? `btn--${variant}` : "",
    size === "sm" ? "btn--sm" : "",
    block ? "btn--block" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} className={classes} {...props}>
      {icon ? <Icon name={icon} /> : null}
      {children}
    </button>
  );
};

// An icon-only control still needs a name for screen readers and a tooltip.
// `className` is merged rather than spread over, so a caller adding a class does
// not accidentally drop the button's own styling.
export const IconButton = ({ icon, label, className = "", ...props }) => (
  <button
    type="button"
    className={`icon-button ${className}`.trim()}
    title={label}
    aria-label={label}
    {...props}
  >
    <Icon name={icon} style={{ width: 16, height: 16 }} />
  </button>
);

// ── Card ─────────────────────────────────────────────────────────────
export const Card = ({ title, subtitle, actions, children, flush = false, className = "" }) => (
  <section className={`card ${className}`}>
    {title || actions ? (
      <header className="card__head">
        <div>
          <h2 className="card__title">{title}</h2>
          {subtitle ? <p className="card__subtitle">{subtitle}</p> : null}
        </div>
        {actions ? <div className="row">{actions}</div> : null}
      </header>
    ) : null}
    <div className={`card__body${flush ? " card__body--flush" : ""}`}>{children}</div>
  </section>
);

// ── Badge ────────────────────────────────────────────────────────────
export const Badge = ({ tone = "slate", children }) => (
  <span className={`badge badge--${tone}`}>{children}</span>
);

// ── Statistic tile ───────────────────────────────────────────────────
// `text` renders a word (a category name) at a readable size instead of a number.
export const Stat = ({ label, value, hint, text = false }) => (
  <div className="stat">
    <span className="stat__label">{label}</span>
    <span className={`stat__value${text ? " stat__value--text" : ""}`}>{value}</span>
    {hint ? <span className="stat__hint">{hint}</span> : null}
  </div>
);

export const StatGrid = ({ children }) => <div className="stat-grid">{children}</div>;

// ── Page header ──────────────────────────────────────────────────────
export const PageHead = ({ title, subtitle, actions }) => (
  <div className="page-head">
    <div>
      <h1 className="page-head__title">{title}</h1>
      {subtitle ? <p className="page-head__subtitle">{subtitle}</p> : null}
    </div>
    {actions ? <div className="page-head__actions">{actions}</div> : null}
  </div>
);

// ── Form fields ──────────────────────────────────────────────────────
export const Field = ({ label, optional = false, error, htmlFor, children, full = false }) => (
  <div className={`field${full ? " form-grid__full" : ""}`}>
    {label ? (
      <label className="field__label" htmlFor={htmlFor}>
        {label}
        {optional ? <span className="field__optional">(اختياري)</span> : null}
      </label>
    ) : null}
    {children}
    {error ? <span className="field__error">{error}</span> : null}
  </div>
);

export const TextInput = ({ error, ...props }) => (
  <input className="input" aria-invalid={error ? "true" : undefined} {...props} />
);

export const TextArea = ({ error, ...props }) => (
  <textarea className="textarea" aria-invalid={error ? "true" : undefined} {...props} />
);

/**
 * A <select>. `options` is a list of { value, label } or plain strings, and
 * `placeholder` adds a leading empty choice for optional fields.
 */
export const Select = ({ options = [], placeholder, error, ...props }) => (
  <select className="select" aria-invalid={error ? "true" : undefined} {...props}>
    {placeholder ? <option value="">{placeholder}</option> : null}
    {options.map((option) => {
      const value = typeof option === "string" ? option : option.value;
      const label = typeof option === "string" ? option : option.label;
      return (
        <option key={value} value={value}>
          {label}
        </option>
      );
    })}
  </select>
);

// ── Alert ────────────────────────────────────────────────────────────
export const Alert = ({ tone = "info", children }) => (
  <div className={`alert alert--${tone}`} role={tone === "error" ? "alert" : undefined}>
    <Icon
      name={tone === "error" ? "warning" : tone === "warning" ? "warning" : "info"}
      style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1 }}
    />
    <span>{children}</span>
  </div>
);

export const FormGrid = ({ children }) => <div className="form-grid">{children}</div>;
