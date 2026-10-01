import { Router } from "express";
import * as controller from "./customer.controller.js";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  createCustomerSchema,
  customerListQuerySchema,
  updateCustomerSchema,
} from "../../schemas/customer.schema.js";

const router = Router();

// Every customer route requires a signed-in member of staff.
router.use(requireAuth);

// Static paths are declared before "/:customerId" so they are not read as an ID.
router.get("/filters/options", controller.getFilterOptions);
router.get("/search", controller.searchCustomers);

router.get("/", validate(customerListQuerySchema, "query"), controller.listCustomers);
router.post("/", validate(createCustomerSchema), controller.createCustomer);

router.get("/:customerId", controller.getCustomer);
router.patch("/:customerId", validate(updateCustomerSchema), controller.updateCustomer);

// Deleting a customer takes their order history with it, so it is admin-only.
router.delete("/:customerId", requireRole("ADMIN"), controller.deleteCustomer);

export default router;
