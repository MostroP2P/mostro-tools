import { Order } from '../types/core/order';

export class ValidationError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validateAmountConstraints(order: Partial<Order>): void {
  if (order.min_amount !== undefined && order.max_amount !== undefined) {
    if (order.min_amount >= order.max_amount) {
      throw new ValidationError('Minimum amount must be less than maximum amount', 'INVALID_RANGE');
    }
    if (order.min_amount < 0 || order.max_amount < 0) {
      throw new ValidationError('Range amounts cannot be negative', 'NEGATIVE_RANGE');
    }
    if (order.amount !== 0) {
      throw new ValidationError('Range orders must have amount set to 0', 'INVALID_AMOUNT_FOR_RANGE');
    }
  }
}

export function validateMarketPriceOrder(order: Partial<Order>): void {
  if (order.amount === 0 && !order.min_amount && !order.max_amount) {
    if (order.premium === 0 && order.fiat_amount === 0) {
      throw new ValidationError(
        'Market price orders must specify either premium or fiat amount',
        'INVALID_MARKET_PRICE',
      );
    }
  }
}

export function validateOrder(order: Partial<Order>): void {
  if (!order.fiat_code || typeof order.fiat_code !== 'string') {
    throw new ValidationError('Order must have a valid fiat_code', 'INVALID_FIAT_CODE');
  }

  if (!order.payment_method || typeof order.payment_method !== 'string') {
    throw new ValidationError('Order must have a valid payment_method', 'INVALID_PAYMENT_METHOD');
  }

  if (order.premium && (order.premium < 0 || order.premium > 100)) {
    throw new ValidationError('Order premium must be between 0 and 100', 'INVALID_PREMIUM');
  }

  validateAmountConstraints(order);
  validateMarketPriceOrder(order);
}
