import { Mostro, MostroOptions, PublicKeyType } from '../../src/client/mostro';
import { NDKEvent } from '@nostr-dev-kit/ndk';
import { Action, Order, OrderStatus, OrderType, MostroMessage } from '../../src/types/core';
import { Nostr } from '../../src/utils/nostr';

// Mock dependencies
jest.mock('@nostr-dev-kit/ndk');
jest.mock('../../src/utils/nostr');
jest.mock('../../src/utils/key-manager');

describe('Mostro', () => {
  let mostro: Mostro;
  let options: MostroOptions;
  let mockNostr: jest.Mocked<Nostr>;

  beforeEach(() => {
    options = {
      mostroPubKey: 'test-pubkey',
      relays: ['wss://relay.test'],
      privateKey: 'test-private-key',
      debug: true,
    };

    // Reset mocks and create new instance
    jest.clearAllMocks();
    mostro = new Mostro(options);
    mockNostr = mostro.getNostr() as jest.Mocked<Nostr>;
  });

  describe('constructor', () => {
    it('should initialize with the provided options', () => {
      expect(mostro).toBeInstanceOf(Mostro);
    });

    it('should initialize without private key', () => {
      const noKeyOptions = { ...options, privateKey: undefined };
      const mostroNoKey = new Mostro(noKeyOptions);
      expect(mostroNoKey).toBeInstanceOf(Mostro);
    });
  });

  describe('connect', () => {
    it('should connect to nostr and resolve when ready', async () => {
      const readySpy = jest.spyOn(mostro, 'emit');

      // Mock the nostr ready event
      setTimeout(() => {
        mockNostr.emit('ready');
      }, 10);

      await mostro.connect();
      expect(readySpy).toHaveBeenCalledWith('ready');
    });
  });

  describe('order operations', () => {
    const mockOrder: Order = {
      id: 'test-order-id',
      kind: OrderType.SELL,
      status: OrderStatus.PENDING,
      amount: 100000,
      fiat_code: 'USD',
      fiat_amount: 50,
      payment_method: 'BANK',
      premium: 5,
      created_at: Date.now(),
      expires_at: Date.now() + 24 * 60 * 60,
    };

    beforeEach(() => {
      // Setup mock for createAndPublishMostroEvent
      mockNostr.createAndPublishMostroEvent = jest.fn().mockResolvedValue(undefined);

      // Setup mock for waitForAction
      jest.spyOn(mostro, 'waitForAction').mockImplementation((action, orderId) => {
        const mockResponse: MostroMessage = {
          order: {
            version: 1,
            id: orderId,
            action: action,
            created_at: Date.now(),
          },
        };
        return Promise.resolve(mockResponse);
      });
    });

    it('should submit order successfully', async () => {
      const response = await mostro.submitOrder({
        kind: OrderType.SELL,
        status: OrderStatus.PENDING,
        amount: 100000,
        fiat_code: 'USD',
        fiat_amount: 50,
        payment_method: 'BANK',
        premium: 5,
      });

      expect(mockNostr.createAndPublishMostroEvent).toHaveBeenCalled();
      expect(response).toBeDefined();
      expect(response.order?.action).toBe(Action.NewOrder);
    });

    it('should take sell order successfully', async () => {
      const response = await mostro.takeSell(mockOrder);

      expect(mockNostr.createAndPublishMostroEvent).toHaveBeenCalled();
      expect(response).toBeDefined();
      expect(response.order?.action).toBe(Action.TakeSell);
      expect(response.order?.id).toBe(mockOrder.id);
    });

    it('should take sell order with amount parameter', async () => {
      const response = await mostro.takeSell(mockOrder, 15);

      expect(mockNostr.createAndPublishMostroEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          order: expect.objectContaining({
            content: { amount: 15 },
          }),
        }),
        expect.any(String),
      );
      expect(response.order?.action).toBe(Action.TakeSell);
    });

    it('should take buy order successfully', async () => {
      const response = await mostro.takeBuy(mockOrder);

      expect(mockNostr.createAndPublishMostroEvent).toHaveBeenCalled();
      expect(response).toBeDefined();
      expect(response.order?.action).toBe(Action.TakeBuy);
    });

    it('should add invoice to order', async () => {
      const invoice = 'lnbc500n1...';
      const response = await mostro.addInvoice(mockOrder, invoice);

      expect(mockNostr.createAndPublishMostroEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          order: expect.objectContaining({
            action: Action.AddInvoice,
            content: {
              payment_request: [null, invoice, null],
            },
          }),
        }),
        expect.any(String),
      );
      expect(response.order?.action).toBe(Action.AddInvoice);
    });

    it('should add invoice with amount parameter', async () => {
      const invoice = 'lnbc500n1...';
      const amount = 12345;
      const response = await mostro.addInvoice(mockOrder, invoice, amount);

      expect(mockNostr.createAndPublishMostroEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          order: expect.objectContaining({
            content: {
              payment_request: [null, invoice, amount],
            },
          }),
        }),
        expect.any(String),
      );
    });

    it('should release order successfully', async () => {
      const response = await mostro.release(mockOrder);

      expect(mockNostr.createAndPublishMostroEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          order: expect.objectContaining({
            action: Action.Release,
            id: mockOrder.id,
          }),
        }),
        expect.any(String),
      );
      expect(response.order?.action).toBe(Action.Release);
    });

    it('should send fiatSent message successfully', async () => {
      const response = await mostro.fiatSent(mockOrder);

      expect(mockNostr.createAndPublishMostroEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          order: expect.objectContaining({
            action: Action.FiatSent,
            id: mockOrder.id,
          }),
        }),
        expect.any(String),
      );
      expect(response.order?.action).toBe(Action.FiatSent);
    });
  });

  describe('active orders management', () => {
    it('should get active orders', async () => {
      // Add some mock orders to the active orders map
      const mockOrder1: Order = {
        id: 'test-order-1',
        kind: OrderType.SELL,
        status: OrderStatus.PENDING,
        amount: 100000,
        fiat_code: 'USD',
        fiat_amount: 50,
        payment_method: 'BANK',
        premium: 5,
        created_at: Date.now(),
        expires_at: Date.now() + 24 * 60 * 60,
      };

      const mockOrder2: Order = {
        id: 'test-order-2',
        kind: OrderType.BUY,
        status: OrderStatus.PENDING,
        amount: 200000,
        fiat_code: 'EUR',
        fiat_amount: 100,
        payment_method: 'SEPA',
        premium: 3,
        created_at: Date.now(),
        expires_at: Date.now() + 24 * 60 * 60,
      };

      mostro['activeOrders'].set(mockOrder1.id, mockOrder1);
      mostro['activeOrders'].set(mockOrder2.id, mockOrder2);

      const orders = await mostro.getActiveOrders();

      expect(orders).toHaveLength(2);
      expect(orders).toContainEqual(mockOrder1);
      expect(orders).toContainEqual(mockOrder2);
    });

    it('should handle public message events for pending orders', () => {
      const mockEvent = new NDKEvent();
      mockEvent.tags = [
        ['z', 'order'],
        ['d', 'test-order-id'],
        ['k', OrderType.SELL],
        ['s', OrderStatus.PENDING],
        ['amt', '100000'],
        ['fa', '50'],
        ['f', 'USD'],
        ['pm', 'BANK'],
        ['premium', '5'],
      ];
      mockEvent.created_at = Date.now();

      const orderUpdateSpy = jest.spyOn(mostro, 'emit');

      // Process the event
      mostro['handlePublicMessage'](mockEvent);

      // Should add to active orders
      expect(mostro['activeOrders'].size).toBe(1);
      expect(mostro['activeOrders'].has('test-order-id')).toBe(true);
      expect(orderUpdateSpy).toHaveBeenCalledWith('order-update', expect.any(Object), mockEvent);
    });

    it('should handle public message events for non-pending orders', () => {
      const mockEvent = new NDKEvent();
      mockEvent.tags = [
        ['z', 'order'],
        ['d', 'test-order-id'],
        ['k', OrderType.SELL],
        ['s', OrderStatus.SUCCESS], // Already completed
        ['amt', '100000'],
        ['fa', '50'],
        ['f', 'USD'],
        ['pm', 'BANK'],
        ['premium', '5'],
      ];
      mockEvent.created_at = Date.now();

      // Add order to active orders first
      mostro['activeOrders'].set('test-order-id', {
        id: 'test-order-id',
        kind: OrderType.SELL,
        status: OrderStatus.PENDING,
        amount: 100000,
        fiat_code: 'USD',
        fiat_amount: 50,
        payment_method: 'BANK',
        premium: 5,
        created_at: Date.now(),
        expires_at: Date.now() + 24 * 60 * 60,
      });

      // Process the event
      mostro['handlePublicMessage'](mockEvent);

      // Should remove from active orders
      expect(mostro['activeOrders'].size).toBe(0);
      expect(mostro['activeOrders'].has('test-order-id')).toBe(false);
    });
  });

  describe('event handling', () => {
    it('should handle info updates', () => {
      const infoUpdateSpy = jest.spyOn(mostro, 'emit');
      const mockEvent = new NDKEvent();
      mockEvent.tags = [
        ['z', 'info'],
        ['mostro_pubkey', 'test-pubkey'],
        ['mostro_version', '1.0.0'],
        ['mostro_commit_id', 'abc123'],
        ['max_order_amount', '1000000'],
        ['min_order_amount', '1000'],
        ['expiration_hours', '24'],
        ['expiration_seconds', '900'],
        ['fee', '0.01'],
        ['hold_invoice_expiration_window', '120'],
        ['invoice_expiration_window', '120'],
      ];

      // Simulate info update
      mostro['handlePublicMessage'](mockEvent);

      expect(infoUpdateSpy).toHaveBeenCalledWith(
        'info-update',
        expect.objectContaining({
          mostro_pubkey: 'test-pubkey',
          mostro_version: '1.0.0',
          mostro_commit_id: 'abc123',
          max_order_amount: 1000000,
          min_order_amount: 1000,
          expiration_hours: 24,
          expiration_seconds: 900,
          fee: 0.01,
          hold_invoice_expiration_window: 120,
          invoice_expiration_window: 120,
        }),
      );
    });

    it('should handle private messages and pending requests', async () => {
      const mockRumor = {
        id: 'test-id',
        pubkey: 'test-pubkey',
        created_at: Date.now(),
        kind: 1,
        tags: [],
        content: JSON.stringify({
          order: {
            version: 1,
            id: 'test-order-id',
            request_id: 123,
            action: Action.NewOrder,
            created_at: Date.now(),
          },
        }),
      };

      const mockSeal = {
        id: 'test-id',
        pubkey: 'test-pubkey',
        created_at: Date.now(),
        kind: 13,
        tags: [],
        content: 'encrypted-content',
        sig: 'test-sig',
      };

      const mockGiftWrap = {
        id: 'test-id',
        pubkey: 'test-pubkey',
        created_at: Date.now(),
        kind: 1059,
        tags: [['p', 'test-pubkey']],
        content: 'encrypted-content',
        sig: 'test-sig',
      };

      // Setup a pending request
      const requestId = 123;
      const pendingRequest = {
        resolve: jest.fn(),
        reject: jest.fn(),
        timer: setTimeout(() => {}, 30000),
      };
      mostro['pendingRequests'].set(requestId, pendingRequest);

      // Handle the private message
      const privateMessageSpy = jest.spyOn(mostro, 'emit');
      mostro['handlePrivateMessage'](mockGiftWrap, mockSeal, mockRumor);

      // Should emit private-message event
      expect(privateMessageSpy).toHaveBeenCalledWith('peer-message', mockGiftWrap, mockSeal, mockRumor);

      // Should resolve the pending request
      expect(pendingRequest.resolve).toHaveBeenCalled();
      expect(mostro['pendingRequests'].has(requestId)).toBe(false);
    });

    it('should handle invalid JSON in private messages', () => {
      const mockRumor = {
        id: 'test-id',
        pubkey: 'test-pubkey',
        created_at: Date.now(),
        kind: 1,
        tags: [],
        content: 'invalid-json', // Invalid JSON content
      };

      const mockSeal = {
        id: 'test-id',
        pubkey: 'test-pubkey',
        created_at: Date.now(),
        kind: 13,
        tags: [],
        content: 'encrypted-content',
        sig: 'test-sig',
      };

      const mockGiftWrap = {
        id: 'test-id',
        pubkey: 'test-pubkey',
        created_at: Date.now(),
        kind: 1059,
        tags: [['p', 'test-pubkey']],
        content: 'encrypted-content',
        sig: 'test-sig',
      };

      // Should not throw
      expect(() => {
        mostro['handlePrivateMessage'](mockGiftWrap, mockSeal, mockRumor);
      }).not.toThrow();
    });
  });

  describe('pending request management', () => {
    it('should create pending request with timeout', () => {
      jest.useFakeTimers();

      const [requestId, promise] = mostro['createPendingRequest']();

      expect(requestId).toBe(1);
      expect(mostro['pendingRequests'].size).toBe(1);
      expect(mostro['pendingRequests'].has(requestId)).toBe(true);

      // Should timeout
      const promiseSpy = jest.fn();
      promise.catch(promiseSpy);

      jest.advanceTimersByTime(31000);

      expect(promiseSpy).toHaveBeenCalledWith(new Error('Request timed out'));
      expect(mostro['pendingRequests'].size).toBe(0);

      jest.useRealTimers();
    });

    it('should increment request IDs', () => {
      const [requestId1] = mostro['createPendingRequest']();
      const [requestId2] = mostro['createPendingRequest']();
      const [requestId3] = mostro['createPendingRequest']();

      expect(requestId1).toBe(1);
      expect(requestId2).toBe(2);
      expect(requestId3).toBe(3);
    });
  });

  describe('waitForAction', () => {
    it('should resolve when matching action and order ID are received', async () => {
      const orderId = 'test-order-id';
      const action = Action.NewOrder;

      // Create a promise that resolves when waitForAction resolves
      const waitPromise = mostro.waitForAction(action, orderId, 1000);

      // Emit a matching event
      const mockMessage: MostroMessage = {
        order: {
          version: 1,
          id: orderId,
          action: action,
          created_at: Date.now(),
        },
      };

      // Simulate the message event
      mostro.emit('mostro-message', mockMessage, new NDKEvent());

      // Wait for the promise to resolve
      const result = await waitPromise;
      expect(result).toBe(mockMessage);
    });

    it('should ignore non-matching events', async () => {
      jest.useFakeTimers();

      const orderId = 'test-order-id';
      const action = Action.NewOrder;

      // Create a promise that times out
      const waitPromise = mostro.waitForAction(action, orderId, 1000);

      // Emit a non-matching action
      const wrongAction: MostroMessage = {
        order: {
          version: 1,
          id: orderId,
          action: Action.TakeBuy, // Different action
          created_at: Date.now(),
        },
      };

      // Emit a non-matching ID
      const wrongId: MostroMessage = {
        order: {
          version: 1,
          id: 'wrong-id', // Different ID
          action: action,
          created_at: Date.now(),
        },
      };

      // Simulate the message events
      mostro.emit('mostro-message', wrongAction, new NDKEvent());
      mostro.emit('mostro-message', wrongId, new NDKEvent());

      // Advance time to trigger timeout
      jest.advanceTimersByTime(1100);

      // Wait for the promise to reject
      await expect(waitPromise).rejects.toThrow('Timeout waiting for action');

      jest.useRealTimers();
    });
  });

  describe('utility methods', () => {
    it('should get mostro public key', () => {
      mockNostr.getMyPubKey = jest.fn().mockReturnValue('test-pubkey');

      const pubkey = mostro.getMostroPublicKey(PublicKeyType.HEX);
      expect(pubkey).toBe('test-pubkey');
      expect(mockNostr.getMyPubKey).toHaveBeenCalledWith(PublicKeyType.HEX);
    });

    it('should update private key', () => {
      const newPrivKey = 'new-private-key';
      mostro.updatePrivKey(newPrivKey);

      expect(mockNostr.updatePrivKey).toHaveBeenCalledWith(newPrivKey);
    });

    it('should send direct message to peer', async () => {
      const message = 'test message';
      const destination = 'dest-pubkey';
      const tags = [['test', 'tag']];

      await mostro.submitDirectMessageToPeer(message, destination, tags);

      expect(mockNostr.sendDirectMessageToPeer).toHaveBeenCalledWith(message, destination, tags);
    });
  });

  describe('extractInfoFromEvent', () => {
    it('should extract info from event correctly', () => {
      const mockEvent = new NDKEvent();
      mockEvent.tags = [
        ['mostro_pubkey', 'test-pubkey'],
        ['mostro_version', '1.0.0'],
        ['mostro_commit_id', 'abc123'],
        ['max_order_amount', '1000000'],
        ['min_order_amount', '1000'],
        ['expiration_hours', '24'],
        ['expiration_seconds', '900'],
        ['fee', '0.01'],
        ['hold_invoice_expiration_window', '120'],
        ['invoice_expiration_window', '120'],
      ];

      const info = mostro['extractInfoFromEvent'](mockEvent);

      expect(info).toEqual({
        mostro_pubkey: 'test-pubkey',
        mostro_version: '1.0.0',
        mostro_commit_id: 'abc123',
        max_order_amount: 1000000,
        min_order_amount: 1000,
        expiration_hours: 24,
        expiration_seconds: 900,
        fee: 0.01,
        hold_invoice_expiration_window: 120,
        invoice_expiration_window: 120,
      });
    });

    it('should handle missing tags with default values', () => {
      const mockEvent = new NDKEvent();
      mockEvent.tags = [
        ['mostro_pubkey', 'test-pubkey'],
        ['mostro_version', '1.0.0'],
      ];

      const info = mostro['extractInfoFromEvent'](mockEvent);

      expect(info).toEqual(
        expect.objectContaining({
          mostro_pubkey: 'test-pubkey',
          mostro_version: '1.0.0',
          mostro_commit_id: '',
          max_order_amount: 0,
          min_order_amount: 0,
          expiration_hours: 24, // Default
          expiration_seconds: 900, // Default
          fee: 0,
          hold_invoice_expiration_window: 120, // Default
          invoice_expiration_window: 120, // Default
        }),
      );
    });

    it('should handle errors in extraction', () => {
      const mockEvent = new NDKEvent();
      mockEvent.tags = [['invalid']]; // Invalid tag format

      // Mock console.error to avoid output in tests
      const originalConsoleError = console.error;
      console.error = jest.fn();

      const info = mostro['extractInfoFromEvent'](mockEvent);

      expect(info).toBeNull();

      // Restore console.error
      console.error = originalConsoleError;
    });
  });
});
