// The product catalogue, plus which products and categories actually sell.
//
// The catalogue exists so orders can point at a product instead of retyping its
// name every time; the performance panels answer "what should we keep making?".
import { useEffect, useRef, useState } from "react";
import DataTable from "../components/ui/DataTable.jsx";
import Pagination from "../components/ui/Pagination.jsx";
import SearchInput from "../components/ui/SearchInput.jsx";
import { ConfirmDialog } from "../components/ui/Modal.jsx";
import { EmptyState } from "../components/ui/States.jsx";
import { Badge, Button, Card, PageHead, Select } from "../components/ui/Primitives.jsx";
import ProductFormModal from "../components/products/ProductFormModal.jsx";
import { productsApi } from "../api/products.js";
import { useApi, useAction } from "../hooks/useApi.js";
import { useDebounce } from "../hooks/useDebounce.js";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { countOf, formatNumber, orEmpty } from "../lib/format.js";

// A ranked list with a bar, used for both products and categories.
const RankedList = ({ rows, emptyText }) => {
  if (!rows?.length) return <p className="muted">{emptyText}</p>;

  const max = Math.max(...rows.map((row) => row.orders));

  return (
    <div className="breakdown">
      {rows.map((row, index) => (
        <div className="breakdown__row" key={row.name}>
          <span className="breakdown__label">
            {index + 1}. {row.name}
          </span>
          <span className="breakdown__value">
            {countOf(row.orders, "order")} · {countOf(row.quantity, "item")}
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

const ProductsPage = () => {
  const { isAdmin } = useAuth();
  const toast = useToast();

  const [search, setSearch] = useState("");
  const [active, setActive] = useState("ALL");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 350);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useDocumentTitle("المنتجات");

  const { data, loading, error, reload } = useApi(
    ({ signal }) =>
      productsApi.list({ search: debouncedSearch, active, page, pageSize: 20 }, { signal }),
    [debouncedSearch, active, page],
  );

  // Recomputed from the orders table, so it reflects real sales.
  const { data: performance, reload: reloadPerformance } = useApi(
    ({ signal }) => productsApi.performance({ signal }),
    [],
  );

  const hasLoadedOnce = useRef(false);
  useEffect(() => {
    if (data) hasLoadedOnce.current = true;
  }, [data]);

  const { run: runDelete, saving: deleteBusy } = useAction();

  const onConfirmDelete = async () => {
    try {
      await runDelete(() => productsApi.remove(deleting.productId));
      toast.success(`تم حذف ${deleting.name}`);
      setDeleting(null);
      reload();
      reloadPerformance();
    } catch (deleteError) {
      toast.error(deleteError.message);
    }
  };

  const afterSave = () => {
    reload();
    reloadPerformance();
  };

  const columns = [
    {
      key: "productId",
      label: "الرقم",
      render: (product) => <span className="code">{product.productId}</span>,
    },
    {
      key: "name",
      label: "المنتج",
      render: (product) => <span className="cell-title">{product.name}</span>,
    },
    { key: "category", label: "الفئة", render: (product) => product.category },
    { key: "occasion", label: "المناسبة", render: (product) => orEmpty(product.occasion) },
    {
      key: "orderCount",
      label: "مرات الطلب",
      align: "right",
      render: (product) => formatNumber(product.orderCount),
    },
    {
      key: "active",
      label: "الحالة",
      render: (product) => (
        <Badge tone={product.active ? "green" : "slate"}>
          {product.active ? "نشط" : "غير نشط"}
        </Badge>
      ),
    },
    {
      key: "notes",
      label: "ملاحظات",
      render: (product) => <span className="cell-sub">{orEmpty(product.notes)}</span>,
    },
    {
      key: "actions",
      label: "الإجراءات",
      align: "right",
      render: (product) => (
        <div className="table__actions">
          <Button
            size="sm"
            icon="edit"
            onClick={() => {
              setEditing(product);
              setFormOpen(true);
            }}
          >
            تعديل
          </Button>
          {isAdmin ? (
            <Button size="sm" icon="trash" onClick={() => setDeleting(product)}>
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
        title="المنتجات"
        subtitle="الكتالوج الذي تُبنى منه الطلبات، ومدى مبيع كل منتج."
        actions={
          <Button
            variant="primary"
            icon="plus"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            إضافة منتج
          </Button>
        }
      />

      <div className="dash-grid" style={{ marginBottom: 16 }}>
        <Card title="المنتجات الأكثر شراءً" subtitle="حسب عدد الطلبات">
          <RankedList rows={performance?.topProducts} emptyText="لا توجد طلبات مسجلة بعد." />
        </Card>
        <Card title="الفئات الأكثر شراءً" subtitle="حسب عدد الطلبات">
          <RankedList rows={performance?.topCategories} emptyText="لا توجد طلبات مسجلة بعد." />
        </Card>
      </div>

      <Card flush>
        <div className="filters">
          <div className="filters__row">
            <SearchInput
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder="ابحث عن المنتجات بالاسم أو الرقم أو الفئة..."
            />

            <div className="filters__field">
              <label className="filters__label" htmlFor="activeFilter">
                التوفر
              </label>
              <Select
                id="activeFilter"
                value={active}
                onChange={(event) => {
                  setActive(event.target.value);
                  setPage(1);
                }}
                options={[
                  { value: "ALL", label: "كل المنتجات" },
                  { value: "TRUE", label: "النشطة فقط" },
                  { value: "FALSE", label: "غير النشطة فقط" },
                ]}
              />
            </div>

            <span className="filters__count">
              {data ? countOf(data.pagination.total, "product") : ""}
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
          getRowKey={(product) => product.productId}
          empty={
            <EmptyState
              icon="products"
              title="لا توجد منتجات بعد"
              text="أضف المنتجات التي تطبعها كثيرًا لتسجيل الطلبات بنقرة واحدة."
              action={
                <Button
                  variant="primary"
                  icon="plus"
                  onClick={() => {
                    setEditing(null);
                    setFormOpen(true);
                  }}
                >
                  إضافة منتج
                </Button>
              }
            />
          }
        />

        <Pagination pagination={data?.pagination} onPageChange={setPage} noun="المنتجات" />
      </Card>

      <ProductFormModal
        open={formOpen}
        product={editing}
        onClose={() => setFormOpen(false)}
        onSaved={afterSave}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="حذف هذا المنتج؟"
        message={
          deleting
            ? `سيُزال ${deleting.name} (${deleting.productId}) من الكتالوج. تحتفظ الطلبات السابقة باسم المنتج وتبقى كما هي. إذا أردت فقط إيقاف عرضه، فعدّله واجعله غير نشط بدلًا من ذلك.`
            : ""
        }
        confirmLabel="حذف المنتج"
        busy={deleteBusy}
        onConfirm={onConfirmDelete}
        onClose={() => setDeleting(null)}
      />
    </>
  );
};

export default ProductsPage;
