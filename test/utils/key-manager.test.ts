import { KeyManager, KeyManagerError } from '../../src/utils/key-manager';
import { mnemonicToSeedSync, generateMnemonic } from 'bip39';
import { getPublicKey } from 'nostr-tools';

describe('KeyManager', () => {
  let keyManager: KeyManager;
  const testMnemonic = generateMnemonic();

  beforeEach(() => {
    keyManager = new KeyManager();
  });

  afterEach(() => {
    keyManager.clear();
  });

  describe('initialization', () => {
    it('should initialize successfully with valid mnemonic', async () => {
      await expect(keyManager.initialize(testMnemonic)).resolves.not.toThrow();
      expect(keyManager.getIdentityKey()).not.toBeNull();
    });

    it('should throw error when initializing twice', async () => {
      await keyManager.initialize(testMnemonic);
      await expect(keyManager.initialize(testMnemonic)).rejects.toThrow(
        new KeyManagerError('KeyManager already initialized', 'ALREADY_INITIALIZED')
      );
    });

    it('should throw error with invalid mnemonic', async () => {
      await expect(keyManager.initialize('invalid mnemonic')).rejects.toThrow(KeyManagerError);
    });
  });

  describe('key generation and management', () => {
    beforeEach(async () => {
      await keyManager.initialize(testMnemonic);
    });

    it('should generate identity key at index 0', () => {
      const identityKey = keyManager.getIdentityKey();
      expect(identityKey).toBeDefined();
      expect(typeof identityKey).toBe('string');
      expect(identityKey?.length).toBe(64);
    });

    it('should generate trade key with valid order ID', async () => {
      const orderId = 'test-order-1';
      const tradeKey = await keyManager.generateTradeKey(orderId);

      expect(tradeKey).toBeDefined();
      expect(typeof tradeKey).toBe('string');
      expect(tradeKey).toHaveLength(64);


      const retrievedKey = keyManager.getTradeKey(orderId);
      expect(retrievedKey).toBe(tradeKey);
    });

    it('should generate different keys for different orders', async () => {
      const key1 = await keyManager.generateTradeKey('order-1');
      const key2 = await keyManager.generateTradeKey('order-2');

      expect(key1).not.toBe(key2);
    });

    it('should correctly derive public key from private key', () => {
      const privateKey = keyManager.getIdentityKey()!;
      const publicKey = keyManager.getPublicKeyFromPrivate(privateKey);

      expect(publicKey).toBeDefined();
      expect(publicKey).toHaveLength(64);


      const expectedPublicKey = getPublicKey(Buffer.from(privateKey, 'hex'));
      expect(publicKey).toBe(expectedPublicKey);
    });

    it('should throw error with invalid private key for public key generation', () => {
      expect(() => keyManager.getPublicKeyFromPrivate('invalid-key')).toThrow(KeyManagerError);
    });

    it('should manage key indices correctly', async () => {
      expect(keyManager.getNextKeyIndex()).toBe(1); // First index after identity key

      await keyManager.generateTradeKey('order-1');
      expect(keyManager.getNextKeyIndex()).toBe(2);

      await keyManager.generateTradeKey('order-2');
      expect(keyManager.getNextKeyIndex()).toBe(3);
    });

    it('should correctly identify trade keys', async () => {
      const orderId = 'test-order-3';
      const tradeKey = await keyManager.generateTradeKey(orderId);
      const randomKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

      expect(await keyManager.isTradeKey(tradeKey)).toBe(true);
      expect(await keyManager.isTradeKey(randomKey)).toBe(false);
    });

    it('should retrieve key by index', async () => {
      const index = 5;
      const key = await keyManager.getKeyByIndex(index);

      expect(key).toBeDefined();
      expect(typeof key).toBe('string');
      expect(key).toHaveLength(64);

      const sameKey = await keyManager.getKeyByIndex(index);
      expect(sameKey).toBe(key);
    });

    it('should produce deterministic keys', async () => {
      const manager1 = new KeyManager();
      const manager2 = new KeyManager();

      await manager1.initialize(testMnemonic);
      await manager2.initialize(testMnemonic);

      const key1 = await manager1.getKeyByIndex(10);
      const key2 = await manager2.getKeyByIndex(10);

      expect(key1).toBe(key2);
    });

    it('should follow the correct derivation path', async () => {
      const seed = mnemonicToSeedSync(testMnemonic);
      const key = await keyManager.getKeyByIndex(1);

      expect(key).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('error handling', () => {
    it('should throw error when accessing identity key before initialization', () => {
      expect(() => keyManager.getIdentityKey()).toThrow(
        new KeyManagerError('Key manager not initialized', 'NOT_INITIALIZED')
      );
    });

    it('should throw error when generating trade key before initialization', async () => {
      await expect(keyManager.generateTradeKey('test-order')).rejects.toThrow(
        new KeyManagerError('Key manager not initialized', 'NOT_INITIALIZED')
      );
    });

    it('should throw error when getting key by index before initialization', async () => {
      await expect(keyManager.getKeyByIndex(1)).rejects.toThrow(
        new KeyManagerError('Key manager not initialized', 'NOT_INITIALIZED')
      );
    });
  });

  describe('clear functionality', () => {
    it('should clear all stored keys and state', async () => {
      await keyManager.initialize(testMnemonic);
      await keyManager.generateTradeKey('test-order');

      keyManager.clear();

      expect(() => keyManager.getIdentityKey()).toThrow(KeyManagerError);
      expect(keyManager.getTradeKey('test-order')).toBeUndefined();
    });
  });
});
