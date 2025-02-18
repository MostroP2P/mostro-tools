import { finalizeEvent } from 'nostr-tools';
import { Order, OrderStatus, OrderType } from '../types/core/order';
import { createGiftWrapEvent, GiftWrapContent } from '../utils/nostr';
import { validateOrder } from '../utils/validations';

function generateOrderTags(order: Partial<Order>): string[][] {
  const tags: string[][] = [
    ['d', order.id || ''],
    ['k', order.kind || OrderType.BUY],
    ['f', order.fiat_code || ''],
    ['s', order.status || OrderStatus.PENDING],
    ['amt', order.amount?.toString() || '0'],
    ['pm', order.payment_method || ''],
    ['premium', order.premium?.toString() || '0'],
    ['y', 'mostrop2p'],
    ['z', 'order'],
  ];

  if (order.min_amount !== undefined && order.max_amount !== undefined) {
    tags.push(['fa', order.min_amount.toString(), order.max_amount.toString()]);
  } else {
    tags.push(['fa', order.fiat_amount?.toString() || '0']);
  }

  return tags.filter((tag) => tag.every((value) => value !== undefined));
}

export function createOrder(order: Partial<Order>, senderPrivateKey: Uint8Array, recipientPublicKey: string) {
  validateOrder(order);

  const newOrder: Partial<Order> = {
    kind: order.kind || OrderType.BUY,
    status: OrderStatus.PENDING,
    amount: order.amount || 0,
    fiat_code: order.fiat_code,
    payment_method: order.payment_method,
    premium: order.premium || 0,
    fiat_amount: order.fiat_amount || 0,
    min_amount: order.min_amount,
    max_amount: order.max_amount,
    created_at: order.created_at ?? Math.floor(Date.now() / 1000),
    ...order,
  };

  const eventTemplate = {
    kind: 38383,
    created_at: newOrder.created_at as number,
    tags: generateOrderTags(newOrder),
    content: JSON.stringify(newOrder),
  };

  const plainEvent = finalizeEvent(eventTemplate, senderPrivateKey);

  return createGiftWrapEvent(
    JSON.parse(JSON.stringify(plainEvent)) as GiftWrapContent,
    senderPrivateKey,
    recipientPublicKey,
  );
}
