// The customers table: search, filter, and open a profile.
//
// This page holds the filter state and passes it to the API; all the counting
// (order totals, new vs repeat) happens on the server, so the table just displays
// what it is given.
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import DataTable from "../components/ui/DataTable.jsx";
import Pagination from "../components/ui/Pagination.jsx";
import SearchInput from "../components/ui/SearchInput.jsx";
import { ConfirmDialog } from "../components/ui/Modal.jsx";
import { EmptyState } from "../components/ui/States.jsx";
import { Badge, Button, Card, PageHead, Select } from "../components/ui/Primitives.jsx";
import CustomerFormModal from "../components/customers/CustomerFormModal.jsx";
import { customersApi } from "../api/customers.js";
import { useApi, useAction } from "../hooks/useApi.js";
import { useDebounce } from "../hooks/useDebounce.js";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { countOf, formatDate, formatNumber, humanise, orEmpty } from "../lib/format.js";
import {
  CUSTOMER_SORTS,
  CUSTOMER_STATUS_FILTERS,
  CUSTOMER_STATUS_LABEL,
  CUSTOMER_STATUS_TONE,
  CUSTOMER_SOURCES,
  toOptions,
} from "../lib/options.js";

const INITIAL_FILTERS = {
  search: "",
  status: "ALL",
  city: "",
  source: "",
  createdFrom: "",
  createdTo: "",
  sort: "recent",
};

