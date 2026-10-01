// Settings: your own account, and (for an admin) the staff accounts.
//
// Deliberately minimal. There are two roles and no permission editor: an admin can
// do everything, an employee can do the day-to-day work but cannot delete records
// or create accounts.
import { useState } from "react";
import DataTable from "../components/ui/DataTable.jsx";
import Modal from "../components/ui/Modal.jsx";
import {
  Alert,
  Badge,
  Button,
  Card,
  Field,
  FormGrid,
  PageHead,
  Select,
  TextInput,
} from "../components/ui/Primitives.jsx";
import { authApi } from "../api/auth.js";
import { useApi, useAction } from "../hooks/useApi.js";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { formatDate, humanise } from "../lib/format.js";
import { ROLES, toOptions } from "../lib/options.js";

const EMPTY_USER = { name: "", email: "", password: "", role: "EMPLOYEE" };

const AddUserModal = ({ open, onClose, onSaved }) => {
  const [values, setValues] = useState(EMPTY_USER);
  const { run, saving, error, setError } = useAction();
  const toast = useToast();

  const setField = (field) => (event) =>
    setValues((current) => ({ ...current, [field]: event.target.value }));

  const onSubmit = async (event) => {
    event.preventDefault();
    try {
      const saved = await run(() => authApi.createUser(values));
      toast.success(`يمكن لـ ${saved.name} تسجيل الدخول الآن`);
      setValues(EMPTY_USER);
      setError(null);
      onSaved?.();
      onClose();
    } catch {
      // Shown in the form.
    }
  };

  return (
    <Modal
      open={open}
      title="إضافة حساب موظف"
      subtitle="سيسجّل الدخول بهذا البريد الإلكتروني وكلمة المرور."
      onClose={saving ? undefined : onClose}
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>
            إلغاء
          </Button>
          <Button variant="primary" onClick={onSubmit} disabled={saving}>
            {saving ? "جارٍ الإنشاء..." : "إنشاء الحساب"}
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

          <Field label="الاسم الكامل" htmlFor="userName" full>
            <TextInput
              id="userName"
              value={values.name}
              onChange={setField("name")}
              required
              autoFocus
            />
          </Field>

          <Field label="البريد الإلكتروني" htmlFor="userEmail">
            <TextInput
              id="userEmail"
              type="email"
              value={values.email}
              onChange={setField("email")}
              required
            />
          </Field>

          <Field label="الدور" htmlFor="userRole">
            <Select
              id="userRole"
              value={values.role}
              onChange={setField("role")}
              options={toOptions(ROLES)}
            />
          </Field>

          <Field label="كلمة المرور" htmlFor="userPassword" full>
            <TextInput
              id="userPassword"
              type="password"
              value={values.password}
              onChange={setField("password")}
              minLength={8}
              placeholder="8 أحرف على الأقل"
              required
            />
          </Field>
        </FormGrid>
      </form>
    </Modal>
  );
};

const SettingsPage = () => {
  const { user, isAdmin } = useAuth();
  const [addOpen, setAddOpen] = useState(false);

  useDocumentTitle("الإعدادات");

  // Only an admin may list accounts, so employees never make this request.
  const { data: users, loading, error, reload } = useApi(
    ({ signal }) => (isAdmin ? authApi.listUsers({ signal }) : Promise.resolve([])),
    [isAdmin],
  );

  const columns = [
    {
      key: "name",
      label: "الاسم",
      render: (row) => (
        <>
          <span className="cell-title">{row.name}</span>
          {row.id === user.id ? <span className="cell-sub"> (أنت)</span> : null}
        </>
      ),
    },
    { key: "email", label: "البريد الإلكتروني", render: (row) => row.email },
    {
      key: "role",
      label: "الدور",
      render: (row) => (
        <Badge tone={row.role === "ADMIN" ? "violet" : "blue"}>{humanise(row.role)}</Badge>
      ),
    },
    {
      key: "active",
      label: "الحالة",
      render: (row) => (
        <Badge tone={row.active ? "green" : "slate"}>{row.active ? "نشط" : "معطّل"}</Badge>
      ),
    },
    { key: "createdAt", label: "تاريخ الإضافة", render: (row) => formatDate(row.createdAt) },
  ];

  return (
    <>
      <PageHead title="الإعدادات" subtitle="حسابك، وللمديرين: صلاحيات الموظفين." />

      <div className="dash-grid">
        <Card title="حسابك">
          <dl className="details">
            <div>
              <dt className="details__label">الاسم</dt>
              <dd className="details__value">{user.name}</dd>
            </div>
            <div>
              <dt className="details__label">البريد الإلكتروني</dt>
              <dd className="details__value">{user.email}</dd>
            </div>
            <div>
              <dt className="details__label">الدور</dt>
              <dd className="details__value">
                <Badge tone={isAdmin ? "violet" : "blue"}>{humanise(user.role)}</Badge>
              </dd>
            </div>
          </dl>

          <p className="cell-sub" style={{ marginTop: 14 }}>
            {isAdmin
              ? "بصفتك مديرًا يمكنك إضافة العملاء والطلبات والمنتجات وتعديلها وحذفها، وإنشاء حسابات الموظفين."
              : "بصفتك موظفًا يمكنك إضافة العملاء والطلبات والمنتجات وتعديلها. الحذف مقتصر على المديرين."}
          </p>
        </Card>

        <Card title="حول التطبيق">
          <dl className="details">
            <div>
              <dt className="details__label">الغرض</dt>
              <dd className="details__value">
                العثور على أي عميل ومعرفة من هو وماذا اشترى فورًا.
              </dd>
            </div>
            <div>
              <dt className="details__label">مصدر البيانات</dt>
              <dd className="details__value">
                قاعدة بيانات PostgreSQL خاصة بالتطبيق — المصدر الوحيد للبيانات.
              </dd>
            </div>
            <div>
              <dt className="details__label">حالة العميل</dt>
              <dd className="details__value">
                تُحسب من عدد الطلبات: طلب واحد يعني عميلًا جديدًا، وأكثر من طلب يعني عميلًا متكررًا.
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      {isAdmin ? (
        <Card
          title="حسابات الموظفين"
          subtitle="الأشخاص الذين يمكنهم تسجيل الدخول إلى هذه الأداة"
          actions={
            <Button size="sm" variant="primary" icon="plus" onClick={() => setAddOpen(true)}>
              إضافة حساب
            </Button>
          }
          flush
          className="card--spaced"
        >
          <DataTable
            columns={columns}
            rows={users}
            loading={loading}
            firstLoad={!users}
            error={error}
            onRetry={reload}
            getRowKey={(row) => row.id}
          />
        </Card>
      ) : null}

      <AddUserModal open={addOpen} onClose={() => setAddOpen(false)} onSaved={reload} />
    </>
  );
};

export default SettingsPage;
