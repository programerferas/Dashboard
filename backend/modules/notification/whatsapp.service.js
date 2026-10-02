// Sends the admin a WhatsApp message through Meta's Cloud API. This is the only
// file that talks to Meta, so swapping provider or format means changing it alone.
//
// It never throws: callers get { status, error } and decide what to store. A
// WhatsApp outage must not stop an order from being saved.
import { env } from "../../config/env.js";

const TIMEOUT_MS = 10_000;

const dash = (value) => {
  const text = value === null || value === undefined ? "" : String(value);
  // Template parameters may not contain line breaks, tabs or long runs of spaces,
  // and may not be empty.
  const clean = text.replace(/[\r\n\t]+/g, " ").replace(/ {2,}/g, " ").trim();
  return clean || "-";
};

const formatDate = (date) => new Date(date).toISOString().slice(0, 10);

// The values in the order the message (and the approved template's {{1}}..{{10}})
// expects them.
const orderFields = (order) => [
  dash(order.orderId),
  dash(order.customer?.fullName),
  dash(order.customerId),
  dash(order.customer?.phone),
  dash(order.productName),
  dash(order.quantity),
  dash(order.category),
  dash(order.occasion),
  dash(formatDate(order.orderDate)),
  dash(order.notes),
];

// Readable text rather than JSON: the admin forwards it to a group as-is.
export const buildOrderMessage = (order) => {
  const [orderId, name, customerId, phone, product, quantity, category, occasion, date, notes] =
    orderFields(order);

  return [
    `🧾 طلب جديد ${orderId}`,
    `العميل: ${name} (${customerId})`,
    `الهاتف: ${phone}`,
    `المنتج: ${product} × ${quantity}`,
    `الفئة: ${category}`,
    `المناسبة: ${occasion}`,
    `تاريخ الطلب: ${date}`,
    `ملاحظات: ${notes}`,
  ].join("\n");
};

const buildPayload = (order) => {
  const base = {
    messaging_product: "whatsapp",
    to: env.WHATSAPP_RECIPIENT.replace(/\D/g, ""),
  };

  if (env.WHATSAPP_TEMPLATE_NAME) {
    return {
      ...base,
      type: "template",
      template: {
        name: env.WHATSAPP_TEMPLATE_NAME,
        language: { code: env.WHATSAPP_TEMPLATE_LANG },
        components: [
          {
            type: "body",
            parameters: orderFields(order).map((text) => ({ type: "text", text })),
          },
        ],
      },
    };
  }

  return { ...base, type: "text", text: { body: buildOrderMessage(order) } };
};

/**
 * @returns {Promise<{ status: "SENT" | "FAILED" | "SKIPPED", error: string | null }>}
 */
export const sendOrderNotification = async (order) => {
  if (!env.WHATSAPP_ENABLED) return { status: "SKIPPED", error: null };

  const url = `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildPayload(order)),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (response.ok) return { status: "SENT", error: null };

    const payload = await response.json().catch(() => null);
    const error = payload?.error?.message ?? `HTTP ${response.status}`;
    console.error(`WhatsApp send failed for ${order.orderId}:`, payload?.error ?? response.status);
    return { status: "FAILED", error: error.slice(0, 500) };
  } catch (error) {
    console.error(`WhatsApp send failed for ${order.orderId}:`, error.message);
    return { status: "FAILED", error: String(error.message).slice(0, 500) };
  }
};
