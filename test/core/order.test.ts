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
import { ValidationError } from '../../src/utils/validations';

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
        kind: OrderType.SELL,
        fiat_code: 'USD',
        status: OrderStatus.PENDING,
        amount: 0,
        payment_method: 'bank',
        premium: 5,
        min_amount: 100,
        max_amount: 1000,
      };

      const tags = generateOrderTags(order);
      expect(tags).toContainEqual(['fa', '100', '1000']);
    });

    it('should include expiration tag', () => {
      const order: Partial<Order> = {
        id: 'test-id',
      };

      const tags = generateOrderTags(order);
      const expirationTag = tags.find(tag => tag[0] === 'expiration');

      expect(expirationTag).toBeDefined();
      expect(expirationTag![1]).toMatch(/^\d+$/); // Should be a numeric timestamp
    });

    it('should handle missing fields with defaults', () => {
      const order: Partial<Order> = {
        id: 'test-id',
      };

      const tags = generateOrderTags(order);

      expect(tags).toContainEqual(['d', 'test-id']);
      expect(tags).toContainEqual(['amt', '0']);
      expect(tags).toContainEqual(['fa', '0']);
      expect(tags).toContainEqual(['pm', '']);
      expect(tags).toContainEqual(['premium', '0']);
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
      expect(order?.status).toBe(OrderStatus.PENDING);
      expect(order?.amount).toBe(100);
      expect(order?.fiat_amount).toBe(1000);
      expect(order?.payment_method).toBe('bank');
      expect(order?.premium).toBe(5);
      expect(order?.created_at).toBe(1693440000);
      expect(order?.expires_at).toBe(1693526400);
    });

    it('should handle range orders in event', () => {
      const mockEvent = {
        tags: [
          ['d', 'test-id'],
          ['k', OrderType.SELL],
          ['f', 'USD'],
          ['s', OrderStatus.PENDING],
          ['amt', '0'],
          ['pm', 'bank'],
          ['premium', '5'],
          ['fa', '100', '1000'],
        ],
        created_at: 1693440000,
      } as NDKEvent;

      const order = extractOrderFromEvent(mockEvent);

      expect(order).toBeDefined();
      expect(order?.min_amount).toBe(100);
      expect(order?.max_amount).toBe(1000);
      expect(order?.fiat_amount).toBe(0); // Fiat amount should be 0 for range orders
    });

    it('should extract different order statuses correctly', () => {
      const statuses = [
        OrderStatus.ACTIVE,
        OrderStatus.CANCELED,
        OrderStatus.PENDING,
        OrderStatus.SUCCESS,
        OrderStatus.WAITING_BUYER_INVOICE,
        OrderStatus.WAITING_PAYMENT,
      ];

      for (const status of statuses) {
        const mockEvent = {
          tags: [
            ['d', 'test-id'],
            ['k', OrderType.BUY],
            ['s', status],
          ],
          created_at: 1693440000,
        } as NDKEvent;

        const order = extractOrderFromEvent(mockEvent);
        expect(order?.status).toBe(status);
      }
    });

    it('should return null for invalid event', () => {
      const mockEvent = {
        tags: [['invalid']],
        created_at: 1693440000,
      } as NDKEvent;

      const order = extractOrderFromEvent(mockEvent);
      expect(order).toBeNull();
    });

    it('should handle event with invalid numbers gracefully', () => {
      const mockEvent = {
        tags: [
          ['d', 'test-id'],
          ['k', OrderType.BUY],
          ['f', 'USD'],
          ['s', OrderStatus.PENDING],
          ['amt', 'not-a-number'], // Invalid number
          ['pm', 'bank'],
          ['premium', 'invalid'], // Invalid number
          ['fa', '1000'],
        ],
        created_at: 1693440000,
      } as NDKEvent;

      const order = extractOrderFromEvent(mockEvent);

      expect(order).toBeDefined();
      expect(order?.amount).toBe(0); // Should default to 0 for NaN
      expect(order?.premium).toBe(0); // Should default to 0 for NaN
    });
  });

  describe('prepareNewOrder', () => {
    it('should prepare a new order with required fields', () => {
      const newOrder: NewOrder = {
        kind: OrderType.BUY,
        status: OrderStatus.PENDING,
        fiat_code: 'USD',
        payment_method: 'bank',
        fiat_amount: 1000,
        premium: 5,
      };

      const order = prepareNewOrder(newOrder);

      expect(order.id).toBeDefined();
      expect(order.status).toBe(OrderStatus.PENDING);
      expect(order.created_at).toBeDefined();
      expect(order.expires_at).toBe(order.created_at + ORDER_EXPIRATION_TIME);
      expect(order.kind).toBe(OrderType.BUY);
      expect(order.fiat_code).toBe('USD');
      expect(order.fiat_amount).toBe(1000);
      expect(order.payment_method).toBe('bank');
      expect(order.premium).toBe(5);
    });

    it('should prepare a fixed amount order', () => {
      const newOrder: NewOrder = {
        kind: OrderType.SELL,
        status: OrderStatus.PENDING,
        fiat_code: 'USD',
        payment_method: 'bank',
        fiat_amount: 1000,
        premium: 5,
        amount: 50000, // Fixed amount
      };

      const order = prepareNewOrder(newOrder);
      expect(order.amount).toBe(50000);
    });

    it('should prepare a range order', () => {
      const newOrder: NewOrder = {
        kind: OrderType.SELL,
        status: OrderStatus.PENDING,
        fiat_code: 'USD',
        payment_method: 'bank',
        fiat_amount: 0,
        premium: 5,
        min_amount: 100,
        max_amount: 1000,
      };

      const order = prepareNewOrder(newOrder);
      expect(order.min_amount).toBe(100);
      expect(order.max_amount).toBe(1000);
    });

    it('should handle optional buyer_invoice field', () => {
      const newOrder: NewOrder = {
        kind: OrderType.BUY,
        status: OrderStatus.PENDING,
        fiat_code: 'USD',
        payment_method: 'bank',
        fiat_amount: 1000,
        premium: 5,
        buyer_invoice: 'lnbc500n1...',
      };

      const order = prepareNewOrder(newOrder);
      expect(order.buyer_invoice).toBe('lnbc500n1...');
    });

    it('should throw validation error for invalid orders', () => {
      // Missing required field
      const invalidOrder: Partial<NewOrder> = {
        kind: OrderType.BUY,
        status: OrderStatus.PENDING,
        // Missing fiat_code
        payment_method: 'bank',
        fiat_amount: 1000,
        premium: 5,
      };

      expect(() => prepareNewOrder(invalidOrder as NewOrder)).toThrow(ValidationError);
    });
  });

  describe('isOrderExpired', () => {
    it('should return true for expired orders', () => {
      const order: Order = {
        expires_at: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
      } as Order;

      expect(isOrderExpired(order)).toBe(true);
    });

    it('should return false for non-expired orders', () => {
      const order: Order = {
        expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour in the future
      } as Order;

      expect(isOrderExpired(order)).toBe(false);
    });

    it('should return false for orders expiring exactly now', () => {
      const now = Math.floor(Date.now() / 1000);
      const order: Order = {
        expires_at: now,
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

    it('should require both min and max amount to be defined', () => {
      const onlyMinOrder: Order = {
        min_amount: 100,
      } as Order;

      const onlyMaxOrder: Order = {
        max_amount: 1000,
      } as Order;

      expect(isRangeOrder(onlyMinOrder)).toBe(false);
      expect(isRangeOrder(onlyMaxOrder)).toBe(false);
    });
  });

  describe('isMarketPriceOrder', () => {
    it('should identify market price orders correctly', () => {
      const marketOrder: Order = {
        amount: 0,
      } as Order;

      const fixedOrder: Order = {
        amount: 100,
      } as Order;

      expect(isMarketPriceOrder(marketOrder)).toBe(true);
      expect(isMarketPriceOrder(fixedOrder)).toBe(false);
    });

    it('should identify range orders as non-market price', () => {
      const rangeOrder: Order = {
        amount: 0,
        min_amount: 100,
        max_amount: 1000,
      } as Order;

      expect(isMarketPriceOrder(rangeOrder)).toBe(false);
    });
  });
});
