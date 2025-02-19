import { CryptoUtils, KeyPair } from '../../src/utils/crypto';
import { nip19 } from 'nostr-tools';
import { bytesToHex } from '@noble/hashes/utils';

describe('CryptoUtils', () => {
  describe('generateKeyPair', () => {
    it('should generate valid key pair', () => {
      const keyPair = CryptoUtils.generateKeyPair();

      expect(keyPair).toHaveProperty('privateKey');
      expect(keyPair).toHaveProperty('publicKey');
      expect(typeof keyPair.privateKey).toBe('string');
      expect(typeof keyPair.publicKey).toBe('string');
      expect(keyPair.privateKey).toHaveLength(64); // 32 bytes hex encoded
      expect(keyPair.publicKey).toHaveLength(64); // 32 bytes hex encoded
    });
  });

  describe('generateId', () => {
    it('should generate valid UUID', () => {
      const id = CryptoUtils.generateId();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      expect(typeof id).toBe('string');
      expect(id).toMatch(uuidRegex);
    });

    it('should generate unique IDs', () => {
      const ids = new Set();
      for (let i = 0; i < 1000; i++) {
        ids.add(CryptoUtils.generateId());
      }
      expect(ids.size).toBe(1000);
    });
  });

  describe('encodeKey', () => {
    let keyPair: KeyPair;

    beforeEach(() => {
      keyPair = CryptoUtils.generateKeyPair();
    });

    it('should encode public key to bech32 format', () => {
      const encoded = CryptoUtils.encodeKey(keyPair.publicKey, 'pub');

      expect(encoded).toMatch(/^npub1/);

      // Verify we can decode it back
      const { type, data } = nip19.decode(encoded);
      expect(type).toBe('npub');
      expect(bytesToHex(data)).toBe(keyPair.publicKey);
    });

    it('should encode private key to bech32 format', () => {
      const encoded = CryptoUtils.encodeKey(keyPair.privateKey, 'sec');

      expect(encoded).toMatch(/^nsec1/);

      // Verify we can decode it back
      const { type, data } = nip19.decode(encoded);
      expect(type).toBe('nsec');
      expect(bytesToHex(data)).toBe(keyPair.privateKey);
    });
  });

  describe('message encryption/decryption', () => {
    let aliceKeyPair: KeyPair;
    let bobKeyPair: KeyPair;
    const testMessage = 'Hello, this is a test message!';

    beforeEach(() => {
      aliceKeyPair = CryptoUtils.generateKeyPair();
      bobKeyPair = CryptoUtils.generateKeyPair();
    });

    it('should encrypt and decrypt message successfully', () => {
      // Alice encrypts message for Bob
      const encrypted = CryptoUtils.encryptMessage(
        testMessage,
        aliceKeyPair.privateKey,
        bobKeyPair.publicKey
      );

      // Bob decrypts message from Alice
      const decrypted = CryptoUtils.decryptMessage(
        encrypted,
        bobKeyPair.privateKey,
        aliceKeyPair.publicKey
      );

      expect(decrypted).toBe(testMessage);
    });

    it('should generate different ciphertexts for same plaintext', () => {
      const encrypted1 = CryptoUtils.encryptMessage(
        testMessage,
        aliceKeyPair.privateKey,
        bobKeyPair.publicKey
      );

      const encrypted2 = CryptoUtils.encryptMessage(
        testMessage,
        aliceKeyPair.privateKey,
        bobKeyPair.publicKey
      );

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should derive same conversation key for both parties', () => {
      const aliceConvKey = CryptoUtils.deriveConversationKey(
        aliceKeyPair.privateKey,
        bobKeyPair.publicKey
      );

      const bobConvKey = CryptoUtils.deriveConversationKey(
        bobKeyPair.privateKey,
        aliceKeyPair.publicKey
      );

      expect(Buffer.from(aliceConvKey).toString('hex'))
        .toBe(Buffer.from(bobConvKey).toString('hex'));
    });

    it('should throw error when decrypting with wrong keys', () => {
      const encrypted = CryptoUtils.encryptMessage(
        testMessage,
        aliceKeyPair.privateKey,
        bobKeyPair.publicKey
      );

      // Generate a new key pair (wrong keys)
      const wrongKeyPair = CryptoUtils.generateKeyPair();

      expect(() => {
        CryptoUtils.decryptMessage(
          encrypted,
          wrongKeyPair.privateKey,
          aliceKeyPair.publicKey
        );
      }).toThrow();
    });
  });
});
