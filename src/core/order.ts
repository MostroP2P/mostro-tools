import type { Order } from '../types/core/order.ts';
import { finalizeEvent } from 'nostr-tools';
import { OrderStatus, OrderType } from '../types/core/order.ts';
import { createGiftWrapEvent, GiftWrapContent } from '../utils/nostr.ts';

/**
 * Validates and ensures that the required fields for an order are valid.
 * @param order The partial order object to validate.
 */
function validateOrder(order: Partial<Order>) {
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
 * Create a new NIP-59 wrapped order event for Mostro.
 * @param order The partial order details (fields required to initialize the order).
 * @param senderPrivateKey The private key of the creator.
 * @param recipientPublicKey The public key of the recipient (e.g., Mostro's pubkey).
 * @returns The wrapped Nostr event using NIP-59.
 */
export function createOrder(order: Partial<Order>, senderPrivateKey: Uint8Array, recipientPublicKey: string) {
  // Validate the order details
  validateOrder(order);

  // Ensure required fields for an order are present
  const newOrder: Partial<Order> = {
    kind: order.kind || OrderType.BUY,
    status: OrderStatus.PENDING,
    fiat_code: order.fiat_code || 'USD',
    amount: order.amount || 0,
    payment_method: order.payment_method || 'unknown',
    created_at: order.created_at ?? Math.floor(Date.now() / 1000), // Ensure created_at is always a number
    ...order,
  };

  // Create a plain Nostr event
  const eventTemplate = {
    kind: 38383, // Mostro-specific Nostr kind
    created_at: newOrder.created_at as number, // Explicitly ensure it's a number
    tags: [
      ['fiat_code', newOrder.fiat_code || ''],
      ['kind', newOrder.kind || ''],
      ['payment_method', newOrder.payment_method || ''],
    ].filter((tag) => tag.every((value) => value !== undefined)), // Remove undefined values
    content: JSON.stringify(newOrder),
  };

  // Finalize the plain event
  const plainEvent = finalizeEvent(eventTemplate, senderPrivateKey);

  // Wrap the event using NIP-59
  return createGiftWrapEvent(
    JSON.parse(JSON.stringify(plainEvent)) as GiftWrapContent,
    senderPrivateKey,
    recipientPublicKey,
  );
}
