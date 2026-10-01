// Add / edit order.
//
// Every order belongs to a customer. When adding an order, the customer is either
// picked from the existing ones or, for someone ordering for the first time,
// entered right here and created together with the order. When the form is
// opened from a customer's profile the customer is fixed and shown as a label.
import { useEffect, useMemo, useState } from "react";
import Modal from "../ui/Modal.jsx";
import {
  Alert,
  Button,
  Field,
  FormGrid,
  Select,
  TextArea,
  TextInput,
} from "../ui/Primitives.jsx";
import SearchInput from "../ui/SearchInput.jsx";
import { ordersApi } from "../../api/orders.js";
import { customersApi } from "../../api/customers.js";
import { productsApi } from "../../api/products.js";
import { useApi, useAction } from "../../hooks/useApi.js";
import { useDebounce } from "../../hooks/useDebounce.js";
import { useToast } from "../../context/ToastContext.jsx";
import { CUSTOMER_SOURCES, ORDER_STATUSES, toOptions } from "../../lib/options.js";
import { todayInputValue, toDateInputValue } from "../../lib/format.js";

// Chosen when the job is not in the catalogue — a one-off custom print.
const CUSTOM_PRODUCT = "__custom__";

// The minimum needed to add a customer; the rest can be filled in later from
// their profile.
const EMPTY_NEW_CUSTOMER = { fullName: "", phone: "", city: "", source: "INSTAGRAM" };

const emptyForm = () => ({
  customerId: "",
  productKey: "",
  productName: "",
  category: "",
  occasion: "",
  orderDate: todayInputValue(),
  quantity: 1,
  status: "PROCESSING",
  notes: "",
});

const toFormValues = (order) => {
  if (!order) return emptyForm();
  return {
    customerId: order.customerId,
    productKey: order.productId ?? CUSTOM_PRODUCT,
    productName: order.productName ?? "",
    category: order.category ?? "",
    occasion: order.occasion ?? "",
    orderDate: toDateInputValue(order.orderDate),
    quantity: order.quantity ?? 1,
    status: order.status ?? "PROCESSING",
    notes: order.notes ?? "",
  };
};

