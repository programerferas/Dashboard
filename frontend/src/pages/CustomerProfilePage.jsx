// The customer profile — the Customer 360 view.
//
// One request to /api/customers/:customerId returns the customer, their complete
// order history and the calculated statistics, so this page answers every
// question about a customer without opening anything else:
//
//   Who are they? How do I reach them? Where did they come from?
//   When did they first and last buy? How often? What did they buy?
//   Which category do they prefer? Are they new or repeat? What are our notes?
//
// None of the numbers below are stored anywhere: they are calculated from the
// orders (backend/modules/customer/customer.analytics.js), so adding an order
// updates this page immediately.
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import DataTable from "../components/ui/DataTable.jsx";
import { ConfirmDialog } from "../components/ui/Modal.jsx";
import { EmptyState, ErrorState, Loading } from "../components/ui/States.jsx";
import {
  Badge,
  Button,
  Card,
  Stat,
  StatGrid,
} from "../components/ui/Primitives.jsx";
import Icon from "../components/ui/Icon.jsx";
import CustomerFormModal from "../components/customers/CustomerFormModal.jsx";
import OrderFormModal from "../components/orders/OrderFormModal.jsx";
import { customersApi } from "../api/customers.js";
import { ordersApi } from "../api/orders.js";
import { useApi, useAction } from "../hooks/useApi.js";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import {
  EMPTY,
  countOf,
  formatDate,
  formatDateTime,
  formatNumber,
  humanise,
  initials,
  orEmpty,
  relativeDate,
} from "../lib/format.js";
import {
  CUSTOMER_STATUS_FULL_LABEL,
  CUSTOMER_STATUS_TONE,
  ORDER_STATUS_TONE,
} from "../lib/options.js";

// A labelled value in the "Customer information" panel.
const Detail = ({ label, children }) => (
  <div>
    <dt className="details__label">{label}</dt>
    <dd className="details__value">{children}</dd>
  </div>
);

/**
 * "Couples: 2 orders" with a bar showing the share. The bar length is relative to
 * the biggest row, so the most frequent category always fills the track.
 */
