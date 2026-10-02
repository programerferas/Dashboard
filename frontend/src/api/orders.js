import { api, buildQuery } from "./client.js";

export const ordersApi = {
  list: (params, options) => api.get(`/orders${buildQuery(params)}`, options),
  filterOptions: (options) => api.get("/orders/filters/options", options),
  create: (data) => api.post("/orders", data),
  update: (orderId, data) => api.patch(`/orders/${orderId}`, data),
  remove: (orderId) => api.delete(`/orders/${orderId}`),
  resendWhatsapp: (orderId) => api.post(`/orders/${orderId}/whatsapp`),
};
