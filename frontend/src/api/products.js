import { api, buildQuery } from "./client.js";

export const productsApi = {
  list: (params, options) => api.get(`/products${buildQuery(params)}`, options),
  active: (options) => api.get("/products/active", options),
  performance: (options) => api.get("/products/performance", options),
  create: (data) => api.post("/products", data),
  update: (productId, data) => api.patch(`/products/${productId}`, data),
  remove: (productId) => api.delete(`/products/${productId}`),
};
