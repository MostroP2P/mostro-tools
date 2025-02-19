import {
  validateOrder,
  validateAmountConstraints,
  validateMarketPriceOrder,
  ValidationError,
} from '../../src/utils/validations';
import { Order, OrderType } from '../../src/types/core/order';

describe('Validation Utils', () => {
  describe('validateAmountConstraints', () => {
    it('should throw error when min amount is greater than max amount', () => {
      const order: Partial<Order> = {
        min_amount: 1000,
        max_amount: 500,
      };

      expect(() => validateAmountConstraints(order)).toThrow(
        new ValidationError('Minimum amount must be less than maximum amount', 'INVALID_RANGE'),
      );
    });

    it('should throw error when range amounts are negative', () => {
      const order: Partial<Order> = {
        min_amount: -100,
        max_amount: 500,
      };

      expect(() => validateAmountConstraints(order)).toThrow(
        new ValidationError('Range amounts cannot be negative', 'NEGATIVE_RANGE'),
      );
    });

    it('should throw error when range order has non-zero amount', () => {
      const order: Partial<Order> = {
        min_amount: 100,
        max_amount: 500,
        amount: 300,
      };

      expect(() => validateAmountConstraints(order)).toThrow(
        new ValidationError('Range orders must have amount set to 0', 'INVALID_AMOUNT_FOR_RANGE'),
      );
    });

    it('should pass validation for valid range order', () => {
      const order: Partial<Order> = {
        min_amount: 100,
        max_amount: 500,
        amount: 0,
      };

      expect(() => validateAmountConstraints(order)).not.toThrow();
    });
  });

  describe('validateMarketPriceOrder', () => {
    it('should throw error when market price order has no premium or fiat amount', () => {
      const order: Partial<Order> = {
        amount: 0,
        premium: 0,
        fiat_amount: 0,
      };

      expect(() => validateMarketPriceOrder(order)).toThrow(
        new ValidationError('Market price orders must specify either premium or fiat amount', 'INVALID_MARKET_PRICE'),
      );
    });

    it('should pass validation when market price order has premium', () => {
      const order: Partial<Order> = {
        amount: 0,
        premium: 5,
        fiat_amount: 0,
      };

      expect(() => validateMarketPriceOrder(order)).not.toThrow();
    });

    it('should pass validation when market price order has fiat amount', () => {
      const order: Partial<Order> = {
        amount: 0,
        premium: 0,
        fiat_amount: 1000,
      };

      expect(() => validateMarketPriceOrder(order)).not.toThrow();
    });
  });

  describe('validateOrder', () => {
    it('should throw error when fiat_code is missing', () => {
      const order: Partial<Order> = {
        kind: OrderType.BUY,
        payment_method: 'bank',
        amount: 100,
      };

      expect(() => validateOrder(order)).toThrow(
        new ValidationError('Order must have a valid fiat_code', 'INVALID_FIAT_CODE'),
      );
    });

    it('should throw error when payment_method is missing', () => {
      const order: Partial<Order> = {
        kind: OrderType.BUY,
        fiat_code: 'USD',
        amount: 100,
      };

      expect(() => validateOrder(order)).toThrow(
        new ValidationError('Order must have a valid payment_method', 'INVALID_PAYMENT_METHOD'),
      );
    });

    it('should throw error when premium is out of range', () => {
      const orderWithHighPremium: Partial<Order> = {
        kind: OrderType.BUY,
        fiat_code: 'USD',
        payment_method: 'bank',
        amount: 100,
        premium: 101,
      };

      const orderWithNegativePremium: Partial<Order> = {
        ...orderWithHighPremium,
        premium: -1,
      };

      expect(() => validateOrder(orderWithHighPremium)).toThrow(
        new ValidationError('Order premium must be between 0 and 100', 'INVALID_PREMIUM'),
      );

      expect(() => validateOrder(orderWithNegativePremium)).toThrow(
        new ValidationError('Order premium must be between 0 and 100', 'INVALID_PREMIUM'),
      );
    });

    it('should pass validation for valid regular order', () => {
      const order: Partial<Order> = {
        kind: OrderType.BUY,
        fiat_code: 'USD',
        payment_method: 'bank',
        amount: 100,
        premium: 5,
      };

      expect(() => validateOrder(order)).not.toThrow();
    });

    it('should pass validation for valid range order', () => {
      const order: Partial<Order> = {
        kind: OrderType.BUY,
        fiat_code: 'USD',
        payment_method: 'bank',
        amount: 0,
        premium: 5,
        min_amount: 100,
        max_amount: 500,
      };

      expect(() => validateOrder(order)).not.toThrow();
    });

    it('should pass validation for valid market price order', () => {
      const order: Partial<Order> = {
        kind: OrderType.BUY,
        fiat_code: 'USD',
        payment_method: 'bank',
        amount: 0,
        premium: 5,
      };

      expect(() => validateOrder(order)).not.toThrow();
    });

    it('should validate complex order with all constraints', () => {
      const validOrder: Partial<Order> = {
        kind: OrderType.BUY,
        fiat_code: 'USD',
        payment_method: 'bank',
        amount: 0,
        premium: 5,
        min_amount: 100,
        max_amount: 1000,
        fiat_amount: 0,
      };

      const invalidOrder: Partial<Order> = {
        ...validOrder,
        min_amount: 1000,
        max_amount: 100,
      };

      expect(() => validateOrder(validOrder)).not.toThrow();
      expect(() => validateOrder(invalidOrder)).toThrow(ValidationError);
    });
  });
});