const Breakdown = ({ rows, unit = "order" }) => {
  if (!rows?.length) {
    return <p className="muted">لا شيء لعرضه بعد.</p>;
  }

  const max = Math.max(...rows.map((row) => row.orders));

  return (
    <div className="breakdown">
      {rows.map((row, index) => (
        <div className="breakdown__row" key={row.key}>
          <span className="breakdown__label">{row.key}</span>
          <span className="breakdown__value">
            {countOf(row.orders, unit)} · {countOf(row.quantity, "item")}
          </span>
          <div className="breakdown__track">
            <div
              className={`breakdown__bar${index > 0 ? ` breakdown__bar--${Math.min(index + 1, 4)}` : ""}`}
              style={{ width: `${Math.round((row.orders / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

const CustomerProfilePage = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const toast = useToast();

  const [editOpen, setEditOpen] = useState(false);
  const [orderFormOpen, setOrderFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [deletingOrder, setDeletingOrder] = useState(null);

  const { data, loading, error, reload } = useApi(
    ({ signal }) => customersApi.profile(customerId, { signal }),
    [customerId],
  );

  useDocumentTitle(data?.customer?.fullName ?? "العميل");

  const { run: runDelete, saving: deleteBusy } = useAction();

  const onDeleteOrder = async () => {
    try {
      await runDelete(() => ordersApi.remove(deletingOrder.orderId));
      toast.success(`تم حذف الطلب ${deletingOrder.orderId}`);
      setDeletingOrder(null);
      // Reloading recalculates every statistic on this page.
      reload();
    } catch (deleteError) {
      toast.error(deleteError.message);
    }
  };

  if (loading && !data) return <Loading label="جارٍ تحميل العميل..." />;

  if (error) {
    return (
      <>
        <Button icon="arrowRight" onClick={() => navigate("/customers")} style={{ marginBottom: 16 }}>
          العودة إلى العملاء
        </Button>
        <Card>
          <ErrorState
            error={error}
            onRetry={reload}
            title={error.status === 404 ? "العميل غير موجود" : "تعذّر تحميل هذا العميل"}
          />
        </Card>
      </>
    );
  }

  const { customer, orders, stats } = data;

  const orderColumns = [
    {
      key: "orderId",
      label: "رقم الطلب",
      render: (order) => <span className="code">{order.orderId}</span>,
    },
    { key: "orderDate", label: "التاريخ", render: (order) => formatDate(order.orderDate) },
    {
      key: "productName",
      label: "المنتج",
      render: (order) => (
        <>
          <div className="cell-title">{order.productName}</div>
          {order.productId ? <div className="cell-sub code">{order.productId}</div> : null}
        </>
      ),
    },
    { key: "category", label: "الفئة", render: (order) => order.category },
    { key: "occasion", label: "المناسبة", render: (order) => orEmpty(order.occasion) },
    {
      key: "quantity",
      label: "الكمية",
      align: "right",
      render: (order) => formatNumber(order.quantity),
    },
    {
      key: "status",
      label: "الحالة",
      render: (order) => (
        <Badge tone={ORDER_STATUS_TONE[order.status]}>{humanise(order.status)}</Badge>
      ),
    },
    {
      key: "notes",
      label: "ملاحظات",
      render: (order) => <span className="cell-sub">{orEmpty(order.notes)}</span>,
    },
    {
      key: "actions",
      label: "الإجراءات",
      align: "right",
      render: (order) => (
        <div className="table__actions">
          <Button
            size="sm"
            icon="edit"
            onClick={() => {
              setEditingOrder(order);
              setOrderFormOpen(true);
            }}
          >
            تعديل
          </Button>
          {isAdmin ? (
            <Button size="sm" icon="trash" onClick={() => setDeletingOrder(order)}>
              حذف
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="row row--between" style={{ marginBottom: 14 }}>
        <Button icon="arrowRight" onClick={() => navigate("/customers")}>
          العودة إلى العملاء
        </Button>

        <div className="row">
          <Button icon="edit" onClick={() => setEditOpen(true)}>
            تعديل العميل
          </Button>
          <Button
            variant="primary"
            icon="plus"
            onClick={() => {
              setEditingOrder(null);
              setOrderFormOpen(true);
            }}
          >
            إضافة طلب
          </Button>
        </div>
      </div>

      {/* ── Identity ─────────────────────────────────────────────── */}
      <div className="profile-head">
        <span className="profile-head__avatar" aria-hidden="true">
          {initials(customer.fullName)}
        </span>

        <div className="profile-head__main">
          <h1 className="profile-head__name">
            {customer.fullName}
            <Badge tone={CUSTOMER_STATUS_TONE[stats.status]}>
              {CUSTOMER_STATUS_FULL_LABEL[stats.status]}
            </Badge>
          </h1>

          <div className="profile-head__meta">
            <span className="code">{customer.customerId}</span>
            <span>
              <Icon name="phone" style={{ width: 14, height: 14 }} />
              {customer.phone}
            </span>
            {customer.email ? (
              <span>
                <Icon name="mail" style={{ width: 14, height: 14 }} />
                {customer.email}
              </span>
            ) : null}
            <span>
              <Icon name="pin" style={{ width: 14, height: 14 }} />
              {customer.city}, {customer.country}
            </span>
            <span>
              <Icon name="repeat" style={{ width: 14, height: 14 }} />
              المصدر: {humanise(customer.source)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Statistics, all calculated from the orders ───────────── */}
      <h2 className="section-title">إحصائيات العميل</h2>
      <StatGrid>
        <Stat label="إجمالي الطلبات" value={formatNumber(stats.totalOrders)} />
        <Stat
          label="المنتجات المشتراة"
          value={formatNumber(stats.totalProductsPurchased)}
          hint="إجمالي القطع في كل الطلبات"
        />
        <Stat
          label="منتجات مختلفة"
          value={formatNumber(stats.distinctProducts)}
          hint={`ضمن ${countOf(stats.distinctCategories, "category")}`}
        />
        <Stat
          label="أول طلب"
          value={formatDate(stats.firstOrderDate)}
          text
          hint={stats.firstOrderDate ? relativeDate(stats.firstOrderDate) : "لا طلبات بعد"}
        />
        <Stat
          label="آخر طلب"
          value={formatDate(stats.lastOrderDate)}
          text
          hint={stats.lastOrderDate ? relativeDate(stats.lastOrderDate) : "لا طلبات بعد"}
        />
        <Stat
          label="الفئة الأكثر شراءً"
          value={stats.mostPurchasedCategory ?? EMPTY}
          text
          hint={
            stats.categoryBreakdown[0]
              ? `${formatNumber(stats.categoryBreakdown[0].orders)} من أصل ${countOf(stats.totalOrders, "order")}`
              : undefined
          }
        />
        <Stat
          label="المنتج الأكثر شراءً"
          value={stats.mostPurchasedProduct ?? EMPTY}
          text
          hint={
            stats.productBreakdown[0]
              ? `اشتُري ${countOf(stats.productBreakdown[0].orders, "time")}`
              : undefined
          }
        />
        <Stat
          label="الحالة"
          value={CUSTOMER_STATUS_FULL_LABEL[stats.status]}
          text
          hint={
            stats.status === "REPEAT"
              ? "أكثر من طلب"
              : stats.status === "NEW"
                ? "طلب واحد فقط"
                : "لم يطلب بعد"
          }
        />
      </StatGrid>

      <div className="profile-grid" style={{ marginTop: 16 }}>
        {/* ── Left column: information and order history ────────── */}
        <div className="stack">
          <Card title="معلومات العميل">
            <dl className="details">
              <Detail label="رقم العميل">
                <span className="code">{customer.customerId}</span>
              </Detail>
              <Detail label="الاسم الكامل">{customer.fullName}</Detail>
              <Detail label="الهاتف">{customer.phone}</Detail>
              <Detail label="البريد الإلكتروني">{orEmpty(customer.email)}</Detail>
              <Detail label="العمر">{orEmpty(customer.age)}</Detail>
              <Detail label="الجنس">{humanise(customer.gender)}</Detail>
              <Detail label="المدينة">{customer.city}</Detail>
              <Detail label="الدولة">{customer.country}</Detail>
              <Detail label="المصدر">{humanise(customer.source)}</Detail>
              <Detail label="تاريخ الإضافة">{formatDateTime(customer.createdAt)}</Detail>
              <Detail label="آخر تحديث">{formatDateTime(customer.updatedAt)}</Detail>
            </dl>

            {customer.notes ? (
              <>
                <h3 className="section-title" style={{ marginBottom: 8 }}>
                  ملاحظات
                </h3>
                <p className="notes-box">{customer.notes}</p>
              </>
            ) : null}
          </Card>

          <Card
            title="سجل الطلبات"
            subtitle={
              orders.length
                ? `${countOf(orders.length, "order")}، الأحدث أولًا`
                : undefined
            }
            actions={
              <Button
                size="sm"
                icon="plus"
                onClick={() => {
                  setEditingOrder(null);
                  setOrderFormOpen(true);
                }}
              >
                إضافة طلب
              </Button>
            }
            flush
          >
            <DataTable
              columns={orderColumns}
              rows={orders}
              getRowKey={(order) => order.orderId}
              empty={
                <EmptyState
                  icon="orders"
                  title="لا توجد طلبات بعد"
                  text={`${customer.fullName} مسجّل في النظام لكنه لم يشترِ شيئًا بعد.`}
                  action={
                    <Button
                      variant="primary"
                      icon="plus"
                      onClick={() => {
                        setEditingOrder(null);
                        setOrderFormOpen(true);
                      }}
                    >
                      إضافة أول طلب له
                    </Button>
                  }
                />
              }
            />
          </Card>
        </div>

        {/* ── Right column: purchase behaviour ──────────────────── */}
        <div className="stack">
          <Card title="سجل المشتريات" subtitle="الطلبات حسب الفئة">
            <Breakdown rows={stats.categoryBreakdown} />
          </Card>

          <Card title="المنتجات المشتراة">
            {stats.productBreakdown.length ? (
              <div className="chips">
                {stats.productBreakdown.map((product) => (
                  <span className="chip" key={product.key}>
                    {product.key}
                    <span className="chip__count">×{product.quantity}</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="muted">لم يشترِ شيئًا بعد.</p>
            )}
          </Card>

          {stats.occasionBreakdown.length ? (
            <Card title="المناسبات" subtitle="لأي مناسبة يشتري">
              <Breakdown rows={stats.occasionBreakdown} />
            </Card>
          ) : null}

          {stats.latestOrder ? (
            <Card title="آخر طلب">
              <div className="row row--between" style={{ marginBottom: 8 }}>
                <span className="code">{stats.latestOrder.orderId}</span>
                <Badge tone={ORDER_STATUS_TONE[stats.latestOrder.status]}>
                  {humanise(stats.latestOrder.status)}
                </Badge>
              </div>
              <div className="cell-title">{stats.latestOrder.productName}</div>
              <div className="cell-sub">
                {stats.latestOrder.category}
                {stats.latestOrder.occasion ? ` · ${stats.latestOrder.occasion}` : ""} ·{" "}
                {countOf(stats.latestOrder.quantity, "item")}
              </div>
              <div className="cell-sub" style={{ marginTop: 6 }}>
                {formatDate(stats.latestOrder.orderDate)} ({relativeDate(stats.latestOrder.orderDate)})
              </div>
            </Card>
          ) : null}

          {stats.cancelledOrders > 0 ? (
            <Card title="الطلبات الملغاة">
              <p className="cell-sub">
                الطلبات الملغاة ({formatNumber(stats.cancelledOrders)}) ظاهرة في السجل أعلاه، لكنها
                لا تُحتسب في الإحصائيات.
              </p>
            </Card>
          ) : null}

          <Card title="كل الطلبات">
            <p className="cell-sub">
              اعرض طلبات هذا العميل ضمن قائمة الطلبات الكاملة:{" "}
              <Link to={`/orders?customerId=${customer.customerId}`}>
                فتح في الطلبات
              </Link>
            </p>
          </Card>
        </div>
      </div>

      <CustomerFormModal
        open={editOpen}
        customer={customer}
        onClose={() => setEditOpen(false)}
        onSaved={reload}
      />

      {/* Orders added or edited from a profile always belong to that customer, so
          the picker is locked. Moving an order to a different customer is done
          from the Orders page. */}
      <OrderFormModal
        open={orderFormOpen}
        order={editingOrder}
        lockedCustomer={customer}
        onClose={() => setOrderFormOpen(false)}
        onSaved={reload}
      />

      <ConfirmDialog
        open={Boolean(deletingOrder)}
        title="حذف هذا الطلب؟"
        message={
          deletingOrder
            ? `سيُحذف الطلب ${deletingOrder.orderId} (${deletingOrder.productName}) نهائيًا ويُزال من إحصائيات هذا العميل.`
            : ""
        }
        confirmLabel="حذف الطلب"
        busy={deleteBusy}
        onConfirm={onDeleteOrder}
        onClose={() => setDeletingOrder(null)}
      />
    </>
  );
};

export default CustomerProfilePage;
