// The dashboard: the state of the business in one screen.
//
// Everything here comes from one request to /api/dashboard/overview, and every
// number is calculated from the customers and orders tables when the page loads.
// There are no revenue figures because the database holds no prices — inventing
// them would be worse than leaving them out.
import { Link, useNavigate } from "react-router-dom";
import { Badge, Button, Card, PageHead, Stat, StatGrid } from "../components/ui/Primitives.jsx";
import { ErrorState, Loading } from "../components/ui/States.jsx";
import { dashboardApi } from "../api/dashboard.js";
import { useApi } from "../hooks/useApi.js";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { useAuth } from "../context/AuthContext.jsx";
import {
  countOf,
  formatDate,
  formatDateTime,
  formatNumber,
  humanise,
  relativeDate,
} from "../lib/format.js";
import { CUSTOMER_STATUS_TONE, ORDER_STATUS_TONE } from "../lib/options.js";

// A ranked list with a share bar — the same shape used on the Products page.
const RankedList = ({ rows, emptyText, unit = "order" }) => {
  if (!rows?.length) return <p className="muted">{emptyText}</p>;

  const max = Math.max(...rows.map((row) => row.orders ?? row.customers));

  return (
    <div className="breakdown">
      {rows.map((row, index) => {
        const value = row.orders ?? row.customers;
        return (
          <div className="breakdown__row" key={row.name ?? row.source}>
            <span className="breakdown__label">{row.name ?? humanise(row.source)}</span>
            <span className="breakdown__value">
              {countOf(value, unit)}
            </span>
            <div className="breakdown__track">
              <div
                className={`breakdown__bar${index > 0 ? ` breakdown__bar--${Math.min(index + 1, 4)}` : ""}`}
                style={{ width: `${Math.round((value / max) * 100)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, loading, error, reload } = useApi(
    ({ signal }) => dashboardApi.overview({ signal }),
    [],
  );

  useDocumentTitle("لوحة التحكم");

  if (loading && !data) return <Loading label="جارٍ تحميل لوحة التحكم..." />;
  if (error) {
    return (
      <Card>
        <ErrorState error={error} onRetry={reload} title="تعذّر تحميل لوحة التحكم" />
      </Card>
    );
  }

  const { customers, orders, products, sources, recentCustomers, recentOrders } = data;

  return (
    <>
      <PageHead
        title={`مرحبًا بعودتك، ${user?.name?.split(" ")[0] ?? ""}`}
        subtitle="نظرة سريعة على العملاء والطلبات والمنتجات الأكثر مبيعًا."
        actions={
          <>
            <Button icon="refresh" onClick={reload}>
              تحديث
            </Button>
            <Button variant="primary" icon="customers" onClick={() => navigate("/customers")}>
              فتح العملاء
            </Button>
          </>
        }
      />

      {/* ── Customers ────────────────────────────────────────────── */}
      <h2 className="section-title">العملاء</h2>
      <StatGrid>
        <Stat label="إجمالي العملاء" value={formatNumber(customers.totalCustomers)} />
        <Stat
          label="العملاء الجدد"
          value={formatNumber(customers.newCustomers)}
          hint="طلب واحد فقط"
        />
        <Stat
          label="العملاء المتكررون"
          value={formatNumber(customers.repeatCustomers)}
          hint="أكثر من طلب"
        />
        <Stat
          label="نسبة التكرار"
          value={`${customers.repeatRate}%`}
          hint="من العملاء الذين طلبوا"
        />
      </StatGrid>

      {/* ── Orders ───────────────────────────────────────────────── */}
      <h2 className="section-title">الطلبات</h2>
      <StatGrid>
        <Stat label="إجمالي الطلبات" value={formatNumber(orders.totalOrders)} />
        <Stat label="هذا الشهر" value={formatNumber(orders.ordersThisMonth)} />
        <Stat label="اليوم" value={formatNumber(orders.ordersToday)} />
        <Stat
          label="عملاء بلا طلبات"
          value={formatNumber(customers.withoutOrders)}
          hint="استفسارات تستحق المتابعة"
        />
      </StatGrid>

      {/* ── Behaviour and activity ───────────────────────────────── */}
      <h2 className="section-title">الأكثر مبيعًا</h2>
      <div className="dash-grid">
        <Card title="المنتجات الأكثر شراءً" subtitle="من كل الطلبات">
          <RankedList rows={products.topProducts} emptyText="لا توجد طلبات مسجلة بعد." />
        </Card>

        <Card title="أهم الفئات" subtitle="من كل الطلبات">
          <RankedList rows={products.topCategories} emptyText="لا توجد طلبات مسجلة بعد." />
        </Card>

        <Card title="من أين يأتي العملاء" subtitle="حسب المصدر">
          <RankedList rows={sources} emptyText="لا يوجد عملاء بعد." unit="customer" />
        </Card>

        <Card title="الطلبات حسب الحالة" subtitle="ضغط العمل الحالي">
          {orders.byStatus.length ? (
            <div className="chips">
              {orders.byStatus.map((row) => (
                <span className="chip" key={row.status}>
                  <Badge tone={ORDER_STATUS_TONE[row.status]}>{humanise(row.status)}</Badge>
                  <span className="chip__count">{formatNumber(row.orders)}</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="muted">لا توجد طلبات مسجلة بعد.</p>
          )}
        </Card>

        <Card
          title="أحدث العملاء"
          actions={<Link to="/customers">عرض الكل</Link>}
          flush
        >
          {recentCustomers.length ? (
            <div className="mini-list">
              {recentCustomers.map((customer) => (
                <Link
                  className="mini-list__row"
                  key={customer.customerId}
                  to={`/customers/${customer.customerId}`}
                  style={{ color: "inherit", textDecoration: "none" }}
                >
                  <div className="mini-list__main">
                    <div className="mini-list__title">{customer.fullName}</div>
                    <div className="mini-list__sub">
                      {customer.customerId} · {customer.city} · {humanise(customer.source)}
                    </div>
                  </div>
                  <div className="text-center">
                    <Badge
                      tone={
                        CUSTOMER_STATUS_TONE[
                          customer.totalOrders === 0
                            ? "NO_ORDERS"
                            : customer.totalOrders === 1
                              ? "NEW"
                              : "REPEAT"
                        ]
                      }
                    >
                      {customer.totalOrders === 0
                        ? "بلا طلبات"
                        : countOf(customer.totalOrders, "order")}
                    </Badge>
                    <div className="mini-list__sub">{relativeDate(customer.createdAt)}</div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="muted" style={{ padding: 16 }}>
              لا يوجد عملاء بعد.
            </p>
          )}
        </Card>

        <Card title="أحدث الطلبات" actions={<Link to="/orders">عرض الكل</Link>} flush>
          {recentOrders.length ? (
            <div className="mini-list">
              {recentOrders.map((order) => (
                <Link
                  className="mini-list__row"
                  key={order.orderId}
                  to={`/customers/${order.customerId}`}
                  style={{ color: "inherit", textDecoration: "none" }}
                >
                  <div className="mini-list__main">
                    <div className="mini-list__title">
                      {order.productName} × {order.quantity}
                    </div>
                    <div className="mini-list__sub">
                      {order.customer.fullName} · {order.category} ·{" "}
                      {formatDate(order.orderDate)}
                    </div>
                  </div>
                  <Badge tone={ORDER_STATUS_TONE[order.status]}>{humanise(order.status)}</Badge>
                </Link>
              ))}
            </div>
          ) : (
            <p className="muted" style={{ padding: 16 }}>
              لا توجد طلبات بعد.
            </p>
          )}
        </Card>
      </div>

      <p className="cell-sub" style={{ marginTop: 18 }}>
        الأرقام محسوبة مباشرةً من قاعدة البيانات · آخر تحديث {formatDateTime(data.generatedAt)}
      </p>
    </>
  );
};

export default DashboardPage;
