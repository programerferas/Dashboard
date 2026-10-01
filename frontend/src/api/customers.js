import { api, buildQuery } from "./client.js";

export const customersApi = {
  list: (params, options) => api.get(`/customers${buildQuery(params)}`, options),
  // Returns { customer, orders, stats } — the whole Customer 360 view.
  profile: (customerId, options) => api.get(`/customers/${customerId}`, options),
  filterOptions: (options) => api.get("/customers/filters/options", options),
  search: (search, options) => api.get(`/customers/search${buildQuery({ search })}`, options),
  create: (data) => api.post("/customers", data),
  update: (customerId, data) => api.patch(`/customers/${customerId}`, data),
  remove: (customerId) => api.delete(`/customers/${customerId}`),
};
