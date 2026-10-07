import { asyncHandler } from "../../utils/asyncHandler.js";
import { env } from "../../config/env.js";
import * as authService from "./auth.service.js";

export const login = asyncHandler(async (req, res) => {
  const { user, token } = await authService.login(req.body);

  res.cookie(env.COOKIE_NAME, token, authService.cookieOptions());
  res.json({ user });
});

export const logout = asyncHandler(async (req, res) => {
  // Same flags as when it was set, otherwise the browser keeps the old cookie.
  res.clearCookie(env.COOKIE_NAME, { ...authService.cookieOptions(), maxAge: undefined });
  res.json({ message: "تم تسجيل الخروج" });
});

// The frontend calls this on load to find out who is signed in.
export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

export const updateMe = asyncHandler(async (req, res) => {
  const user = await authService.updateAccount(req.user.id, req.body);
  res.json({ user });
});

export const createUser = asyncHandler(async (req, res) => {
  const user = await authService.createUser(req.body);
  res.status(201).json(user);
});

export const deleteUser = asyncHandler(async (req, res) => {
  const user = await authService.deleteUser(Number(req.params.id), req.user.id);
  res.json(user);
});

export const listUsers = asyncHandler(async (req, res) => {
  const users = await authService.listUsers();
  res.json(users);
});
