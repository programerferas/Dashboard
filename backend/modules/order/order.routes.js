import { Router } from "express";
import * as controller from "./order.controller.js";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  createOrderSchema,
  orderListQuerySchema,
  updateOrderSchema,
} from "../../schemas/order.schema.js";

const router = Router();

router.use(requireAuth);

router.get("/filters/options", controller.getFilterOptions);

router.get("/", validate(orderListQuerySchema, "query"), controller.listOrders);
router.post("/", validate(createOrderSchema), controller.createOrder);

router.get("/:orderId", controller.getOrder);
router.patch("/:orderId", validate(updateOrderSchema), controller.updateOrder);
router.post("/:orderId/whatsapp", controller.resendWhatsapp);

// Removing history is admin-only; employees change the status instead.
router.delete("/:orderId", requireRole("ADMIN"), controller.deleteOrder);

export default router;
