// The frame every signed-in page sits in: sidebar on the right (the app is right-to-left), topbar across the
// top, page content in the middle.
//
// On screens narrower than 900px the sidebar becomes a drawer (see the media
// query in styles/index.css); this component owns whether it is open.
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import Icon from "../ui/Icon.jsx";
import { IconButton } from "../ui/Primitives.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { initials, humanise } from "../../lib/format.js";

const NAV_ITEMS = [
  { to: "/", label: "لوحة التحكم", icon: "dashboard", end: true },
  { to: "/customers", label: "العملاء", icon: "customers" },
  { to: "/orders", label: "الطلبات", icon: "orders" },
  { to: "/products", label: "المنتجات", icon: "products" },
];

const Sidebar = ({ open, onNavigate }) => {
  const { isAdmin } = useAuth();

  return (
    <aside className={`sidebar${open ? " is-open" : ""}`}>
      <div className="sidebar__brand">
        <span className="sidebar__logo">PS</span>
        <div>
          <div className="sidebar__brand-name">Print Style</div>
          <div className="sidebar__brand-sub">إدارة العملاء</div>
        </div>
      </div>

      <nav className="sidebar__nav">
        <span className="sidebar__section">الرئيسية</span>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) => `sidebar__link${isActive ? " is-active" : ""}`}
          >
            <Icon name={item.icon} />
            {item.label}
          </NavLink>
        ))}

        <span className="sidebar__section">النظام</span>
        <NavLink
          to="/settings"
          onClick={onNavigate}
          className={({ isActive }) => `sidebar__link${isActive ? " is-active" : ""}`}
        >
          <Icon name="settings" />
          الإعدادات
        </NavLink>
      </nav>

      <div className="sidebar__footer">
        {isAdmin ? "مسجّل الدخول كمدير" : "مسجّل الدخول كموظف"}
      </div>
    </aside>
  );
};

const Topbar = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  // The page title is derived from the route, so a new page does not have to
  // remember to set it.
  const current =
    NAV_ITEMS.find((item) => (item.end ? location.pathname === item.to : location.pathname.startsWith(item.to))) ??
    (location.pathname.startsWith("/settings") ? { label: "الإعدادات" } : { label: "Print Style" });

  return (
    <header className="topbar">
      <IconButton
        icon="menu"
        label="فتح القائمة"
        onClick={onToggleSidebar}
        className="sidebar-toggle"
      />
      <span className="topbar__title">{current.label}</span>

      <div className="topbar__spacer" />

      <div className="topbar__user">
        <span className="topbar__avatar" aria-hidden="true">
          {initials(user?.name)}
        </span>
        <div className="hide-sm">
          <div className="topbar__user-name">{user?.name}</div>
          <div className="topbar__user-role">{humanise(user?.role)}</div>
        </div>
        <IconButton icon="logout" label="تسجيل الخروج" onClick={logout} />
      </div>
    </header>
  );
};

export const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Following a link on a phone should close the drawer behind you.
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />

      {sidebarOpen ? (
        <div
          className="sidebar__backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      <div className="main">
        <Topbar onToggleSidebar={() => setSidebarOpen((open) => !open)} />
        <main className="content">
          {/* Each page renders here. */}
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
