import * as MostroTools from '../src';

describe('MostroTools Library Exports', () => {
  describe('Core Classes', () => {
    it('should export Mostro class', () => {
      expect(MostroTools.Mostro).toBeDefined();
    });

    it('should export OrderManager class', () => {
      expect(MostroTools.OrderManager).toBeDefined();
    });
  });

  describe('Utility Classes', () => {
    it('should export KeyManager class', () => {
      expect(MostroTools.KeyManager).toBeDefined();
    });

    it('should export CryptoUtils class', () => {
      expect(MostroTools.CryptoUtils).toBeDefined();
    });

    it('should export Nostr class', () => {
      expect(MostroTools.Nostr).toBeDefined();
    });
  });

  describe('Types and Enums', () => {
    it('should export OrderType enum', () => {
      expect(MostroTools.OrderType).toBeDefined();
      expect(MostroTools.OrderType.BUY).toBeDefined();
      expect(MostroTools.OrderType.SELL).toBeDefined();
    });

    it('should export OrderStatus enum', () => {
      expect(MostroTools.OrderStatus).toBeDefined();
    });

    it('should export PublicKeyType enum', () => {
      expect(MostroTools.PublicKeyType).toBeDefined();
    });
  });

  describe('Constants', () => {
    it('should export NOSTR_REPLACEABLE_EVENT_KIND', () => {
      expect(MostroTools.NOSTR_REPLACEABLE_EVENT_KIND).toBeDefined();
      expect(typeof MostroTools.NOSTR_REPLACEABLE_EVENT_KIND).toBe('number');
    });

    it('should export ORDER_EXPIRATION_TIME', () => {
      expect(MostroTools.ORDER_EXPIRATION_TIME).toBeDefined();
      expect(typeof MostroTools.ORDER_EXPIRATION_TIME).toBe('number');
    });
  });

  describe('Core Functions', () => {
    it('should export order utility functions', () => {
      expect(MostroTools.generateOrderTags).toBeDefined();
      expect(MostroTools.extractOrderFromEvent).toBeDefined();
      expect(MostroTools.prepareNewOrder).toBeDefined();
      expect(MostroTools.isOrderExpired).toBeDefined();
      expect(MostroTools.isRangeOrder).toBeDefined();
      expect(MostroTools.isMarketPriceOrder).toBeDefined();
    });
  });

  describe('wait function', () => {
    it('should resolve after specified timeout', async () => {
      const start = Date.now();
      await MostroTools.wait(100);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(100);
    });

    it('should resolve with true', async () => {
      const result = await MostroTools.wait(10);
      expect(result).toBe(true);
    });

    it('should use default timeout when none specified', async () => {
      const result = await MostroTools.wait();
      expect(result).toBe(true);
    });

    it('should handle zero timeout', async () => {
      const start = Date.now();
      await MostroTools.wait(0);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(10); // Should be almost immediate
    });
  });

  describe('Error Classes', () => {
    it('should export ValidationError', () => {
      expect(MostroTools.ValidationError).toBeDefined();
      const error = new MostroTools.ValidationError('test error', 'TEST_ERROR');
      expect(error).toBeInstanceOf(Error);
      expect(error.code).toBe('TEST_ERROR');
    });

    it('should export KeyManagerError', () => {
      expect(MostroTools.KeyManagerError).toBeDefined();
      const error = new MostroTools.KeyManagerError('test error', 'TEST_ERROR');
      expect(error).toBeInstanceOf(Error);
      expect(error.code).toBe('TEST_ERROR');
    });
  });
});