const CustomersPage = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const toast = useToast();

  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [page, setPage] = useState(1);

  // Typing should not fire a request per keystroke.
  const debouncedSearch = useDebounce(filters.search, 350);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useDocumentTitle("العملاء");

  const { data, loading, error, reload } = useApi(
    ({ signal }) =>
      customersApi.list(
        {
          search: debouncedSearch,
          status: filters.status,
          city: filters.city,
          source: filters.source,
          createdFrom: filters.createdFrom,
          createdTo: filters.createdTo,
          sort: filters.sort,
          page,
          pageSize: 20,
        },
        { signal },
      ),
    [debouncedSearch, filters.status, filters.city, filters.source, filters.createdFrom, filters.createdTo, filters.sort, page],
  );

  // Cities and sources that exist in the data, for the dropdowns.
  const { data: options } = useApi(({ signal }) => customersApi.filterOptions({ signal }), []);

  // Changing a filter must go back to page 1, otherwise the table can land on a
  // page that no longer exists and look empty.
  const setFilter = (field) => (value) => {
    setFilters((current) => ({ ...current, [field]: value }));
    setPage(1);
  };

  // Distinguishes the very first load (spinner) from a filter change (skeleton).
  const hasLoadedOnce = useRef(false);
  useEffect(() => {
    if (data) hasLoadedOnce.current = true;
  }, [data]);

  const { run: runDelete, saving: deletingBusy } = useAction();

  const onConfirmDelete = async () => {
    try {
      const result = await runDelete(() => customersApi.remove(deleting.customerId));
      toast.success(
        result.deletedOrders > 0
          ? `تم حذف ${deleting.fullName} و${countOf(result.deletedOrders, "order")}`
          : `تم حذف ${deleting.fullName}`,
      );
      setDeleting(null);
      reload();
    } catch (deleteError) {
      toast.error(deleteError.message);
    }
  };

  const filtersActive = useMemo(
    () => JSON.stringify(filters) !== JSON.stringify(INITIAL_FILTERS),
    [filters],
  );

  const columns = [
    {
      key: "customerId",
      label: "الرقم",
      render: (row) => <span className="code">{row.customerId}</span>,
    },
    {
      key: "fullName",
      label: "الاسم",
      render: (row) => (
        <>
          <div className="cell-title">{row.fullName}</div>
          <div className="cell-sub">{orEmpty(row.email)}</div>
        </>
      ),
    },
    { key: "phone", label: "الهاتف", render: (row) => row.phone },
    { key: "age", label: "العمر", align: "right", render: (row) => orEmpty(row.age) },
    {
      key: "city",
      label: "المدينة",
      render: (row) => (
        <>
          <div>{row.city}</div>
          <div className="cell-sub">{row.country}</div>
        </>
      ),
    },
    { key: "source", label: "المصدر", render: (row) => humanise(row.source) },
    {
      key: "totalOrders",
      label: "الطلبات",
      align: "right",
      render: (row) => <strong>{formatNumber(row.totalOrders)}</strong>,
    },
    {
      key: "lastOrderDate",
      label: "آخر طلب",
      render: (row) => formatDate(row.lastOrderDate),
    },
    {
      key: "status",
      label: "الحالة",
      render: (row) => (
        <Badge tone={CUSTOMER_STATUS_TONE[row.status]}>
          {CUSTOMER_STATUS_LABEL[row.status]}
        </Badge>
      ),
    },
    { key: "createdAt", label: "تاريخ الإضافة", render: (row) => formatDate(row.createdAt) },
    {
      key: "actions",
      label: "الإجراءات",
      align: "right",
      render: (row) => (
        <div
          className="table__actions"
          // The row itself opens the profile; the buttons must not do both.
          onClick={(event) => event.stopPropagation()}
        >
          <Button size="sm" icon="eye" onClick={() => navigate(`/customers/${row.customerId}`)}>
            عرض
          </Button>
          <Button
            size="sm"
            icon="edit"
            onClick={() => {
              setEditing(row);
              setFormOpen(true);
            }}
          >
            تعديل
          </Button>
          {isAdmin ? (
            <Button size="sm" icon="trash" onClick={() => setDeleting(row)}>
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
        title="العملاء"
        subtitle="ابحث عن أي عميل، ثم افتح ملفه لترى كل ما اشتراه."
        actions={
          <Button
            variant="primary"
            icon="plus"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            إضافة عميل
          </Button>
        }
      />

      <Card flush>
        <div className="filters">
          <div className="filters__row">
            <SearchInput
              value={filters.search}
              onChange={setFilter("search")}
              placeholder="ابحث بالاسم أو رقم العميل أو الهاتف أو البريد الإلكتروني..."
            />

            <div className="filters__field">
              <label className="filters__label" htmlFor="statusFilter">
                الحالة
              </label>
              <Select
                id="statusFilter"
                value={filters.status}
                onChange={(event) => setFilter("status")(event.target.value)}
                options={CUSTOMER_STATUS_FILTERS}
              />
            </div>

            <div className="filters__field">
              <label className="filters__label" htmlFor="cityFilter">
                المدينة
              </label>
              <Select
                id="cityFilter"
                value={filters.city}
                onChange={(event) => setFilter("city")(event.target.value)}
                options={options?.cities ?? []}
                placeholder="كل المدن"
              />
            </div>

            <div className="filters__field">
              <label className="filters__label" htmlFor="sourceFilter">
                المصدر
              </label>
              <Select
                id="sourceFilter"
                value={filters.source}
                onChange={(event) => setFilter("source")(event.target.value)}
                options={toOptions(options?.sources ?? CUSTOMER_SOURCES)}
                placeholder="كل المصادر"
              />
            </div>
          </div>

          <div className="filters__row">
            <div className="filters__field">
              <label className="filters__label" htmlFor="createdFrom">
                أُضيف من
              </label>
              <input
                id="createdFrom"
                className="input"
                type="date"
                value={filters.createdFrom}
                onChange={(event) => setFilter("createdFrom")(event.target.value)}
              />
            </div>

            <div className="filters__field">
              <label className="filters__label" htmlFor="createdTo">
                أُضيف حتى
              </label>
              <input
                id="createdTo"
                className="input"
                type="date"
                value={filters.createdTo}
                onChange={(event) => setFilter("createdTo")(event.target.value)}
              />
            </div>

            <div className="filters__field">
              <label className="filters__label" htmlFor="sortBy">
                الترتيب حسب
              </label>
              <Select
                id="sortBy"
                value={filters.sort}
                onChange={(event) => setFilter("sort")(event.target.value)}
                options={CUSTOMER_SORTS}
              />
            </div>

            {filtersActive ? (
              <Button
                size="sm"
                variant="ghost"
                icon="close"
                onClick={() => {
                  setFilters(INITIAL_FILTERS);
                  setPage(1);
                }}
              >
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
          getRowKey={(row) => row.customerId}
          onRowClick={(row) => navigate(`/customers/${row.customerId}`)}
          empty={
            filtersActive ? (
              <EmptyState
                icon="search"
                title="لا يوجد عملاء مطابقون"
                text="جرّب بحثًا أقصر، أو امسح الفلاتر لرؤية الجميع."
                action={
                  <Button icon="close" onClick={() => setFilters(INITIAL_FILTERS)}>
                    مسح الفلاتر
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon="customers"
                title="لا يوجد عملاء بعد"
                text="أضف أول عميل، ثم ابدأ بتسجيل طلباته."
                action={
                  <Button
                    variant="primary"
                    icon="plus"
                    onClick={() => {
                      setEditing(null);
                      setFormOpen(true);
                    }}
                  >
                    إضافة عميل
                  </Button>
                }
              />
            )
          }
        />

        <Pagination
          pagination={data?.pagination}
          onPageChange={setPage}
          noun="العملاء"
        />
      </Card>

      <CustomerFormModal
        open={formOpen}
        customer={editing}
        onClose={() => setFormOpen(false)}
        onSaved={reload}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="حذف هذا العميل؟"
        message={
          deleting
            ? `سيُحذف ${deleting.fullName} (${deleting.customerId}) مع جميع طلباته (${countOf(deleting.totalOrders, "order")}) نهائيًا. لا يمكن التراجع عن ذلك.`
            : ""
        }
        confirmLabel="حذف العميل"
        busy={deletingBusy}
        onConfirm={onConfirmDelete}
        onClose={() => setDeleting(null)}
      />
    </>
  );
};

export default CustomersPage;
