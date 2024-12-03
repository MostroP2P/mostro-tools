import type { Order } from '../types/core/order';
import { createOrder, parseOrder } from '../core/order';
import { publishEvent } from '../utils/nostr';
import { SimplePool } from 'nostr-tools';
import { validateOrder, isValidPrivateKey, isValidPubKey } from '../utils/validation';

const pool = new SimplePool();

/**
 * Create and publish a new order.
 * @param order The partial order details.
 * @param privateKey The private key of the creator.
 * @param recipientPublicKey The public key of the recipient (e.g., Mostro's pubkey).
 * @param relayUrl The relay URL to publish the event to.
 * @returns The published order event.
 */
export async function newOrder(
  order: Partial<Order>,
  privateKey: Uint8Array,
  recipientPublicKey: string,
  relayUrl: string,
): Promise<NostrEvent> {
  if (!isValidPrivateKey(privateKey)) {
    throw new Error('Invalid private key format.');
  }

  if (!isValidPubKey(recipientPublicKey)) {
    throw new Error('Invalid recipient public key format.');
  }

  // Validate the order fields
  validateOrder(order);

  // Create the order event
  const event = createOrder(order, privateKey, recipientPublicKey);

  // Publish the event to the relay
  await publishEvent(event, relayUrl);

  return event;
}

/**
 * Fetch a list of orders from a relay.
 * @param relayUrl The relay URL to query.
 * @param filters Optional filters for the query (e.g., kind, authors).
 * @returns A list of parsed orders.
 */
export async function listOrders(relayUrl: string, filters?: Partial<Order>): Promise<Order[]> {
  try {
    const events = await pool.sub([relayUrl], {
      kinds: [38383], // Mostro-specific kind
      ...filters,
    });

    return events
      .map(parseOrder)
      .filter((order): order is Order => order !== null);
  } catch (error) {
    console.error('Failed to
