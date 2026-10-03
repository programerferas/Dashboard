// Every order in the shop, with search and filters.
//
// The customer filter can be set from the URL (/orders?customerId=C001), which is
// how the "open in Orders" link on a customer profile works.
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DataTable from "../components/ui/DataTable.jsx";
import Pagination from "../components/ui/Pagination.jsx";
import SearchInput from "../components/ui/SearchInput.jsx";
import { ConfirmDialog } from "../components/ui/Modal.jsx";
import { EmptyState } from "../components/ui/States.jsx";
import { Badge, Button, Card, PageHead, Select } from "../components/ui/Primitives.jsx";
import OrderFormModal from "../components/orders/OrderFormModal.jsx";
import { ordersApi } from "../api/orders.js";
import { useApi, useAction } from "../hooks/useApi.js";
import { useDebounce } from "../hooks/useDebounce.js";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { formatAmount, formatDate, formatNumber, humanise, orEmpty } from "../lib/format.js";
import { ORDER_SORTS, ORDER_STATUSES, ORDER_STATUS_TONE, toOptions } from "../lib/options.js";
import { openWhatsappShare } from "../lib/whatsapp.js";

const OrdersPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAdmin } = useAuth();
  const toast = useToast();

  const initialFilters = {
    search: "",
    customerId: searchParams.get("customerId") ?? "",
    category: "",
    status: "ALL",
    dateFrom: "",
    dateTo: "",
    sort: "recent",
  };

  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(filters.search, 350);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useDocumentTitle("الطلبات");

  const { data, loading, error, reload } = useApi(
    ({ signal }) =>
      ordersApi.list(
        {
          search: debouncedSearch,
          customerId: filters.customerId,
          category: filters.category,
          status: filters.status,
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
          sort: filters.sort,
          page,
          pageSize: 20,
        },
        { signal },
      ),
    [debouncedSearch, filters.customerId, filters.category, filters.status, filters.dateFrom, filters.dateTo, filters.sort, page],
  );

  const { data: options } = useApi(({ signal }) => ordersApi.filterOptions({ signal }), []);

  const setFilter = (field) => (value) => {
    setFilters((current) => ({ ...current, [field]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({ ...initialFilters, customerId: "" });
    // Drop ?customerId= from the URL too, so a refresh does not bring it back.
    setSearchParams({});
    setPage(1);
  };

  const hasLoadedOnce = useRef(false);
  useEffect(() => {
    if (data) hasLoadedOnce.current = true;
  }, [data]);

  const { run: runDelete, saving: deleteBusy } = useAction();

  const onConfirmDelete = async () => {
    try {
      await runDelete(() => ordersApi.remove(deleting.orderId));
      toast.success(`تم حذف الطلب ${deleting.orderId}`);
      setDeleting(null);
      reload();
    } catch (deleteError) {
      toast.error(deleteError.message);
    }
  };

  const filtersActive =
    Boolean(filters.search) ||
    Boolean(filters.customerId) ||
    Boolean(filters.category) ||
    filters.status !== "ALL" ||
    Boolean(filters.dateFrom) ||
    Boolean(filters.dateTo);

  const columns = [
    {
      key: "orderId",
      label: "رقم الطلب",
      render: (order) => <span className="code">{order.orderId}</span>,
    },
    {
      key: "customer",
      label: "العميل",
      render: (order) => (
        <>
          <div className="cell-title">{order.customer.fullName}</div>
          <div className="cell-sub code">{order.customerId}</div>
        </>
      ),
    },
    { key: "phone", label: "الهاتف", render: (order) => order.customer.phone },
    { key: "orderDate", label: "التاريخ", render: (order) => formatDate(order.orderDate) },
    {
      key: "product",
      label: "المنتج",
      render: (order) => (
        <>
          <div className="cell-title">{order.productName}</div>
          {order.productId ? <div className="cell-sub code">{order.productId}</div> : null}
        </>
      ),
    },
    { key: "category", label: "الفئة", render: (order) => order.category },
    {
      key: "paidAmount",
      label: "قدر المبلغ المدفوع",
      align: "right",
      render: (order) => formatAmount(order.paidAmount),
    },
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
        <div className="table__actions" onClick={(event) => event.stopPropagation()}>
          <Button
            size="sm"
            icon="eye"
            onClick={() => navigate(`/customers/${order.customerId}`)}
          >
            العميل
          </Button>
          <Button
            size="sm"
            icon="edit"
            onClick={() => {
              setEditing(order);
              setFormOpen(true);
            }}
          >
            تعديل
          </Button>
          <Button size="sm" icon="phone" onClick={() => openWhatsappShare(order)}>
            واتساب
          </Button>
          {isAdmin ? (
            <Button size="sm" icon="trash" onClick={() => setDeleting(order)}>
              حذف
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHead
        title="الطلبات"
        subtitle="كل طلبات المحل، وكل طلب مرتبط بعميل."
        actions={
          <Button
            variant="primary"
            icon="plus"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            إضافة طلب
          </Button>
        }
      />

      <Card flush>
        <div className="filters">
          <div className="filters__row">
            <SearchInput
              value={filters.search}
              onChange={setFilter("search")}
              placeholder="ابحث برقم الطلب أو رقم العميل أو الاسم أو الهاتف أو المنتج..."
            />

            <div className="filters__field">
              <label className="filters__label" htmlFor="statusFilter">
                الحالة
              </label>
              <Select
                id="statusFilter"
                value={filters.status}
                onChange={(event) => setFilter("status")(event.target.value)}
                options={[{ value: "ALL", label: "كل الحالات" }, ...toOptions(ORDER_STATUSES)]}
              />
            </div>

            <div className="filters__field">
              <label className="filters__label" htmlFor="categoryFilter">
                الفئة
              </label>
              <Select
                id="categoryFilter"
                value={filters.category}
                onChange={(event) => setFilter("category")(event.target.value)}
                options={options?.categories ?? []}
                placeholder="كل الفئات"
              />
            </div>
          </div>

          <div className="filters__row">
            <div className="filters__field">
              <label className="filters__label" htmlFor="customerFilter">
                رقم العميل
              </label>
              <input
                id="customerFilter"
                className="input"
                value={filters.customerId}
                onChange={(event) => setFilter("customerId")(event.target.value.toUpperCase())}
                placeholder="C001"
              />
            </div>

            <div className="filters__field">
              <label className="filters__label" htmlFor="dateFrom">
                تاريخ الطلب من
              </label>
              <input
                id="dateFrom"
                className="input"
                type="date"
                value={filters.dateFrom}
                onChange={(event) => setFilter("dateFrom")(event.target.value)}
              />
            </div>

            <div className="filters__field">
              <label className="filters__label" htmlFor="dateTo">
                تاريخ الطلب إلى
              </label>
              <input
                id="dateTo"
                className="input"
                type="date"
                value={filters.dateTo}
                onChange={(event) => setFilter("dateTo")(event.target.value)}
              />
            </div>

            <div className="filters__field">
              <label className="filters__label" htmlFor="orderSort">
                الترتيب حسب
              </label>
              <Select
                id="orderSort"
                value={filters.sort}
                onChange={(event) => setFilter("sort")(event.target.value)}
                options={ORDER_SORTS}
              />
            </div>

            {filtersActive ? (
              <Button size="sm" variant="ghost" icon="close" onClick={clearFilters}>
                مسح الفلاتر
              </Button>
            ) : null}

            <span className="filters__count">
              {data ? `النتائج: ${formatNumber(data.pagination.total)}` : ""}
            </span>
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={data?.items}
          loading={loading}
          firstLoad={!hasLoadedOnce.current}
          error={error}
          onRetry={reload}
          getRowKey={(order) => order.orderId}
          empty={
            filtersActive ? (
              <EmptyState
                icon="search"
                title="لا توجد طلبات مطابقة"
                text="جرّب بحثًا مختلفًا، أو امسح الفلاتر."
                action={
                  <Button icon="close" onClick={clearFilters}>
                    مسح الفلاتر
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon="orders"
                title="لا توجد طلبات بعد"
                text="أضف طلبًا وسيظهر هنا وفي ملف العميل."
                action={
                  <Button
                    variant="primary"
                    icon="plus"
                    onClick={() => {
                      setEditing(null);
                      setFormOpen(true);
                    }}
                  >
                    إضافة طلب
                  </Button>
                }
              />
            )
          }
        />

        <Pagination pagination={data?.pagination} onPageChange={setPage} noun="الطلبات" />
      </Card>

      <OrderFormModal
        open={formOpen}
        order={editing}
        onClose={() => setFormOpen(false)}
        onSaved={reload}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="حذف هذا الطلب؟"
        message={
          deleting
            ? `سيُحذف الطلب ${deleting.orderId} (${deleting.productName} للعميل ${deleting.customer.fullName}) نهائيًا، وستتحدّث إحصائياته.`
            : ""
        }
        confirmLabel="حذف الطلب"
        busy={deleteBusy}
        onConfirm={onConfirmDelete}
        onClose={() => setDeleting(null)}
      />
    </>
  );
};

export default OrdersPage;