export const OrderFormModal = ({
  open,
  order,
  // When set, the order is for this customer and the picker is hidden.
  lockedCustomer,
  onClose,
  onSaved,
}) => {
  const isEditing = Boolean(order);
  const [values, setValues] = useState(emptyForm());
  const [customerSearch, setCustomerSearch] = useState("");
  const debouncedSearch = useDebounce(customerSearch, 300);
  // "existing" picks a customer from the list, "new" creates one with the order.
  const [customerMode, setCustomerMode] = useState("existing");
  const [newCustomer, setNewCustomer] = useState(EMPTY_NEW_CUSTOMER);
  const canAddCustomer = !lockedCustomer && !order;
  const isNewCustomer = canAddCustomer && customerMode === "new";

  const { run, saving, error, setError } = useAction();
  const toast = useToast();

  // The catalogue, for the product dropdown.
  const { data: products } = useApi(
    ({ signal }) => (open ? productsApi.active({ signal }) : Promise.resolve([])),
    [open],
  );

  // Matching customers for the picker. Nothing is fetched until something is
  // typed; useApi cancels the previous request, so a slow answer to an older
  // search can never replace the results of a newer one.
  const searchTerm = debouncedSearch.trim();
  const { data: customerMatches, loading: searchLoading } = useApi(
    ({ signal }) =>
      open && !lockedCustomer && searchTerm
        ? customersApi.search(searchTerm, { signal })
        : Promise.resolve([]),
    [open, lockedCustomer, searchTerm],
  );

  // The customer the order will be saved against. Kept as the whole record so the
  // form can show who was picked; values.customerId is what gets submitted.
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const selectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setValues((current) => ({ ...current, customerId: customer.customerId }));
  };

  const clearCustomer = () => {
    setSelectedCustomer(null);
    setValues((current) => ({ ...current, customerId: "" }));
    setCustomerSearch("");
  };

  useEffect(() => {
    if (!open) return;
    const initial = toFormValues(order);
    setValues({
      ...initial,
      customerId: lockedCustomer?.customerId ?? initial.customerId,
    });
    // An order being edited already has its customer (the orders list includes it).
    setSelectedCustomer(order?.customer ?? null);
    setCustomerSearch("");
    setCustomerMode("existing");
    setNewCustomer(EMPTY_NEW_CUSTOMER);
    setError(null);
  }, [open, order, lockedCustomer, setError]);

  const setField = (field) => (event) =>
    setValues((current) => ({ ...current, [field]: event.target.value }));

  const setNewCustomerField = (field) => (event) =>
    setNewCustomer((current) => ({ ...current, [field]: event.target.value }));

  // Picking a catalogue product fills in the name, category and occasion, so the
  // same hoodie is always recorded the same way. The fields stay editable for the
  // occasional exception.
  const onProductChange = (event) => {
    const productKey = event.target.value;
    const product = products?.find((item) => item.productId === productKey);

    setValues((current) => ({
      ...current,
      productKey,
      productName: product ? product.name : productKey === CUSTOM_PRODUCT ? current.productName : "",
      category: product ? product.category : current.category,
      occasion: product?.occasion ?? current.occasion,
    }));
  };

  const productOptions = useMemo(() => {
    const catalogue = (products ?? []).map((product) => ({
      value: product.productId,
      label: `${product.productId} — ${product.name} (${product.category})`,
    }));
    return [...catalogue, { value: CUSTOM_PRODUCT, label: "مخصص / غير موجود في الكتالوج" }];
  }, [products]);

  // What the results area shows. "Searching" also covers the debounce pause, so
  // the previous results never flash up as the answer to what was just typed.
  const typedSearch = customerSearch.trim();
  const searchState = !typedSearch
    ? "idle"
    : typedSearch !== searchTerm || searchLoading
      ? "searching"
      : customerMatches?.length
        ? "results"
        : "empty";

  const isCustom = values.productKey === CUSTOM_PRODUCT || values.productKey === "";

  const onSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      ...(isNewCustomer ? { newCustomer } : { customerId: values.customerId }),
      // An empty productId tells the API this is a custom job, and clears the
      // catalogue link when an existing order is switched to custom.
      productId: isCustom ? "" : values.productKey,
      productName: values.productName,
      category: values.category,
      occasion: values.occasion,
      orderDate: values.orderDate,
      quantity: Number(values.quantity),
      status: values.status,
      notes: values.notes,
    };

    try {
      const saved = await run(() =>
        isEditing ? ordersApi.update(order.orderId, payload) : ordersApi.create(payload),
      );

      toast.success(
        isEditing
          ? `تم تحديث الطلب ${saved.orderId}`
          : isNewCustomer
            ? `تمت إضافة العميل ${saved.customer.fullName} (${saved.customerId}) والطلب ${saved.orderId}`
            : `تمت إضافة الطلب ${saved.orderId}`,
      );
      onSaved?.(saved);
      onClose();
    } catch {
      // Shown in the form.
    }
  };

  return (
    <Modal
      open={open}
      title={isEditing ? `تعديل الطلب ${order.orderId}` : "إضافة طلب"}
      subtitle={
        lockedCustomer
          ? `للعميل ${lockedCustomer.fullName} (${lockedCustomer.customerId})`
          : "اختر عميلًا موجودًا، أو أضف عميلًا جديدًا مع الطلب"
      }
      onClose={saving ? undefined : onClose}
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>
            إلغاء
          </Button>
          <Button variant="primary" onClick={onSubmit} disabled={saving}>
            {saving ? "جارٍ الحفظ..." : isEditing ? "حفظ التغييرات" : "إضافة طلب"}
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit}>
        <FormGrid>
          {error ? (
            <div className="form-grid__full">
              <Alert tone="error">{error.message}</Alert>
            </div>
          ) : null}

          {lockedCustomer ? (
            <Field label="العميل" full>
              <div className="notes-box">
                <strong>{lockedCustomer.fullName}</strong>{" "}
                <span className="code">{lockedCustomer.customerId}</span>
                <div className="cell-sub">{lockedCustomer.phone}</div>
              </div>
            </Field>
          ) : isNewCustomer ? (
            <>
              <div className="form-grid__full row">
                <Button size="sm" onClick={() => setCustomerMode("existing")}>
                  عميل موجود
                </Button>
                <Button size="sm" variant="primary">
                  عميل جديد
                </Button>
              </div>

              <Field label="الاسم الكامل" htmlFor="newCustomerName">
                <TextInput
                  id="newCustomerName"
                  value={newCustomer.fullName}
                  onChange={setNewCustomerField("fullName")}
                  placeholder="سارة أحمد"
                  required
                  autoFocus
                />
              </Field>

              <Field label="الهاتف" htmlFor="newCustomerPhone">
                <TextInput
                  id="newCustomerPhone"
                  value={newCustomer.phone}
                  onChange={setNewCustomerField("phone")}
                  placeholder="0532 145 8890"
                  required
                />
              </Field>

              <Field label="المدينة" htmlFor="newCustomerCity">
                <TextInput
                  id="newCustomerCity"
                  value={newCustomer.city}
                  onChange={setNewCustomerField("city")}
                  placeholder="إسطنبول"
                  required
                />
              </Field>

              <Field label="كيف تعرّف علينا؟" htmlFor="newCustomerSource">
                <Select
                  id="newCustomerSource"
                  value={newCustomer.source}
                  onChange={setNewCustomerField("source")}
                  options={toOptions(CUSTOMER_SOURCES)}
                />
              </Field>
            </>
          ) : (
            <>
              {canAddCustomer ? (
                <div className="form-grid__full row">
                  <Button size="sm" variant="primary">
                    عميل موجود
                  </Button>
                  <Button size="sm" icon="plus" onClick={() => setCustomerMode("new")}>
                    عميل جديد
                  </Button>
                </div>
              ) : null}

              {selectedCustomer ? (
                <Field label="العميل" full>
                  <div className="notes-box row row--between">
                    <div>
                      <strong>{selectedCustomer.fullName}</strong>{" "}
                      <span className="code">{selectedCustomer.customerId}</span>
                      <div className="cell-sub">
                        {selectedCustomer.phone} · {selectedCustomer.city}
                      </div>
                    </div>
                    <Button size="sm" onClick={clearCustomer}>
                      تغيير العميل
                    </Button>
                  </div>
                </Field>
              ) : (
                <Field label="البحث عن عميل" full>
                  <SearchInput
                    value={customerSearch}
                    onChange={setCustomerSearch}
                    placeholder="ابحث بالاسم أو رقم العميل أو الهاتف..."
                    // The search box sits inside the order form; Enter here must
                    // not submit the order.
                    onKeyDown={(event) => {
                      if (event.key === "Enter") event.preventDefault();
                    }}
                    autoFocus
                  />

                  <div className="customer-results" role="listbox" aria-label="نتائج البحث">
                    {searchState === "idle" ? (
                      <p className="customer-results__note">ابدأ الكتابة للبحث عن العملاء</p>
                    ) : searchState === "searching" ? (
                      <p className="customer-results__note">جارٍ البحث...</p>
                    ) : searchState === "empty" ? (
                      <p className="customer-results__note">لا يوجد عملاء مطابقون</p>
                    ) : (
                      customerMatches.map((customer) => (
                        <button
                          type="button"
                          role="option"
                          aria-selected="false"
                          key={customer.customerId}
                          className="mini-list__row customer-results__row"
                          onClick={() => selectCustomer(customer)}
                        >
                          <span className="mini-list__main">
                            <span className="mini-list__title">{customer.fullName}</span>
                            <span className="mini-list__sub">
                              {customer.phone} · {customer.city}
                            </span>
                          </span>
                          <span className="code">{customer.customerId}</span>
                        </button>
                      ))
                    )}
                  </div>
                </Field>
              )}
            </>
          )}

          <Field label="المنتج" htmlFor="productKey" full>
            <Select
              id="productKey"
              value={values.productKey}
              onChange={onProductChange}
              options={productOptions}
              placeholder="اختر منتجًا"
              required
            />
          </Field>

          <Field
            label="اسم المنتج"
            htmlFor="productName"
            full={isCustom}
          >
            <TextInput
              id="productName"
              value={values.productName}
              onChange={setField("productName")}
              placeholder="هودي للأزواج"
              required
            />
          </Field>

          <Field label="الفئة" htmlFor="category">
            <TextInput
              id="category"
              value={values.category}
              onChange={setField("category")}
              placeholder="أزواج"
              required
            />
          </Field>

          <Field label="المناسبة" optional htmlFor="occasion">
            <TextInput
              id="occasion"
              value={values.occasion}
              onChange={setField("occasion")}
              placeholder="هدية"
            />
          </Field>

          <Field label="تاريخ الطلب" htmlFor="orderDate">
            <TextInput
              id="orderDate"
              type="date"
              value={values.orderDate}
              onChange={setField("orderDate")}
              required
            />
          </Field>

          <Field label="الكمية" htmlFor="quantity">
            <TextInput
              id="quantity"
              type="number"
              min="1"
              max="1000"
              value={values.quantity}
              onChange={setField("quantity")}
              required
            />
          </Field>

          <Field label="الحالة" htmlFor="status">
            <Select
              id="status"
              value={values.status}
              onChange={setField("status")}
              options={toOptions(ORDER_STATUSES)}
            />
          </Field>

          <Field label="ملاحظات" optional htmlFor="orderNotes" full>
            <TextArea
              id="orderNotes"
              value={values.notes}
              onChange={setField("notes")}
              placeholder="هودي أسود، مع نص مخصص على الظهر."
            />
          </Field>
        </FormGrid>
      </form>
    </Modal>
  );
};

export default OrderFormModal;
