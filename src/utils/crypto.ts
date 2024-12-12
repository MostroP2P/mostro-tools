import { nip44 } from 'nostr-tools';

/**
 * Derive a shared conversation key using NIP-44.
 * @param privateKey Sender's private key (Uint8Array)
 * @param publicKey Receiver's public key (string)
 * @returns The derived conversation key
 */
export function deriveConversationKey(privateKey: Uint8Array, publicKey: string): Uint8Array {
  return nip44.getConversationKey(privateKey, publicKey);
}

/**
 * Encrypt a plaintext message using the conversation key derived from NIP-44.
 * @param plaintext The plaintext message to encrypt
 * @param privateKey Sender's private key
 * @param publicKey Receiver's public key
 * @returns The encrypted message as a Base64 string
 */
export function encryptMessage(plaintext: string, privateKey: Uint8Array, publicKey: string): string {
  const conversationKey = deriveConversationKey(privateKey, publicKey);
  return nip44.encrypt(plaintext, conversationKey);
}

/**
 * Decrypt an encrypted message using the conversation key derived from NIP-44.
 * @param encryptedMessage The encrypted message as a Base64 string
 * @param privateKey Receiver's private key
 * @param senderPublicKey Sender's public key
 * @returns The decrypted plaintext
 */
export function decryptMessage(encryptedMessage: string, privateKey: Uint8Array, senderPublicKey: string): string {
  const conversationKey = deriveConversationKey(privateKey, senderPublicKey);
  return nip44.decrypt(encryptedMessage, conversationKey);
}
