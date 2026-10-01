import { Router } from "express";
import * as controller from "./product.controller.js";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  createProductSchema,
  productListQuerySchema,
  updateProductSchema,
} from "../../schemas/product.schema.js";

const router = Router();

router.use(requireAuth);

router.get("/active", controller.listActiveProducts);
router.get("/performance", controller.getPerformance);

router.get("/", validate(productListQuerySchema, "query"), controller.listProducts);
router.post("/", validate(createProductSchema), controller.createProduct);

router.get("/:productId", controller.getProduct);
router.patch("/:productId", validate(updateProductSchema), controller.updateProduct);
router.delete("/:productId", requireRole("ADMIN"), controller.deleteProduct);

export default router;
