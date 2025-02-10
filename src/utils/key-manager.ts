// src/utils/key-manager.ts
import { generateSecretKey, getPublicKey } from 'nostr-tools';
import { BIP32Interface, fromSeed } from 'bip32';
import { mnemonicToSeedSync } from '@scure/bip39';

export interface TradeKeyRecord {
  orderId: string | null;    // Null for identity key
  keyIndex: number;         // Index in derivation path
  derivedKey: string;       // Private key in hex
  createdAt: number;        // UNIX timestamp
}

export class KeyManager {
  // Constants for Mostro's derivation path
  private static readonly DERIVATION_PURPOSE = 44;
  private static readonly MOSTRO_COIN_TYPE = 1237;
  private static readonly MOSTRO_ACCOUNT = 38383;
  private static readonly CHANGE_LEVEL = 0;

  private identityKey: string | null = null;
  private tradeKeys: Map<string, TradeKeyRecord> = new Map();
  private masterNode: BIP32Interface | null = null;
  private initialized: boolean = false;

  /**
   * Initialize key manager with a mnemonic phrase
   * This generates the identity key at index 0 (m/44'/1237'/38383'/0/0)
   */
  public async initialize(mnemonic: string): Promise<void> {
    if (this.initialized) {
      throw new Error('KeyManager already initialized');
    }

    const seed = mnemonicToSeedSync(mnemonic);
    this.masterNode = fromSeed(seed);

    // Derive identity key at index 0
    this.identityKey = this.derivePrivateKey(0);

    // Store identity key record
    await this.storeTradeKey({
      orderId: null,
      keyIndex: 0,
      derivedKey: this.identityKey,
      createdAt: Date.now()
    });

    this.initialized = true;
  }

  /**
   * Derive a private key following Mostro's path: m/44'/1237'/38383'/0/index
   */
  private derivePrivateKey(index: number): string {
    if (!this.masterNode) {
      throw new Error('Key manager not initialized');
    }

    const derived = this.masterNode
      .deriveHardened(KeyManager.DERIVATION_PURPOSE)    // 44'
      .deriveHardened(KeyManager.MOSTRO_COIN_TYPE)      // 1237'
      .deriveHardened(KeyManager.MOSTRO_ACCOUNT)        // 38383'
      .derive(KeyManager.CHANGE_LEVEL)                  // 0
      .derive(index);                                   // index

    if (!derived.privateKey) {
      throw new Error('Failed to derive private key');
    }

    return derived.privateKey.toString('hex');
  }

  /**
   * Generate new trade key for an order starting at index 1
   */
  public async generateTradeKey(orderId: string): Promise<string> {
    if (!this.initialized) {
      throw new Error('Key manager not initialized');
    }

    // Get next available index (starting from 1 since 0 is identity)
    const nextIndex = Math.max(
      1,
      Math.max(...Array.from(this.tradeKeys.values()).map(k => k.keyIndex)) + 1
    );

    const privateKey = this.derivePrivateKey(nextIndex);

    await this.storeTradeKey({
      orderId,
      keyIndex: nextIndex,
      derivedKey: privateKey,
      createdAt: Date.now()
    });

    return privateKey;
  }

  public getIdentityKey(): string | null {
    return this.identityKey;
  }

  public getTradeKey(orderId: string): string | undefined {
    return this.tradeKeys.get(orderId)?.derivedKey;
  }

  public getPublicKeyFromPrivate(privateKey: string): string {
    return getPublicKey(Buffer.from(privateKey, 'hex'));
  }

  private async storeTradeKey(record: TradeKeyRecord): Promise<void> {
    this.tradeKeys.set(record.orderId || 'identity', record);
  }
}
