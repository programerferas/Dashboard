import { Router } from "express";
import * as controller from "./auth.controller.js";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { createUserSchema, loginSchema } from "../../schemas/auth.schema.js";

const router = Router();

router.post("/login", validate(loginSchema), controller.login);
router.post("/logout", controller.logout);
router.get("/me", requireAuth, controller.me);

// Staff management is the one thing only an admin can do. There is no public
// sign-up: this is an internal tool, accounts are handed out.
router.get("/users", requireAuth, requireRole("ADMIN"), controller.listUsers);
router.post(
  "/users",
  requireAuth,
  requireRole("ADMIN"),
  validate(createUserSchema),
  controller.createUser,
);

export default router;
