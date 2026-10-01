import { Router } from "express";
import { getOverview } from "./dashboard.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";

const router = Router();

router.use(requireAuth);
router.get("/overview", getOverview);

export default router;
