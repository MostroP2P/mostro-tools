import { Nostr, NOSTR_REPLACEABLE_EVENT_KIND } from '../../src/utils/nostr';
import { Event as NostrEvent, getPublicKey, generateSecretKey } from 'nostr-tools';
import NDK, { NDKEvent, NDKSubscription } from '@nostr-dev-kit/ndk';
import { PublicKeyType } from '../../src/client/mostro';

// Mock NDK and its dependencies
jest.mock('@nostr-dev-kit/ndk');

describe('Nostr', () => {
  let nostr: Nostr;
  const testRelays = ['wss://relay1.test', 'wss://relay2.test'];
  const mockPrivateKey = Buffer.from(generateSecretKey()).toString('hex');
  const mockPublicKey = getPublicKey(Buffer.from(mockPrivateKey, 'hex'));

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create new instance
    nostr = new Nostr(testRelays, true); // Debug mode on
  });

  describe('initialization', () => {
    it('should create instance with relays', () => {
      expect(nostr).toBeInstanceOf(Nostr);
      expect(NDK).toHaveBeenCalledWith({
        explicitRelayUrls: testRelays,
      });
    });

    it('should set up event handlers', () => {
      const mockPoolOn = jest.fn();

      (NDK as jest.Mock).mockImplementation(() => ({
        pool: {
          on: mockPoolOn,
        },
      }));

      const testNostr = new Nostr(testRelays);

      // Should register connect handler
      expect(mockPoolOn).toHaveBeenCalledWith('connect', expect.any(Function));
    });

    it('should connect successfully', async () => {
      const mockConnect = jest.fn().mockResolvedValue(undefined);

      (NDK as jest.Mock).mockImplementation(() => ({
        connect: mockConnect,
        pool: {
          on: jest.fn(),
        },
      }));

      await nostr.connect();
      expect(mockConnect).toHaveBeenCalled();
    });
  });

  describe('subscriptions', () => {
    let mockSubscription: any;

    beforeEach(() => {
      mockSubscription = {
        on: jest.fn(),
      };

      const mockSubscribe = jest.fn().mockReturnValue(mockSubscription);

      (NDK as jest.Mock).mockImplementation(() => ({
        subscribe: mockSubscribe,
        pool: {
          on: jest.fn(),
        },
        connect: jest.fn().mockResolvedValue(undefined),
      }));
    });

    it('should create order subscription with correct filters', async () => {
      await nostr.connect();
      const mostroPublicKey = 'test-pubkey';
      nostr.subscribeOrders(mostroPublicKey);

      // Get the NDK instance created in the constructor
      const ndk = (NDK as jest.Mock).mock.instances[0];

      // Check if the right subscription was created
      expect(ndk.subscribe).toHaveBeenCalledWith(
        {
          kinds: [NOSTR_REPLACEABLE_EVENT_KIND],
          authors: [mostroPublicKey],
          since: expect.any(Number),
        },
        { closeOnEose: false }
      );
    });

    it('should set up event handlers for subscription', async () => {
      await nostr.connect();
      nostr.subscribeOrders('test-pubkey');

      // Should set up event and eose handlers
      expect(mockSubscription.on).toHaveBeenCalledWith('event', expect.any(Function));
    });

    it('should handle subscription events', async () => {
      const mockEmit = jest.spyOn(nostr, 'emit');
      const mockEvent = new NDKEvent();

      await nostr.connect();
      nostr.subscribeOrders('test-pubkey');

      // Find and call the event handler
      const eventHandler = mockSubscription.on.mock.calls.find(call => call[0] === 'event')[1];
      eventHandler(mockEvent);

      // Should emit public-message event
      expect(mockEmit).toHaveBeenCalledWith('public-message', mockEvent);
    });

    it('should throw if not initialized when subscribing', () => {
      expect(() => {
        nostr.subscribeOrders('test-pubkey');
      }).toThrow('Nostr not initialized');
    });
  });

  describe('gift wrap creation', () => {
    beforeEach(async () => {
      // Mock the connect method
      (NDK as jest.Mock).mockImplementation(() => ({
        pool: { on: jest.fn() },
        connect: jest.fn().mockResolvedValue(undefined),
      }));

      await nostr.connect();

      // Mark as initialized
      nostr['initialized'] = true;
    });

    it('should create valid gift wrap event', () => {
      const content = {
        id: 'test-id',
        pubkey: mockPublicKey,
        created_at: Math.floor(Date.now() / 1000),
        kind: 1,
        tags: [],
        content: 'test content',
      };

      const giftWrap = nostr.createGiftWrapEvent(content, Buffer.from(mockPrivateKey, 'hex'), mockPublicKey);

      expect(giftWrap.kind).toBe(1059);
      expect(giftWrap.tags).toContainEqual(['p', mockPublicKey]);
      expect(giftWrap.content).toBeDefined();
      expect(giftWrap.sig).toBeDefined();
    });

    it('should use random timestamps when creating gift wraps', () => {
      const now = Math.floor(Date.now() / 1000);
      const content = {
        id: 'test-id',
        pubkey: mockPublicKey,
        created_at: now,
        kind: 1,
        tags: [],
        content: 'test content',
      };

      const giftWrap = nostr.createGiftWrapEvent(content, Buffer.from(mockPrivateKey, 'hex'), mockPublicKey);

      // The created_at should be different from the current time but not by more than 2 days
      expect(giftWrap.created_at).not.toBe(now);
      expect(giftWrap.created_at).toBeLessThanOrEqual(now);
      expect(giftWrap.created_at).toBeGreaterThanOrEqual(now - 2 * 24 * 60 * 60);
    });

    it('should encrypt content correctly', () => {
      const content = {
        id: 'test-id',
        pubkey: mockPublicKey,
        created_at: Math.floor(Date.now() / 1000),
        kind: 1,
        tags: [],
        content: 'test content',
      };

      const giftWrap = nostr.createGiftWrapEvent(content, Buffer.from(mockPrivateKey, 'hex'), mockPublicKey);

      // The encrypted content should be different from the original
      expect(giftWrap.content).not.toBe(JSON.stringify(content));
      // The encrypted content should be a string
      expect(typeof giftWrap.content).toBe('string');
      // The encrypted content should not be empty
      expect(giftWrap.content.length).toBeGreaterThan(0);
    });
  });

  describe('publishing', () => {
    beforeEach(async () => {
      const mockPublish = jest.fn().mockResolvedValue(undefined);

      (NDKEvent as unknown as jest.Mock).mockImplementation(() => ({
        publish: mockPublish,
      }));

      (NDK as jest.Mock).mockImplementation(() => ({
        pool: { on: jest.fn() },
        connect: jest.fn().mockResolvedValue(undefined),
      }));

      await nostr.connect();
      nostr['initialized'] = true;
    });

    it('should publish event successfully', async () => {
      const event: NostrEvent = {
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        content: 'test',
        tags: [],
        pubkey: mockPublicKey,
        id: 'test-id',
        sig: 'test-sig',
      };

      await nostr.publish(event);

      // Should create NDKEvent with the event
      expect(NDKEvent).toHaveBeenCalledWith(expect.anything(), event);

      // Should call publish on the NDKEvent
      const ndkEventInstance = (NDKEvent as unknown as jest.Mock).mock.instances[0];
      expect(ndkEventInstance.publish).toHaveBeenCalled();
    });

    it('should throw error when publishing without initialization', async () => {
      const uninitializedNostr = new Nostr(testRelays);

      const event: NostrEvent = {
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        content: 'test',
        tags: [],
        pubkey: mockPublicKey,
        id: 'test-id',
        sig: 'test-sig',
      };

      await expect(uninitializedNostr.publish(event)).rejects.toThrow('Nostr not initialized');
    });
  });

  describe('mostro communication', () => {
    beforeEach(async () => {
      (NDK as jest.Mock).mockImplementation(() => ({
        pool: { on: jest.fn() },
        connect: jest.fn().mockResolvedValue(undefined),
      }));

      await nostr.connect();
      nostr['initialized'] = true;
      nostr.updatePrivKey(mockPrivateKey);
    });

    it('should create and publish mostro event', async () => {
      const spy = jest.spyOn(nostr, 'createGiftWrapEvent').mockReturnValue({
        kind: 1059,
        pubkey: 'random-pubkey',
        created_at: Math.floor(Date.now() / 1000),
        tags: [['p', 'recipient-pubkey']],
        content: 'encrypted-content',
        sig: 'signature',
      });

      const publishSpy = jest.spyOn(nostr, 'publish').mockResolvedValue(undefined);

      const payload = { test: 'payload' };
      const recipientPubKey = 'recipient-pubkey';

      await nostr.createAndPublishMostroEvent(payload, recipientPubKey);

      expect(spy).toHaveBeenCalled();
      expect(publishSpy).toHaveBeenCalled();
    });

    it('should throw error without private key', async () => {
      nostr.updatePrivKey(''); // Clear private key

      const payload = { test: 'payload' };
      const recipientPubKey = 'recipient-pubkey';

      await expect(nostr.createAndPublishMostroEvent(payload, recipientPubKey)).rejects.toThrow('Private key not set');
    });

    it('should send direct message to peer', async () => {
      const publishSpy = jest.spyOn(nostr, 'publish').mockResolvedValue(undefined);

      const message = 'test-message';
      const destination = 'destination-pubkey';
      const tags = [['test', 'tag']];

      await nostr.sendDirectMessageToPeer(message, destination, tags);

      expect(publishSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 4,
          content: message,
          tags: expect.arrayContaining([
            ['p', destination],
            ['test', 'tag'],
          ]),
        })
      );
    });
  });

  describe('key management', () => {
    it('should update private key', () => {
      nostr.updatePrivKey(mockPrivateKey);
      expect(nostr['privateKey']).toBe(mockPrivateKey);
    });

    it('should get public key in different formats', () => {
      nostr.updatePrivKey(mockPrivateKey);

      const hexPubKey = nostr.getMyPubKey(PublicKeyType.HEX);
      expect(hexPubKey).toBe(mockPublicKey);

      const npubPubKey = nostr.getMyPubKey(PublicKeyType.NPUB);
      expect(npubPubKey).toMatch(/^npub/);
    });

    it('should throw error when getting pubkey without private key', () => {
      expect(() => nostr.getMyPubKey()).toThrow('Private key not set');
    });
  });
});
