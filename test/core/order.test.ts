import { NDKEvent } from '@nostr-dev-kit/ndk';
import {
  generateOrderTags,
  extractOrderFromEvent,
  prepareNewOrder,
  isOrderExpired,
  isRangeOrder,
  isMarketPriceOrder,
  ORDER_EXPIRATION_TIME,
} from '../../src/core/order';
import { Order, OrderStatus, OrderType, NewOrder } from '../../src/types/core/order';

describe('Core Order Functions', () => {
  describe('generateOrderTags', () => {
    it('should generate basic order tags', () => {
      const order: Partial<Order> = {
        id: 'test-id',
        kind: OrderType.BUY,
        fiat_code: 'USD',
        status: OrderStatus.PENDING,
        amount: 100,
        payment_method: 'bank',
        premium: 5,
        fiat_amount: 1000,
      };

      const tags = generateOrderTags(order);

      expect(tags).toContainEqual(['d', 'test-id']);
      expect(tags).toContainEqual(['k', OrderType.BUY]);
      expect(tags).toContainEqual(['f', 'USD']);
      expect(tags).toContainEqual(['s', OrderStatus.PENDING]);
      expect(tags).toContainEqual(['amt', '100']);
      expect(tags).toContainEqual(['pm', 'bank']);
      expect(tags).toContainEqual(['premium', '5']);
      expect(tags).toContainEqual(['fa', '1000']);
      expect(tags).toContainEqual(['network', 'mainnet']);
      expect(tags).toContainEqual(['layer', 'lightning']);
    });

    it('should handle range orders', () => {
      const order: Partial<Order> = {
        id: 'test-id',
        min_amount: 100,
        max_amount: 1000,
      };

      const tags = generateOrderTags(order);
      expect(tags).toContainEqual(['fa', '100', '1000']);
    });
  });

  describe('extractOrderFromEvent', () => {
    it('should extract order from valid event', () => {
      const mockEvent = {
        tags: [
          ['d', 'test-id'],
          ['k', OrderType.BUY],
          ['f', 'USD'],
          ['s', OrderStatus.PENDING],
          ['amt', '100'],
          ['pm', 'bank'],
          ['premium', '5'],
          ['fa', '1000'],
          ['expiration', '1693526400'],
        ],
        created_at: 1693440000,
      } as NDKEvent;

      const order = extractOrderFromEvent(mockEvent);

      expect(order).toBeDefined();
      expect(order?.id).toBe('test-id');
      expect(order?.kind).toBe(OrderType.BUY);
      expect(order?.fiat_code).toBe('USD');
      expect(order?.amount).toBe(100);
      expect(order?.fiat_amount).toBe(1000);
      expect(order?.payment_method).toBe('bank');
      expect(order?.premium).toBe(5);
    });

    it('should handle range orders in event', () => {
      const mockEvent = {
        tags: [
          ['d', 'test-id'],
          ['fa', '100,1000'],
        ],
        created_at: 1693440000,
      } as NDKEvent;

      const order = extractOrderFromEvent(mockEvent);

      expect(order?.min_amount).toBe(100);
      expect(order?.max_amount).toBe(1000);
    });

    it('should return null for invalid event', () => {
      const mockEvent = {
        tags: [['invalid']],
        created_at: 1693440000,
      } as NDKEvent;

      const order = extractOrderFromEvent(mockEvent);
      expect(order).toBeNull();
    });
  });

  describe('prepareNewOrder', () => {
    it('should prepare a new order with required fields', () => {
      const newOrder: NewOrder = {
        kind: OrderType.BUY,
        fiat_code: 'USD',
        payment_method: 'bank',
        amount: 100,
        premium: 5,
      };

      const order = prepareNewOrder(newOrder);

      expect(order.id).toBeDefined();
      expect(order.status).toBe(OrderStatus.PENDING);
      expect(order.created_at).toBeDefined();
      expect(order.expires_at).toBe(order.created_at + ORDER_EXPIRATION_TIME);
      expect(order.kind).toBe(OrderType.BUY);
      expect(order.fiat_code).toBe('USD');
      expect(order.amount).toBe(100);
      expect(order.premium).toBe(5);
    });
  });

  describe('isOrderExpired', () => {
    it('should return true for expired orders', () => {
      const order: Order = {
        expires_at: Math.floor(Date.now() / 1000) - 3600,
      } as Order;

      expect(isOrderExpired(order)).toBe(true);
    });

    it('should return false for non-expired orders', () => {
      const order: Order = {
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      } as Order;

      expect(isOrderExpired(order)).toBe(false);
    });
  });

  describe('isRangeOrder', () => {
    it('should identify range orders correctly', () => {
      const rangeOrder: Order = {
        min_amount: 100,
        max_amount: 1000,
      } as Order;

      const normalOrder: Order = {
        amount: 100,
      } as Order;

      expect(isRangeOrder(rangeOrder)).toBe(true);
      expect(isRangeOrder(normalOrder)).toBe(false);
    });
  });

  describe('isMarketPriceOrder', () => {
    it('should identify market price orders correctly', () => {
      const marketOrder: Order = {
        amount: 0,
      } as Order;

      const rangeOrder: Order = {
        amount: 0,
        min_amount: 100,
        max_amount: 1000,
      } as Order;

      const normalOrder: Order = {
        amount: 100,
      } as Order;

      expect(isMarketPriceOrder(marketOrder)).toBe(true);
      expect(isMarketPriceOrder(rangeOrder)).toBe(false);
      expect(isMarketPriceOrder(normalOrder)).toBe(false);
    });
  });
});
