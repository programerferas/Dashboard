import { asyncHandler } from "../../utils/asyncHandler.js";
import { getDashboardOverview } from "./dashboard.service.js";

export const getOverview = asyncHandler(async (req, res) => {
  const overview = await getDashboardOverview();
  res.json(overview);
});
