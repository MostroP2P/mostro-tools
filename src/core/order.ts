import { NDKEvent } from '@nostr-dev-kit/ndk';
import { Order, OrderStatus, OrderType, NewOrder } from '../types/core/order';
import { validateOrder } from '../utils/validations';

export const NOSTR_REPLACEABLE_EVENT_KIND = 38383;
export const ORDER_EXPIRATION_TIME = 24 * 60 * 60; // 24 hours

export function generateOrderTags(order: Partial<Order>): string[][] {
  const tags: string[][] = [
    ['d', order.id || ''],
    ['k', order.kind || OrderType.BUY],
    ['f', order.fiat_code || ''],
    ['s', order.status || OrderStatus.PENDING],
    ['amt', (order.amount || 0).toString()],
    ['pm', order.payment_method || ''],
    ['premium', (order.premium || 0).toString()],
    ['network', 'mainnet'],
    ['layer', 'lightning'],
    ['y', 'mostrop2p'],
    ['z', 'order'],
  ];

  // Handle range orders
  if (order.min_amount !== undefined && order.max_amount !== undefined) {
    tags.push(['fa', order.min_amount.toString(), order.max_amount.toString()]);
  } else {
    tags.push(['fa', (order.fiat_amount || 0).toString()]);
  }

  // Add expiration
  const expiration = Math.floor(Date.now() / 1000) + ORDER_EXPIRATION_TIME;
  tags.push(['expiration', expiration.toString()]);

  return tags;
}

export function extractOrderFromEvent(event: NDKEvent): Order | null {
  try {
    // Filtrar y mapear solo los tags que tienen exactamente dos elementos
    const validTags = event.tags.filter((tag) => tag.length === 2);
    const tags = new Map(validTags as [string, string][]);

    // Parse amount information
    const fiatAmountTag = tags.get('fa');
    let minAmount: number | undefined;
    let maxAmount: number | undefined;
    let fiatAmount = 0;

    if (typeof fiatAmountTag === 'string' && fiatAmountTag.includes(',')) {
      const [min, max] = fiatAmountTag.split(',').map(Number);
      minAmount = min;
      maxAmount = max;
    } else if (fiatAmountTag) {
      fiatAmount = Number(fiatAmountTag);
    }

    return {
      id: String(tags.get('d')) || '',
      kind: tags.get('k') as OrderType,
      status: tags.get('s') as OrderStatus,
      amount: Number(tags.get('amt')) || 0,
      fiat_code: String(tags.get('f')) || '',
      fiat_amount: fiatAmount,
      min_amount: minAmount,
      max_amount: maxAmount,
      payment_method: String(tags.get('pm')) || '',
      premium: Number(tags.get('premium')) || 0,
      created_at: event.created_at || Math.floor(Date.now() / 1000),
      expires_at: Number(tags.get('expiration')) || 0,
    };
  } catch (error) {
    console.error('Error extracting order from event:', error);
    return null;
  }
}

export function prepareNewOrder(newOrder: NewOrder): Order {
  validateOrder(newOrder);

  return {
    id: crypto.randomUUID(),
    kind: newOrder.kind,
    status: OrderStatus.PENDING,
    amount: newOrder.amount || 0,
    fiat_code: newOrder.fiat_code,
    fiat_amount: newOrder.fiat_amount,
    min_amount: newOrder.min_amount,
    max_amount: newOrder.max_amount,
    payment_method: newOrder.payment_method,
    premium: newOrder.premium,
    created_at: Math.floor(Date.now() / 1000),
    expires_at: Math.floor(Date.now() / 1000) + ORDER_EXPIRATION_TIME,
    buyer_invoice: newOrder.buyer_invoice,
  };
}

export function isOrderExpired(order: Order): boolean {
  return order.expires_at < Math.floor(Date.now() / 1000);
}

export function isRangeOrder(order: Order): boolean {
  return order.min_amount !== undefined && order.max_amount !== undefined;
}

export function isMarketPriceOrder(order: Order): boolean {
  return order.amount === 0 && !isRangeOrder(order);
}
