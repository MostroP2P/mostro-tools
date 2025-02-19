import { nip44, nip19, getPublicKey, generateSecretKey } from 'nostr-tools';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { v4 as uuidv4 } from 'uuid';

export interface KeyPair {
  privateKey: string;
  publicKey: string; //hex encoded both
}

export interface EncryptionKeys {
  conversationKey: Uint8Array;
  encryptionKey: Uint8Array;
  iv: Uint8Array;
}

export class CryptoUtils {
  static generateKeyPair(): KeyPair {
    const privateKey = generateSecretKey();
    return {
      privateKey: bytesToHex(privateKey),
      publicKey: getPublicKey(privateKey),
    };
  }
  static generateId(): string {
    return uuidv4();
  }

  static encodeKey(key: string, type: 'pub' | 'sec'): string {
    return type === 'pub' ? nip19.npubEncode(key) : nip19.nsecEncode(hexToBytes(key));
  }

  static deriveConversationKey(privateKey: string, publicKey: string): Uint8Array {
    const privKeyBytes = hexToBytes(privateKey);
    return nip44.v2.utils.getConversationKey(privKeyBytes, publicKey);
  }

  static encryptMessage(plaintext: string, privateKey: string, publicKey: string): string {
    const conversationKey = this.deriveConversationKey(privateKey, publicKey);
    return nip44.v2.encrypt(plaintext, conversationKey);
  }

  static decryptMessage(ciphertext: string, privateKey: string, publicKey: string): string {
    const conversationKey = this.deriveConversationKey(privateKey, publicKey);
    return nip44.v2.decrypt(ciphertext, conversationKey);
  }
}
