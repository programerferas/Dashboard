import { useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Primitives.jsx";
import { EmptyState } from "../components/ui/States.jsx";
import { Button } from "../components/ui/Primitives.jsx";

// Shown for an address that does not exist, e.g. a mistyped customer URL.
const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <Card>
      <EmptyState
        icon="search"
        title="الصفحة غير موجودة"
        text="هذا العنوان غير موجود في التطبيق."
        action={
          <Button variant="primary" icon="dashboard" onClick={() => navigate("/")}>
            العودة إلى لوحة التحكم
          </Button>
        }
      />
    </Card>
  );
};

export default NotFoundPage;
