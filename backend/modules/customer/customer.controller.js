import { asyncHandler } from "../../utils/asyncHandler.js";
import * as customerService from "./customer.service.js";

export const listCustomers = asyncHandler(async (req, res) => {
  const result = await customerService.listCustomers(req.query);
  res.json(result);
});

export const getCustomer = asyncHandler(async (req, res) => {
  const profile = await customerService.getCustomerProfile(req.params.customerId);
  res.json(profile);
});

export const createCustomer = asyncHandler(async (req, res) => {
  const customer = await customerService.createCustomer(req.body);
  res.status(201).json(customer);
});

export const updateCustomer = asyncHandler(async (req, res) => {
  const customer = await customerService.updateCustomer(req.params.customerId, req.body);
  res.json(customer);
});

export const deleteCustomer = asyncHandler(async (req, res) => {
  const result = await customerService.deleteCustomer(req.params.customerId);
  res.json(result);
});

export const getFilterOptions = asyncHandler(async (req, res) => {
  const options = await customerService.getCustomerFilterOptions();
  res.json(options);
});

export const searchCustomers = asyncHandler(async (req, res) => {
  const customers = await customerService.searchCustomersForPicker(req.query.search);
  res.json(customers);
});
