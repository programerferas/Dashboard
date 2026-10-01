/**
 * Inline SVG icons.
 *
 * An icon font or an icon package would be another dependency to install and
 * keep up to date; these are a handful of stroked paths, drawn on the same 24x24
 * grid, sized by CSS and coloured by `currentColor`.
 *
 * Usage: <Icon name="search" />
 */
const PATHS = {
  dashboard: "M4 13h7V4H4v9Zm0 7h7v-5H4v5Zm9 0h7v-9h-7v9Zm0-16v5h7V4h-7Z",
  customers:
    "M16 20v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm13 9v-1.5a4 4 0 0 0-3-3.87M16 4.13a4 4 0 0 1 0 7.75",
  orders:
    "M8 6h11M8 12h11M8 18h11M4 6h.01M4 12h.01M4 18h.01",
  products:
    "M20 7.5 12 3 4 7.5v9L12 21l8-4.5v-9ZM4 7.5 12 12m0 0 8-4.5M12 12v9",
  settings:
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7.5 7.5 0 0 0-2-1.2L14.6 3H9.4l-.4 2.7c-.7.3-1.4.7-2 1.2l-2.3-1-2 3.4 2 1.5a7.4 7.4 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-1c.6.5 1.3.9 2 1.2l.4 2.7h5.2l.4-2.7c.7-.3 1.4-.7 2-1.2l2.3 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2Z",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5-2 5 5",
  plus: "M12 5v14M5 12h14",
  edit: "M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z",
  trash: "M4 7h16M9 7V4h6v3m-9 0 1 13h10l1-13M10 11v5m4-5v5",
  eye: "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  close: "M6 6l12 12M18 6 6 18",
  chevronLeft: "M15 6l-6 6 6 6",
  chevronRight: "M9 6l6 6-6 6",
  arrowLeft: "M19 12H5m0 0 6-6m-6 6 6 6",
  // "Back" in a right-to-left layout points right.
  arrowRight: "M5 12h14m0 0-6-6m6 6-6 6",
  logout: "M16 17l5-5-5-5m5 5H9M12 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h7",
  menu: "M4 7h16M4 12h16M4 17h16",
  phone:
    "M20 16.9v2.6a1.4 1.4 0 0 1-1.6 1.4A17.6 17.6 0 0 1 3.1 5.6 1.4 1.4 0 0 1 4.5 4h2.6a1.4 1.4 0 0 1 1.4 1.2c.1.9.3 1.7.6 2.5a1.4 1.4 0 0 1-.3 1.5l-1.1 1.1a14 14 0 0 0 5 5l1.1-1.1a1.4 1.4 0 0 1 1.5-.3c.8.3 1.6.5 2.5.6A1.4 1.4 0 0 1 20 16.9Z",
  mail: "M3 6h18v12H3V6Zm0 0 9 7 9-7",
  pin: "M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  calendar: "M4 6h16v15H4V6Zm0 5h16M8 3v4m8-4v4",
  chart: "M4 20V10m5 10V4m5 16v-7m5 7V8",
  inbox:
    "M4 13h4l2 3h4l2-3h4M4 13l2-8h12l2 8v7H4v-7Z",
  warning: "M12 4 2.5 20h19L12 4Zm0 5v6m0 3h.01",
  check: "M5 13l4 4L19 7",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13h.01M11.5 12v4.5",
  user: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  refresh: "M20 12a8 8 0 1 1-2.3-5.6M20 4v4h-4",
  repeat: "M17 2l4 4-4 4M7 22l-4-4 4-4M21 6H8a5 5 0 0 0-5 5m0 7h13a5 5 0 0 0 5-5",
};

export const Icon = ({ name, ...props }) => {
  const path = PATHS[name];
  if (!path) return null;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      // Icons here always sit beside a text label, so they are decorative.
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d={path} />
    </svg>
  );
};

export default Icon;
