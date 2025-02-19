import { KeyManager, KeyManagerError, TradeKeyRecord } from '../../src/utils/key-manager';
import { generateMnemonic } from 'bip39';

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
      expect(keyManager.getIdentityKey()).toBeDefined();
    });

    it('should throw error when initializing twice', async () => {
      await keyManager.initialize(testMnemonic);
      await expect(keyManager.initialize(testMnemonic)).rejects.toThrow(
        new KeyManagerError('KeyManager already initialized', 'ALREADY_INITIALIZED'),
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

    it('should generate trade key with valid order ID', async () => {
      const orderId = 'test-order-1';
      const tradeKey = await keyManager.generateTradeKey(orderId);

      expect(tradeKey).toBeDefined();
      expect(typeof tradeKey).toBe('string');
      expect(tradeKey).toHaveLength(64); // 32 bytes hex encoded
    });

    it('should retrieve stored trade key', async () => {
      const orderId = 'test-order-2';
      const generatedKey = await keyManager.generateTradeKey(orderId);
      const retrievedKey = keyManager.getTradeKey(orderId);

      expect(retrievedKey).toBe(generatedKey);
    });

    it('should generate different keys for different orders', async () => {
      const key1 = await keyManager.generateTradeKey('order-1');
      const key2 = await keyManager.generateTradeKey('order-2');

      expect(key1).not.toBe(key2);
    });

    it('should correctly derive public key from private key', async () => {
      const privateKey = keyManager.getIdentityKey()!;
      const publicKey = keyManager.getPublicKeyFromPrivate(privateKey);

      expect(publicKey).toBeDefined();
      expect(publicKey).toHaveLength(64); // 32 bytes hex encoded
      expect(publicKey).not.toBe(privateKey);
    });

    it('should manage key indices correctly', async () => {
      expect(keyManager.getNextKeyIndex()).toBe(1); // First index after identity key

      await keyManager.generateTradeKey('order-1');
      expect(keyManager.getNextKeyIndex()).toBe(2);

      await keyManager.generateTradeKey('order-2');
      expect(keyManager.getNextKeyIndex()).toBe(3);
    });

    it('should derive consistent keys at specific indices', async () => {
      const index = 5;
      const key1 = await keyManager.getKeyByIndex(index);
      const key2 = await keyManager.getKeyByIndex(index);

      expect(key1).toBe(key2);
    });

    it('should correctly identify trade keys', async () => {
      const orderId = 'test-order-3';
      const tradeKey = await keyManager.generateTradeKey(orderId);
      const randomKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

      expect(await keyManager.isTradeKey(tradeKey)).toBe(true);
      expect(await keyManager.isTradeKey(randomKey)).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should throw error when accessing identity key before initialization', () => {
      expect(() => keyManager.getIdentityKey()).toThrow(KeyManagerError);
    });

    it('should throw error when generating trade key before initialization', async () => {
      await expect(keyManager.generateTradeKey('test-order')).rejects.toThrow(KeyManagerError);
    });

    it('should throw error when getting key by index before initialization', async () => {
      await expect(keyManager.getKeyByIndex(1)).rejects.toThrow(KeyManagerError);
    });

    it('should throw error with invalid private key for public key generation', () => {
      expect(() => keyManager.getPublicKeyFromPrivate('invalid-key')).toThrow(KeyManagerError);
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

  describe('deterministic key generation', () => {
    it('should generate same keys with same mnemonic', async () => {
      const manager1 = new KeyManager();
      const manager2 = new KeyManager();

      await manager1.initialize(testMnemonic);
      await manager2.initialize(testMnemonic);

      const key1 = await manager1.getKeyByIndex(1);
      const key2 = await manager2.getKeyByIndex(1);

      expect(key1).toBe(key2);
    });
  });
});
