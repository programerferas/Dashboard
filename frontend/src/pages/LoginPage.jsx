// Sign-in page. There is no sign-up: this is an internal tool, and accounts are
// created by an admin from Settings (or by the seed script).
import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Alert, Button, Field, TextInput } from "../components/ui/Primitives.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";

const LoginPage = () => {
  const { user, login, checking } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useDocumentTitle("تسجيل الدخول");

  // Already signed in: go where they were headed, or to the dashboard.
  if (!checking && user) {
    return <Navigate to={location.state?.from ?? "/"} replace />;
  }

  const onSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login({ email, password });
      navigate(location.state?.from ?? "/", { replace: true });
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-card__brand">
          <span className="sidebar__logo" style={{ width: 36, height: 36, fontSize: 15 }}>
            PS
          </span>
          <div>
            <div className="login-card__title">Print Style</div>
            <div className="login-card__subtitle">نظام داخلي لإدارة العملاء</div>
          </div>
        </div>

        <form className="login-form" onSubmit={onSubmit}>
          {error ? <Alert tone="error">{error}</Alert> : null}

          <Field label="البريد الإلكتروني" htmlFor="email">
            <TextInput
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="example@gmail.com"
              dir="rtl"
              autoComplete="username"
              required
              autoFocus
            />
          </Field>

          <Field label="كلمة المرور" htmlFor="password">
            <TextInput
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              dir="rtl"
              autoComplete="current-password"
              required
            />
          </Field>

          <Button type="submit" variant="primary" block disabled={submitting}>
            {submitting ? "جارٍ تسجيل الدخول..." : "تسجيل الدخول"}
          </Button>
        </form>

        
      </div>
    </div>
  );
};

export default LoginPage;
