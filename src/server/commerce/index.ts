import {
  getBrands,
  getCategories,
  getProductBySlug,
  getProducts,
  getProductsByIds,
} from "./catalog";
import { addCartItem, createCart, getCartByToken, removeCartItem, updateCartItem } from "./cart";
import { createOrder, getOrderByNumber, getOrdersByPhone, resolveCheckoutLines } from "./orders";
import { confirmQpayPayment, createQpayInvoiceForOrder, getPaymentByNumber } from "./payments";
import { getOrder, listOrders, updateOrderStatus } from "./admin-orders";

/**
 * Facade over the commerce modules (catalog / cart / orders / payments /
 * admin-orders). Preserves the `commerceQueries.{store,payments,orders,admin}`
 * shape the route modules and Eden Treaty inference were built against, while
 * the implementations live as plain exported functions in focused files.
 */
export const commerceQueries = {
  store: {
    getProducts,
    getProductsByIds,
    getCategories,
    getBrands,
    getProductBySlug,
    createCart,
    getCartByToken,
    addCartItem,
    updateCartItem,
    removeCartItem,
    resolveCheckoutLines,
    createOrder,
  },
  payments: {
    getPaymentByNumber,
    confirmQpayPayment,
    createQpayInvoiceForOrder,
  },
  orders: {
    getOrdersByPhone,
    getOrderByNumber,
  },
  admin: {
    listOrders,
    getOrder,
    updateOrderStatus,
  },
} as const;
