// Shown right after an order is created: the message preview, and one click to
// open WhatsApp with it ready to send to the group. A click is required because
// browsers block windows opened without one.
import Modal from "../ui/Modal.jsx";
import { Button } from "../ui/Primitives.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { buildOrderMessage, openWhatsappShare } from "../../lib/whatsapp.js";

export const WhatsappShareModal = ({ order, onClose }) => {
  const toast = useToast();
  if (!order) return null;

  const message = buildOrderMessage(order);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      toast.success("تم نسخ الرسالة");
    } catch {
      toast.error("تعذّر النسخ، انسخ النص يدويًا");
    }
  };

  return (
    <Modal
      open
      size="sm"
      title={`تم حفظ الطلب ${order.orderId}`}
      subtitle="أرسل تفاصيل الطلب إلى مجموعة واتساب"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>إغلاق</Button>
          <Button onClick={copy}>نسخ النص</Button>
          <Button variant="primary" onClick={() => openWhatsappShare(order)}>
            إرسال عبر واتساب
          </Button>
        </>
      }
    >
      <div className="notes-box">{message}</div>
    </Modal>
  );
};

export default WhatsappShareModal;
