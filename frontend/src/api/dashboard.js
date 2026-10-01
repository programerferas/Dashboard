import { api } from "./client.js";

export const dashboardApi = {
  overview: (options) => api.get("/dashboard/overview", options),
};
