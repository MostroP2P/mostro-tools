import {
  validateOrder,
  validateAmountConstraints,
  validateMarketPriceOrder,
  ValidationError,
} from '../../src/utils/validations';
import { Order, OrderType, OrderStatus } from '../../src/types/core/order';

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
      const order1: Partial<Order> = {
        min_amount: -100,
        max_amount: 500,
      };

      const order2: Partial<Order> = {
        min_amount: 100,
        max_amount: -500,
      };

      expect(() => validateAmountConstraints(order1)).toThrow(
        new ValidationError('Range amounts cannot be negative', 'NEGATIVE_RANGE'),
      );

      expect(() => validateAmountConstraints(order2)).toThrow(
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

    it('should pass validation for non-range order', () => {
      const order: Partial<Order> = {
        amount: 500,
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

    it('should pass validation when both premium and fiat amount are provided', () => {
      const order: Partial<Order> = {
        amount: 0,
        premium: 5,
        fiat_amount: 1000,
      };

      expect(() => validateMarketPriceOrder(order)).not.toThrow();
    });

    it('should not validate non-market-price orders', () => {
      const order: Partial<Order> = {
        amount: 500, // Non-zero amount
        premium: 0,
        fiat_amount: 0,
      };

      expect(() => validateMarketPriceOrder(order)).not.toThrow();
    });

    it('should not validate range orders', () => {
      const order: Partial<Order> = {
        amount: 0,
        min_amount: 100,
        max_amount: 500,
        premium: 0,
        fiat_amount: 0,
      };

      expect(() => validateMarketPriceOrder(order)).not.toThrow();
    });
  });

  describe('validateOrder', () => {
    const validOrderBase: Partial<Order> = {
      kind: OrderType.BUY,
      status: OrderStatus.PENDING,
      fiat_code: 'USD',
      payment_method: 'bank',
      fiat_amount: 1000,
      premium: 5,
    };

    it('should throw error when fiat_code is missing', () => {
      const { fiat_code, ...orderNoFiatCode } = validOrderBase;

      expect(() => validateOrder(orderNoFiatCode)).toThrow(
        new ValidationError('Order must have a valid fiat_code', 'INVALID_FIAT_CODE'),
      );
    });

    it('should throw error when fiat_code is not a string', () => {
      const invalidOrder = {
        ...validOrderBase,
        fiat_code: 123 as any, // Not a string
      };

      expect(() => validateOrder(invalidOrder)).toThrow(
        new ValidationError('Order must have a valid fiat_code', 'INVALID_FIAT_CODE'),
      );
    });

    it('should throw error when payment_method is missing', () => {
      const { payment_method, ...orderNoPaymentMethod } = validOrderBase;

      expect(() => validateOrder(orderNoPaymentMethod)).toThrow(
        new ValidationError('Order must have a valid payment_method', 'INVALID_PAYMENT_METHOD'),
      );
    });

    it('should throw error when payment_method is not a string', () => {
      const invalidOrder = {
        ...validOrderBase,
        payment_method: 123 as any, // Not a string
      };

      expect(() => validateOrder(invalidOrder)).toThrow(
        new ValidationError('Order must have a valid payment_method', 'INVALID_PAYMENT_METHOD'),
      );
    });

    it('should throw error when premium is out of range', () => {
      const orderWithHighPremium = {
        ...validOrderBase,
        premium: 101, // Too high
      };

      const orderWithNegativePremium = {
        ...validOrderBase,
        premium: -1, // Negative
      };

      expect(() => validateOrder(orderWithHighPremium)).toThrow(
        new ValidationError('Order premium must be between 0 and 100', 'INVALID_PREMIUM'),
      );

      expect(() => validateOrder(orderWithNegativePremium)).toThrow(
        new ValidationError('Order premium must be between 0 and 100', 'INVALID_PREMIUM'),
      );
    });

    it('should pass validation for valid regular order', () => {
      expect(() => validateOrder(validOrderBase)).not.toThrow();
    });

    it('should pass validation for valid market price order', () => {
      const marketPriceOrder = {
        ...validOrderBase,
        amount: 0,
      };

      expect(() => validateOrder(marketPriceOrder)).not.toThrow();
    });

    it('should pass validation for valid range order', () => {
      const rangeOrder = {
        ...validOrderBase,
        amount: 0,
        min_amount: 100,
        max_amount: 500,
      };

      expect(() => validateOrder(rangeOrder)).not.toThrow();
    });

    it('should run all validation steps', () => {
      // Use spies to verify all validators are called
      const validateAmountConstraintsSpy = jest.spyOn(
        require('../../src/utils/validations'),
        'validateAmountConstraints',
      );
      const validateMarketPriceOrderSpy = jest.spyOn(
        require('../../src/utils/validations'),
        'validateMarketPriceOrder',
      );

      validateOrder(validOrderBase);

      expect(validateAmountConstraintsSpy).toHaveBeenCalledWith(validOrderBase);
      expect(validateMarketPriceOrderSpy).toHaveBeenCalledWith(validOrderBase);

      // Restore the original functions
      validateAmountConstraintsSpy.mockRestore();
      validateMarketPriceOrderSpy.mockRestore();
    });

    it('should validate a complete order with all fields', () => {
      const completeOrder: Partial<Order> = {
        id: 'test-id',
        kind: OrderType.SELL,
        status: OrderStatus.PENDING,
        amount: 0,
        fiat_code: 'EUR',
        min_amount: 100,
        max_amount: 1000,
        fiat_amount: 0,
        payment_method: 'SEPA',
        premium: 5,
        created_at: Date.now(),
        expires_at: Date.now() + 24 * 60 * 60,
        buyer_pubkey: 'buyer-pubkey',
        seller_pubkey: 'seller-pubkey',
        master_buyer_pubkey: 'master-buyer-pubkey',
        master_seller_pubkey: 'master-seller-pubkey',
        trade_index: 1,
        buyer_invoice: 'lnbc500n1...',
      };

      expect(() => validateOrder(completeOrder)).not.toThrow();
    });
  });

  describe('ValidationError', () => {
    it('should create an error with code and message', () => {
      const error = new ValidationError('Test error message', 'TEST_ERROR');

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Test error message');
      expect(error.code).toBe('TEST_ERROR');
    });
  });
});
