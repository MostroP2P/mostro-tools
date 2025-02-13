import { BIP32Factory } from 'bip32';
import * as ecc from 'tiny-secp256k1';
import { mnemonicToSeedSync } from 'bip39';
import { getPublicKey } from 'nostr-tools';

const bip32 = BIP32Factory(ecc);

export class KeyManagerError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'KeyManagerError';
  }
}

export interface TradeKeyRecord {
  orderId: string | null;    // Null for identity key
  keyIndex: number;         // Index in derivation path
  derivedKey: string;       // Private key in hex
  createdAt: number;        // UNIX timestamp
  fingerprint?: string;     // Optional BIP32 fingerprint for verification
}

export class KeyManager {
  private static readonly DERIVATION_PURPOSE = 44;
  private static readonly MOSTRO_COIN_TYPE = 1237;
  private static readonly MOSTRO_ACCOUNT = 38383;
  private static readonly CHANGE_LEVEL = 0;

  private identityKey: string | null = null;
  private tradeKeys: Map<string, TradeKeyRecord> = new Map();
  private masterNode: ReturnType<typeof bip32.fromSeed> | null = null;
  private initialized: boolean = false;


  public async initialize(mnemonic: string): Promise<void> {
    if (this.initialized) {
      throw new KeyManagerError('KeyManager already initialized', 'ALREADY_INITIALIZED');
    }

    try {
      const seed = mnemonicToSeedSync(mnemonic);
      this.masterNode = bip32.fromSeed(seed);

      // Derive identity key at index 0
      this.identityKey = this.derivePrivateKey(0);

      // Store identity key record
      await this.storeTradeKey({
        orderId: null,
        keyIndex: 0,
        derivedKey: this.identityKey,
        createdAt: Date.now(),
        fingerprint: this.masterNode.fingerprint.toString()
      });

      this.initialized = true;
    } catch (error) {
      throw new KeyManagerError(
        `Failed to initialize key manager: ${error}`,
        'INITIALIZATION_FAILED'
      );
    }
  }


  private derivePrivateKey(index: number): string {
    if (!this.masterNode) {
      throw new KeyManagerError('Key manager not initialized', 'NOT_INITIALIZED');
    }

    try {
      const derived = this.masterNode
        .deriveHardened(KeyManager.DERIVATION_PURPOSE)    // 44'
        .deriveHardened(KeyManager.MOSTRO_COIN_TYPE)      // 1237'
        .deriveHardened(KeyManager.MOSTRO_ACCOUNT)        // 38383'
        .derive(KeyManager.CHANGE_LEVEL)                  // 0
        .derive(index);                                   // index

      if (!derived.privateKey) {
        throw new KeyManagerError('Failed to derive private key', 'DERIVATION_FAILED');
      }

      return derived.privateKey.toString();
    } catch (error) {
      throw new KeyManagerError(
        `Failed to derive key at index ${index}: ${error}`,
        'DERIVATION_FAILED'
      );
    }
  }


  public async generateTradeKey(orderId: string): Promise<string> {
    if (!this.initialized) {
      throw new KeyManagerError('Key manager not initialized', 'NOT_INITIALIZED');
    }

    try {
      const nextIndex = this.getNextKeyIndex();
      const privateKey = this.derivePrivateKey(nextIndex);
      const fingerprint = this.masterNode?.fingerprint?.toString() ?? '';

      await this.storeTradeKey({
        orderId,
        keyIndex: nextIndex,
        derivedKey: privateKey,
        createdAt: Date.now(),
        fingerprint
      });

      return privateKey;
    } catch (error) {
      throw new KeyManagerError(
        `Failed to generate trade key: ${error}`,
        'TRADE_KEY_GENERATION_FAILED'
      );
    }
  }


  public getIdentityKey(): string | null {
    if (!this.initialized) {
      throw new KeyManagerError('Key manager not initialized', 'NOT_INITIALIZED');
    }
    return this.identityKey;
  }


  public getTradeKey(orderId: string): string | undefined {
    if (!this.initialized) {
      throw new KeyManagerError('Key manager not initialized', 'NOT_INITIALIZED');
    }
    return this.tradeKeys.get(orderId)?.derivedKey;
  }


  public getPublicKeyFromPrivate(privateKey: string): string {
    try {
      return getPublicKey(Buffer.from(privateKey, 'hex'));
    } catch (error) {
      throw new KeyManagerError(
        `Failed to get public key: ${error}`,
        'PUBLIC_KEY_GENERATION_FAILED'
      );
    }
  }


  public async getKeyByIndex(index: number): Promise<string | undefined> {
    if (!this.initialized) {
      throw new KeyManagerError('Key manager not initialized', 'NOT_INITIALIZED');
    }
    return this.derivePrivateKey(index);
  }


  public async isTradeKey(key: string): Promise<boolean> {
    for (const record of this.tradeKeys.values()) {
      if (record.derivedKey === key) return true;
    }
    return false;
  }


  public getNextKeyIndex(): number {
    const indices = Array.from(this.tradeKeys.values()).map(k => k.keyIndex);
    return indices.length > 0 ? Math.max(...indices) + 1 : 1;
  }


  private async storeTradeKey(record: TradeKeyRecord): Promise<void> {
    this.tradeKeys.set(record.orderId || 'identity', record);
  }


  public clear(): void {
    this.identityKey = null;
    this.tradeKeys.clear();
    this.masterNode = null;
    this.initialized = false;
  }
}
