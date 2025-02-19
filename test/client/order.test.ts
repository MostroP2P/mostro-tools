import { OrderManager } from '../../src/client/order';
import { KeyManager } from '../../src/utils/key-manager';
import { OrderType, NewOrder } from '../../src/types/core/order';

describe('OrderManager', () => {
  let orderManager: OrderManager;
  let keyManager: KeyManager;

  beforeEach(async () => {
    keyManager = new KeyManager();
    await keyManager.init('test-seed-phrase');
    orderManager = new OrderManager(keyManager);
  });

  describe('createOrder', () => {
    it('should throw error if key manager is not initialized', async () => {
      const uninitializedKeyManager = new KeyManager();
      const orderManager = new OrderManager(uninitializedKeyManager);
      const newOrder: NewOrder = {
        kind: OrderType.BUY,
        amount: 100,
      };

      await expect(orderManager.createOrder(newOrder)).rejects.toThrow('Key manager not initialized');
    });

    it('should create a buy order with correct properties', async () => {
      const newOrder: NewOrder = {
        kind: OrderType.BUY,
        amount: 100,
      };

      const order = await orderManager.createOrder(newOrder);

      expect(order.id).toBeDefined();
      expect(order.amount).toBe(100);
      expect(order.created_at).toBeDefined();
      expect(order.expires_at).toBe(order.created_at + 24 * 60 * 60);
      expect(order.trade_index).toBeDefined();
      expect(order.buyer_pubkey).toBeDefined();
      expect(order.master_buyer_pubkey).toBeDefined();
      expect(order.seller_pubkey).toBeUndefined();
      expect(order.master_seller_pubkey).toBeUndefined();
    });

    it('should create a sell order with correct properties', async () => {
      const newOrder: NewOrder = {
        kind: OrderType.SELL,
        amount: 200,
      };

      const order = await orderManager.createOrder(newOrder);

      expect(order.id).toBeDefined();
      expect(order.amount).toBe(200);
      expect(order.created_at).toBeDefined();
      expect(order.expires_at).toBe(order.created_at + 24 * 60 * 60);
      expect(order.trade_index).toBeDefined();
      expect(order.seller_pubkey).toBeDefined();
      expect(order.master_seller_pubkey).toBeDefined();
      expect(order.buyer_pubkey).toBeUndefined();
      expect(order.master_buyer_pubkey).toBeUndefined();
    });
  });

  describe('takeOrder', () => {
    it('should throw error if key manager is not initialized', async () => {
      const uninitializedKeyManager = new KeyManager();
      const orderManager = new OrderManager(uninitializedKeyManager);
      const existingOrder = await orderManager.createOrder({
        kind: OrderType.BUY,
        amount: 100,
      });

      await expect(orderManager.takeOrder(existingOrder)).rejects.toThrow('Key manager not initialized');
    });

    it('should take a buy order and add seller keys', async () => {
      const buyOrder = await orderManager.createOrder({
        kind: OrderType.BUY,
        amount: 100,
      });

      const takenOrder = await orderManager.takeOrder(buyOrder);

      expect(takenOrder.id).toBe(buyOrder.id);
      expect(takenOrder.seller_pubkey).toBeDefined();
      expect(takenOrder.master_seller_pubkey).toBeDefined();
      expect(takenOrder.trade_index).toBeDefined();
      expect(takenOrder.trade_index).not.toBe(buyOrder.trade_index);
    });

    it('should take a sell order and add buyer keys', async () => {
      const sellOrder = await orderManager.createOrder({
        kind: OrderType.SELL,
        amount: 100,
      });

      const takenOrder = await orderManager.takeOrder(sellOrder);

      expect(takenOrder.id).toBe(sellOrder.id);
      expect(takenOrder.buyer_pubkey).toBeDefined();
      expect(takenOrder.master_buyer_pubkey).toBeDefined();
      expect(takenOrder.trade_index).toBeDefined();
      expect(takenOrder.trade_index).not.toBe(sellOrder.trade_index);
    });
  });
});
