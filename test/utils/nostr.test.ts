import { Nostr, NOSTR_REPLACEABLE_EVENT_KIND } from '../../src/utils/nostr';
import { Event as NostrEvent, getPublicKey, generateSecretKey } from 'nostr-tools';
import NDK, { NDKEvent, NDKSubscription } from '@nostr-dev-kit/ndk';
import { PublicKeyType } from '../../src/client/mostro';

// Mock NDK
jest.mock('@nostr-dev-kit/ndk');

describe('Nostr', () => {
  let nostr: Nostr;
  const testRelays = ['wss://relay1.test', 'wss://relay2.test'];
  const mockPrivateKey = generateSecretKey();
  const mockPublicKey = getPublicKey(mockPrivateKey);

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create new instance
    nostr = new Nostr(testRelays);
  });

  describe('initialization', () => {
    it('should create instance with relays', () => {
      expect(nostr).toBeInstanceOf(Nostr);
      expect(NDK).toHaveBeenCalledWith({
        explicitRelayUrls: testRelays,
      });
    });

    it('should connect successfully', async () => {
      const mockConnect = jest.fn();
      (NDK as jest.Mock).mockImplementation(() => ({
        connect: mockConnect,
        pool: {
          on: jest.fn(),
        },
      }));

      await nostr.connect();
      expect(mockConnect).toHaveBeenCalled();
    });

    it('should emit ready event when pool connects', () => {
      const mockOn = jest.fn();
      const mockEmit = jest.fn();

      (NDK as jest.Mock).mockImplementation(() => ({
        pool: {
          on: mockOn,
        },
      }));

      nostr.emit = mockEmit;

      // Trigger the connect event
      const connectCallback = mockOn.mock.calls.find((call) => call[0] === 'connect')[1];
      connectCallback();

      expect(mockEmit).toHaveBeenCalledWith('ready');
    });
  });

  describe('subscriptions', () => {
    it('should create order subscription', async () => {
      const mockSubscribe = jest.fn().mockReturnValue({
        on: jest.fn(),
      });

      (NDK as jest.Mock).mockImplementation(() => ({
        subscribe: mockSubscribe,
        pool: {
          on: jest.fn(),
        },
      }));

      await nostr.connect();
      const subscription = nostr.subscribeOrders(mockPublicKey);

      expect(mockSubscribe).toHaveBeenCalledWith(
        {
          kinds: [NOSTR_REPLACEABLE_EVENT_KIND],
          authors: [mockPublicKey],
          since: expect.any(Number),
        },
        { closeOnEose: false },
      );
      expect(subscription).toBeDefined();
    });

    it('should emit public-message on subscription event', async () => {
      const mockEvent = new NDKEvent(null as any);
      const mockOn = jest.fn();
      const mockEmit = jest.fn();

      (NDK as jest.Mock).mockImplementation(() => ({
        subscribe: () => ({
          on: mockOn,
        }),
        pool: {
          on: jest.fn(),
        },
      }));

      nostr.emit = mockEmit;
      await nostr.connect();
      nostr.subscribeOrders(mockPublicKey);

      // Find and execute the event callback
      const eventCallback = mockOn.mock.calls.find((call) => call[0] === 'event')[1];
      eventCallback(mockEvent);

      expect(mockEmit).toHaveBeenCalledWith('public-message', mockEvent);
    });
  });

  describe('gift wrap creation', () => {
    it('should create valid gift wrap event', () => {
      const content = {
        id: 'test-id',
        pubkey: mockPublicKey,
        created_at: Math.floor(Date.now() / 1000),
        kind: 1,
        tags: [],
        content: 'test content',
      };

      const giftWrap = nostr.createGiftWrapEvent(content, mockPrivateKey, mockPublicKey);

      expect(giftWrap.kind).toBe(1059);
      expect(giftWrap.tags).toContainEqual(['p', mockPublicKey]);
      expect(giftWrap.content).toBeDefined();
      expect(giftWrap.sig).toBeDefined();
    });
  });

  describe('publishing', () => {
    it('should publish event successfully', async () => {
      const mockPublish = jest.fn();

      (NDK as jest.Mock).mockImplementation(() => ({
        pool: {
          on: jest.fn(),
        },
      }));

      (NDKEvent as unknown as jest.Mock).mockImplementation(() => ({
        publish: mockPublish,
      }));

      await nostr.connect();

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
      expect(mockPublish).toHaveBeenCalled();
    });

    it('should throw error when publishing without initialization', async () => {
      const event: NostrEvent = {
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        content: 'test',
        tags: [],
        pubkey: mockPublicKey,
        id: 'test-id',
        sig: 'test-sig',
      };

      await expect(nostr.publish(event)).rejects.toThrow('Nostr not initialized');
    });
  });

  describe('key management', () => {
    it('should update private key', () => {
      const privKey = Buffer.from(mockPrivateKey).toString('hex');
      nostr.updatePrivKey(privKey);
      expect(nostr.getMyPubKey(PublicKeyType.HEX)).toBeDefined();
    });

    it('should get public key in different formats', () => {
      const privKey = Buffer.from(mockPrivateKey).toString('hex');
      nostr.updatePrivKey(privKey);

      const hexPubKey = nostr.getMyPubKey(PublicKeyType.HEX);
      const npubPubKey = nostr.getMyPubKey(PublicKeyType.NPUB);

      expect(hexPubKey).toHaveLength(64);
      expect(npubPubKey).toMatch(/^npub1/);
    });

    it('should throw error when getting pubkey without private key', () => {
      expect(() => nostr.getMyPubKey()).toThrow('Private key not set');
    });
  });

  describe('direct messaging', () => {
    it('should send direct message successfully', async () => {
      const mockPublish = jest.fn();
      nostr.publish = mockPublish;
      nostr.updatePrivKey(Buffer.from(mockPrivateKey).toString('hex'));

      await nostr.sendDirectMessageToPeer('test message', mockPublicKey, [['test', 'tag']]);

      expect(mockPublish).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 4,
          content: expect.any(String),
          tags: expect.arrayContaining([
            ['p', mockPublicKey],
            ['test', 'tag'],
          ]),
        }),
      );
    });

    it('should throw error when sending DM without private key', async () => {
      await expect(nostr.sendDirectMessageToPeer('test message', mockPublicKey, [])).rejects.toThrow(
        'Private key not set',
      );
    });
  });
});
