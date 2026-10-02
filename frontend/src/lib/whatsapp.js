// The order message the admin sends to the WhatsApp group. Built in the browser
// and handed to WhatsApp through a share link, so no WhatsApp API is involved.
import { formatDate, humanise } from "./format.js";

const line = (label, value) => (value ? `${label}: ${value}` : null);

// Readable text rather than JSON: it is read by people in a group chat.
export const buildOrderMessage = (order) =>
  [
    `🧾 طلب جديد ${order.orderId}`,
    line("العميل", `${order.customer?.fullName ?? ""} (${order.customerId})`),
    line("الهاتف", order.customer?.phone),
    line("المدينة", order.customer?.city),
    line("المنتج", `${order.productName} × ${order.quantity}`),
    line("الفئة", order.category),
    line("المناسبة", order.occasion),
    line("تاريخ الطلب", formatDate(order.orderDate)),
    line("الحالة", humanise(order.status)),
    order.notes ? `ملاحظات:\n${order.notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");

// wa.me without a number opens WhatsApp (app on phones, Web/Desktop on
// computers) with the text ready, and lets the admin pick the group.
export const whatsappShareUrl = (text) => `https://wa.me/?text=${encodeURIComponent(text)}`;

export const openWhatsappShare = (order) =>
  window.open(whatsappShareUrl(buildOrderMessage(order)), "_blank", "noopener");
