import { api } from "./client.js";

export const authApi = {
  login: (credentials) => api.post("/auth/login", credentials),
  logout: () => api.post("/auth/logout"),
  me: (options) => api.get("/auth/me", options),
  listUsers: () => api.get("/auth/users"),
  createUser: (data) => api.post("/auth/users", data),
  deleteUser: (id) => api.delete(`/auth/users/${id}`),
};
