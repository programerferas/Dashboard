// Add / edit a catalogue product. Small on purpose: a product is a name, a
// category, an occasion and whether we still offer it.
import { useEffect, useState } from "react";
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
import { productsApi } from "../../api/products.js";
import { useAction } from "../../hooks/useApi.js";
import { useToast } from "../../context/ToastContext.jsx";

const EMPTY_FORM = {
  name: "",
  category: "",
  occasion: "",
  active: "true",
  notes: "",
};

const toFormValues = (product) => {
  if (!product) return EMPTY_FORM;
  return {
    name: product.name ?? "",
    category: product.category ?? "",
    occasion: product.occasion ?? "",
    // The select works with strings; it is converted back on submit.
    active: product.active ? "true" : "false",
    notes: product.notes ?? "",
  };
};

export const ProductFormModal = ({ open, product, onClose, onSaved }) => {
  const isEditing = Boolean(product);
  const [values, setValues] = useState(EMPTY_FORM);
  const { run, saving, error, setError } = useAction();
  const toast = useToast();

  useEffect(() => {
    if (open) {
      setValues(toFormValues(product));
      setError(null);
    }
  }, [open, product, setError]);

  const setField = (field) => (event) =>
    setValues((current) => ({ ...current, [field]: event.target.value }));

  const onSubmit = async (event) => {
    event.preventDefault();

    const payload = { ...values, active: values.active === "true" };

    try {
      const saved = await run(() =>
        isEditing ? productsApi.update(product.productId, payload) : productsApi.create(payload),
      );

      toast.success(isEditing ? `تم تحديث ${saved.name}` : `تمت إضافة ${saved.name} برقم ${saved.productId}`);
      onSaved?.(saved);
      onClose();
    } catch {
      // Shown in the form.
    }
  };

  return (
    <Modal
      open={open}
      title={isEditing ? `تعديل ${product.name}` : "إضافة منتج"}
      subtitle={
        isEditing
          ? `رقم المنتج ${product.productId}`
          : "يُنشأ رقم المنتج تلقائيًا (P001، P002، ...)"
      }
      onClose={saving ? undefined : onClose}
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>
            إلغاء
          </Button>
          <Button variant="primary" onClick={onSubmit} disabled={saving}>
            {saving ? "جارٍ الحفظ..." : isEditing ? "حفظ التغييرات" : "إضافة منتج"}
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

          <Field label="اسم المنتج" htmlFor="name" full>
            <TextInput
              id="name"
              value={values.name}
              onChange={setField("name")}
              placeholder="هودي للأزواج"
              required
              autoFocus
            />
          </Field>

          <Field label="الفئة" htmlFor="productCategory">
            <TextInput
              id="productCategory"
              value={values.category}
              onChange={setField("category")}
              placeholder="أزواج"
              required
            />
          </Field>

          <Field label="المناسبة" optional htmlFor="productOccasion">
            <TextInput
              id="productOccasion"
              value={values.occasion}
              onChange={setField("occasion")}
              placeholder="عيد الحب"
            />
          </Field>

          <Field label="الحالة" htmlFor="active">
            <Select
              id="active"
              value={values.active}
              onChange={setField("active")}
              options={[
                { value: "true", label: "نشط — معروض للعملاء" },
                { value: "false", label: "غير نشط — مخفي من الطلبات الجديدة" },
              ]}
            />
          </Field>

          <Field label="ملاحظات" optional htmlFor="productNotes" full>
            <TextArea
              id="productNotes"
              value={values.notes}
              onChange={setField("notes")}
              placeholder="المقاسات، منطقة الطباعة، المورّد..."
            />
          </Field>
        </FormGrid>
      </form>
    </Modal>
  );
};

export default ProductFormModal;
