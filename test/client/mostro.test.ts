import { Mostro, MostroOptions, PublicKeyType } from '../../src/client/mostro';
import { NDKEvent } from '@nostr-dev-kit/ndk';
import { Action, Order, OrderStatus, OrderType } from '../../src/types/core';

// Mock dependencies
jest.mock('@nostr-dev-kit/ndk');
jest.mock('../../src/utils/nostr');
jest.mock('../../src/utils/key-manager');

describe('Mostro', () => {
  let mostro: Mostro;
  let options: MostroOptions;

  beforeEach(() => {
    options = {
      mostroPubKey: 'test-pubkey',
      relays: ['wss://relay.test'],
      privateKey: 'test-private-key',
      debug: true
    };
    mostro = new Mostro(options);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with the provided options', () => {
      expect(mostro).toBeInstanceOf(Mostro);
    });
  });

  describe('connect', () => {
    it('should connect to nostr and emit ready event', async () => {
      const readySpy = jest.spyOn(mostro, 'emit');
      await mostro.connect();
      expect(readySpy).toHaveBeenCalledWith('ready');
    });
  });

  describe('submitOrder', () => {
    it('should throw error if key manager is not initialized', async () => {
      const mostroWithoutKey = new Mostro({ ...options, privateKey: undefined });
      await expect(mostroWithoutKey.submitOrder({
        type: OrderType.SELL,
        amount: 100000,
        fiat_code: 'USD',
        fiat_amount: 50,
        payment_method: 'BANK'
      })).rejects.toThrow('Key manager not initialized');
    });

    it('should submit a new order successfully', async () => {
      const response = await mostro.submitOrder({
        type: OrderType.SELL,
        amount: 100000,
        fiat_code: 'USD',
        fiat_amount: 50,
        payment_method: 'BANK'
      });
      expect(response).toBeDefined();
    });
  });

  describe('takeSell/takeBuy', () => {
    const mockOrder: Order = {
      id: 'test-order-id',
      type: OrderType.SELL,
      amount: 100000,
      fiat_code: 'USD',
      fiat_amount: 50,
      payment_method: 'BANK',
      status: OrderStatus.PENDING,
      created_at: Date.now(),
      pubkey: 'test-pubkey'
    };

    it('should take a sell order', async () => {
      const response = await mostro.takeSell(mockOrder);
      expect(response).toBeDefined();
    });

    it('should take a buy order', async () => {
      const response = await mostro.takeBuy(mockOrder);
      expect(response).toBeDefined();
    });
  });

  describe('addInvoice', () => {
    const mockOrder: Order = {
      id: 'test-order-id',
      type: OrderType.SELL,
      amount: 100000,
      fiat_code: 'USD',
      fiat_amount: 50,
      payment_method: 'BANK',
      status: OrderStatus.PENDING,
      created_at: Date.now(),
      pubkey: 'test-pubkey'
    };

    it('should add invoice to order', async () => {
      const response = await mostro.addInvoice(mockOrder, 'lnbc500n1...');
      expect(response).toBeDefined();
    });
  });

  describe('event handling', () => {
    it('should handle order updates', () => {
      const orderUpdateSpy = jest.spyOn(mostro, 'emit');
      const mockEvent = new NDKEvent();
      mockEvent.tags = [['z', 'order']];

      // Simulate order update
      mostro['handlePublicMessage'](mockEvent);

      expect(orderUpdateSpy).toHaveBeenCalled();
    });

    it('should handle info updates', () => {
      const infoUpdateSpy = jest.spyOn(mostro, 'emit');
      const mockEvent = new NDKEvent();
      mockEvent.tags = [
        ['z', 'info'],
        ['mostro_pubkey', 'test-pubkey'],
        ['mostro_version', '1.0.0']
      ];

      // Simulate info update
      mostro['handlePublicMessage'](mockEvent);

      expect(infoUpdateSpy).toHaveBeenCalled();
    });
  });

  describe('utility methods', () => {
    it('should get mostro public key', () => {
      const pubkey = mostro.getMostroPublicKey(PublicKeyType.HEX);
      expect(pubkey).toBeDefined();
    });

    it('should get active orders', async () => {
      const orders = await mostro.getActiveOrders();
      expect(Array.isArray(orders)).toBe(true);
    });
  });

  describe('waitForAction', () => {
    it('should timeout if action is not received', async () => {
      await expect(
        mostro.waitForAction(Action.NewOrder, 'test-id', 100)
      ).rejects.toThrow('Timeout');
    });
  });
});
