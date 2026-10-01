import { asyncHandler } from "../../utils/asyncHandler.js";
import * as productService from "./product.service.js";

export const listProducts = asyncHandler(async (req, res) => {
  const result = await productService.listProducts(req.query);
  res.json(result);
});

export const listActiveProducts = asyncHandler(async (req, res) => {
  const products = await productService.listActiveProducts();
  res.json(products);
});

export const getPerformance = asyncHandler(async (req, res) => {
  const performance = await productService.getProductPerformance();
  res.json(performance);
});

export const getProduct = asyncHandler(async (req, res) => {
  const product = await productService.getProduct(req.params.productId);
  res.json(product);
});

export const createProduct = asyncHandler(async (req, res) => {
  const product = await productService.createProduct(req.body);
  res.status(201).json(product);
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await productService.updateProduct(req.params.productId, req.body);
  res.json(product);
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const result = await productService.deleteProduct(req.params.productId);
  res.json(result);
});
