import type { Order } from '../types/core/order';
import { finalizeEvent } from 'nostr-tools';
import { OrderStatus, OrderType } from '../types/core/order';
import { createGiftWrapEvent, GiftWrapContent } from '../utils/nostr';
import { validateOrder, isValidOrderType } from '../utils/validation';

/**
 * Create a new NIP-59 wrapped order event for Mostro.
 * @param order The partial order details (fields required to initialize the order).
 * @param senderPrivateKey The private key of the creator.
 * @param recipientPublicKey The public key of the recipient (e.g., Mostro's pubkey).
 * @returns The wrapped Nostr event using NIP-59.
 */
export function createOrder(
  order: Partial<Order>,
  senderPrivateKey: Uint8Array,
  recipientPublicKey: string
) {
  // Validate the order details
  validateOrder(order);

  if (!isValidOrderType(order.kind || OrderType.BUY)) {
    throw new Error('Invalid order type.');
  }

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
    recipientPublicKey
  );
}

/**
 * Parse a Nostr event into an Order object.
 * @param event The Nostr event to parse.
 * @returns The parsed Order object or null if parsing fails.
 */
export function parseOrder(event: Event): Order | null {
  try {
    const content = JSON.parse(event.content);
    return {
      ...content,
      id: event.id,
      created_at: event.created_at,
      event_id: event.id,
    } as Order;
  } catch (error) {
    console.error('Failed to parse order:', error);
    return null;
  }
}
