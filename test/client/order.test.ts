import { OrderManager } from '../../src/client/order';
import { KeyManager } from '../../src/utils/key-manager';
import { Order, OrderType, OrderStatus } from '../../src/types/core/order';
import { generateMnemonic } from 'bip39';

describe('OrderManager', () => {
  let orderManager: OrderManager;
  let keyManager: KeyManager;
  const testMnemonic = generateMnemonic();

  beforeEach(async () => {
    keyManager = new KeyManager();
    await keyManager.initialize(testMnemonic);
    orderManager = new OrderManager(keyManager);
  });

  describe('createOrder', () => {
    it('should throw error if key manager is not initialized', async () => {
      const uninitializedKeyManager = new KeyManager();
      const orderManager = new OrderManager(uninitializedKeyManager);

      await expect(
        orderManager.createOrder({
          kind: OrderType.BUY,
          fiat_code: 'USD',
          fiat_amount: 100,
          payment_method: 'bank',
          premium: 5,
        }),
      ).rejects.toThrow('Key manager not initialized');
    });

    it('should create a buy order with correct properties', async () => {
      const order = await orderManager.createOrder({
        kind: OrderType.BUY,
        fiat_code: 'USD',
        fiat_amount: 100,
        payment_method: 'bank',
        premium: 5,
      });

      expect(order.id).toBeDefined();
      expect(order.kind).toBe(OrderType.BUY);
      expect(order.fiat_code).toBe('USD');
      expect(order.fiat_amount).toBe(100);
      expect(order.payment_method).toBe('bank');
      expect(order.premium).toBe(5);
      expect(order.amount).toBe(0); // Default for market price
      expect(order.created_at).toBeDefined();
      expect(order.expires_at).toBe(order.created_at + 24 * 60 * 60);
      expect(order.trade_index).toBeDefined();
      expect(order.buyer_pubkey).toBeDefined();
      expect(order.master_buyer_pubkey).toBeDefined();
      expect(order.seller_pubkey).toBeUndefined();
      expect(order.master_seller_pubkey).toBeUndefined();
    });

    it('should create a sell order with correct properties', async () => {
      const order = await orderManager.createOrder({
        kind: OrderType.SELL,
        fiat_code: 'EUR',
        fiat_amount: 200,
        payment_method: 'SEPA',
        premium: 3,
        amount: 150000,
      });

      expect(order.id).toBeDefined();
      expect(order.kind).toBe(OrderType.SELL);
      expect(order.fiat_code).toBe('EUR');
      expect(order.fiat_amount).toBe(200);
      expect(order.payment_method).toBe('SEPA');
      expect(order.premium).toBe(3);
      expect(order.amount).toBe(150000);
      expect(order.created_at).toBeDefined();
      expect(order.expires_at).toBe(order.created_at + 24 * 60 * 60);
      expect(order.trade_index).toBeDefined();
      expect(order.seller_pubkey).toBeDefined();
      expect(order.master_seller_pubkey).toBeDefined();
      expect(order.buyer_pubkey).toBeUndefined();
      expect(order.master_buyer_pubkey).toBeUndefined();
    });

    it('should create a range order correctly', async () => {
      const order = await orderManager.createOrder({
        kind: OrderType.SELL,
        fiat_code: 'USD',
        fiat_amount: 0,
        payment_method: 'bank',
        premium: 5,
        min_amount: 100,
        max_amount: 1000,
      });

      expect(order.min_amount).toBe(100);
      expect(order.max_amount).toBe(1000);
      expect(order.fiat_amount).toBe(0);
    });

    it('should assign unique IDs to orders', async () => {
      const order1 = await orderManager.createOrder({
        kind: OrderType.BUY,
        fiat_code: 'USD',
        fiat_amount: 100,
        payment_method: 'bank',
        premium: 5,
      });

      const order2 = await orderManager.createOrder({
        kind: OrderType.BUY,
        fiat_code: 'USD',
        fiat_amount: 100,
        payment_method: 'bank',
        premium: 5,
      });

      expect(order1.id).not.toBe(order2.id);
    });

    it('should assign different trade keys to orders', async () => {
      const order1 = await orderManager.createOrder({
        kind: OrderType.BUY,
        fiat_code: 'USD',
        fiat_amount: 100,
        payment_method: 'bank',
        premium: 5,
      });

      const order2 = await orderManager.createOrder({
        kind: OrderType.BUY,
        fiat_code: 'USD',
        fiat_amount: 100,
        payment_method: 'bank',
        premium: 5,
      });

      expect(order1.trade_index).not.toBe(order2.trade_index);

      if (order1.kind === OrderType.BUY) {
        expect(order1.buyer_pubkey).not.toBe(order2.buyer_pubkey);
      } else {
        expect(order1.seller_pubkey).not.toBe(order2.seller_pubkey);
      }
    });
  });

  describe('takeOrder', () => {
    it('should throw error if key manager is not initialized', async () => {
      const uninitializedKeyManager = new KeyManager();
      const orderManager = new OrderManager(uninitializedKeyManager);

      const existingOrder = {
        id: 'test-id',
        kind: OrderType.BUY,
        status: OrderStatus.PENDING,
        fiat_code: 'USD',
        fiat_amount: 100,
        payment_method: 'bank',
        premium: 5,
        amount: 0,
        created_at: Date.now(),
        expires_at: Date.now() + 24 * 60 * 60,
      } as Order;

      await expect(orderManager.takeOrder(existingOrder)).rejects.toThrow('Key manager not initialized');
    });

    it('should take a buy order and add seller keys', async () => {
      const buyOrder = await orderManager.createOrder({
        kind: OrderType.BUY,
        fiat_code: 'USD',
        fiat_amount: 100,
        payment_method: 'bank',
        premium: 5,
      });

      const takenOrder = await orderManager.takeOrder(buyOrder);

      expect(takenOrder.id).toBe(buyOrder.id);
      expect(takenOrder.kind).toBe(OrderType.BUY);
      expect(takenOrder.seller_pubkey).toBeDefined();
      expect(takenOrder.master_seller_pubkey).toBeDefined();
      expect(takenOrder.buyer_pubkey).toBe(buyOrder.buyer_pubkey);
      expect(takenOrder.master_buyer_pubkey).toBe(buyOrder.master_buyer_pubkey);
      expect(takenOrder.trade_index).toBeDefined();
      expect(takenOrder.trade_index).not.toBe(buyOrder.trade_index);
    });

    it('should take a sell order and add buyer keys', async () => {
      const sellOrder = await orderManager.createOrder({
        kind: OrderType.SELL,
        fiat_code: 'USD',
        fiat_amount: 100,
        payment_method: 'bank',
        premium: 5,
      });

      const takenOrder = await orderManager.takeOrder(sellOrder);

      expect(takenOrder.id).toBe(sellOrder.id);
      expect(takenOrder.kind).toBe(OrderType.SELL);
      expect(takenOrder.buyer_pubkey).toBeDefined();
      expect(takenOrder.master_buyer_pubkey).toBeDefined();
      expect(takenOrder.seller_pubkey).toBe(sellOrder.seller_pubkey);
      expect(takenOrder.master_seller_pubkey).toBe(sellOrder.master_seller_pubkey);
      expect(takenOrder.trade_index).toBeDefined();
      expect(takenOrder.trade_index).not.toBe(sellOrder.trade_index);
    });

    it('should take a range order correctly', async () => {
      const rangeOrder = await orderManager.createOrder({
        kind: OrderType.SELL,
        fiat_code: 'USD',
        fiat_amount: 0,
        payment_method: 'bank',
        premium: 5,
        min_amount: 100,
        max_amount: 1000,
      });

      const takenOrder = await orderManager.takeOrder(rangeOrder);

      expect(takenOrder.min_amount).toBe(100);
      expect(takenOrder.max_amount).toBe(1000);
      expect(takenOrder.buyer_pubkey).toBeDefined();
    });

    it('should preserve all original order properties when taking an order', async () => {
      const originalOrder = await orderManager.createOrder({
        kind: OrderType.BUY,
        fiat_code: 'USD',
        fiat_amount: 100,
        payment_method: 'bank',
        premium: 5,
        buyer_invoice: 'lnbc123...',
      });

      const takenOrder = await orderManager.takeOrder(originalOrder);

      expect(takenOrder.fiat_code).toBe(originalOrder.fiat_code);
      expect(takenOrder.fiat_amount).toBe(originalOrder.fiat_amount);
      expect(takenOrder.payment_method).toBe(originalOrder.payment_method);
      expect(takenOrder.premium).toBe(originalOrder.premium);
      expect(takenOrder.amount).toBe(originalOrder.amount);
      expect(takenOrder.buyer_invoice).toBe(originalOrder.buyer_invoice);
    });
  });
});
