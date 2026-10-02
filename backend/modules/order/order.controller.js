import { asyncHandler } from "../../utils/asyncHandler.js";
import * as orderService from "./order.service.js";

export const listOrders = asyncHandler(async (req, res) => {
  const result = await orderService.listOrders(req.query);
  res.json(result);
});

export const getOrder = asyncHandler(async (req, res) => {
  const order = await orderService.getOrder(req.params.orderId);
  res.json(order);
});

export const createOrder = asyncHandler(async (req, res) => {
  const order = await orderService.createOrder(req.body);
  res.status(201).json(order);
});

export const updateOrder = asyncHandler(async (req, res) => {
  const order = await orderService.updateOrder(req.params.orderId, req.body);
  res.json(order);
});

export const resendWhatsapp = asyncHandler(async (req, res) => {
  const order = await orderService.resendOrderWhatsapp(req.params.orderId);
  res.json(order);
});

export const deleteOrder = asyncHandler(async (req, res) => {
  const result = await orderService.deleteOrder(req.params.orderId);
  res.json(result);
});

export const getFilterOptions = asyncHandler(async (req, res) => {
  const options = await orderService.getOrderFilterOptions();
  res.json(options);
});
