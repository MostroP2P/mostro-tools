import type { Order } from '../types/core/order';
import { OrderType, OrderStatus } from '../types/core/order';

/**
 * Validates if a value is a valid public key (hexadecimal string of length 64).
 * @param pubkey The public key to validate.
 */
export function isValidPubKey(pubkey: string): boolean {
  return /^[0-9a-f]{64}$/i.test(pubkey);
}

/**
 * Validates if a value is a valid private key (Uint8Array of length 32).
 * @param privateKey The private key to validate.
 */
export function isValidPrivateKey(privateKey: Uint8Array): boolean {
  return privateKey.length === 32;
}

/**
 * Validates the required fields of an order object.
 * @param order The order object to validate.
 */
export function validateOrder(order: Partial<Order>): void {
  if (!order.amount || order.amount <= 0) {
    throw new Error('Order amount must be greater than zero.');
  }

  if (!order.fiat_code || typeof order.fiat_code !== 'string') {
    throw new Error('Order must have a valid fiat_code.');
  }

  if (!order.payment_method || typeof order.payment_method !== 'string') {
    throw new Error('Order must have a valid payment_method.');
  }

  if (order.premium && (order.premium < 0 || order.premium > 100)) {
    throw new Error('Order premium must be between 0 and 100.');
  }
}

/**
 * Validates if an order type is valid.
 * @param kind The kind of order.
 */
export function isValidOrderType(kind: OrderType): boolean {
  return Object.values(OrderType).includes(kind);
}

/**
 * Validates if an order status is valid.
 * @param status The status of the order.
 */
export function isValidOrderStatus(status: OrderStatus): boolean {
  return Object.values(OrderStatus).includes(status);
}
