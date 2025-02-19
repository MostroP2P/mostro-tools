import { EventEmitter } from 'tseep';
import { Event as NostrEvent, finalizeEvent, getPublicKey, generateSecretKey, nip19 } from 'nostr-tools';
import { nip44 } from 'nostr-tools';
import NDK, { NDKEvent, NDKKind, NDKSubscription } from '@nostr-dev-kit/ndk';
import { PublicKeyType } from '../client/mostro';

export const NOSTR_REPLACEABLE_EVENT_KIND = 38383 as NDKKind;
export interface Rumor extends Omit<NostrEvent, 'sig'> {
  id: string;
}

export interface Seal extends NostrEvent {
  kind: 13;
}

export interface GiftWrap extends NostrEvent {
  kind: 1059;
}

export type GiftWrapContent = {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig?: string;
};

export class Nostr extends EventEmitter {
  private ndk: NDK;
  private subscriptions: Map<number, NDKSubscription> = new Map();
  private initialized: boolean = false;
  private privateKey?: string;

  constructor(
    private relays: string[],
    private debug: boolean = false,
  ) {
    super();
    this.ndk = new NDK({
      explicitRelayUrls: relays,
    });

    // Set up NDK event handlers
    this.ndk.pool.on('connect', () => this.emit('ready'));
  }

  async connect(): Promise<void> {
    if (!this.initialized) {
      await this.ndk.connect();
      this.initialized = true;
    }
  }

  subscribeOrders(mostroPubKey: string): NDKSubscription {
    if (!this.initialized) {
      throw new Error('Nostr not initialized');
    }

    const subscription = this.ndk.subscribe(
      {
        kinds: [NOSTR_REPLACEABLE_EVENT_KIND],
        authors: [mostroPubKey],
        since: Math.floor(Date.now() / 1000) - 24 * 60 * 60 * 14,
      },
      { closeOnEose: false },
    );

    subscription.on('event', (event: NDKEvent) => {
      this.emit('public-message', event);
    });

    // Update this line as well
    this.subscriptions.set(NOSTR_REPLACEABLE_EVENT_KIND, subscription);
    return subscription;
  }

  createGiftWrapEvent(content: GiftWrapContent, senderPrivateKey: Uint8Array, recipientPublicKey: string): GiftWrap {
    const randomPrivKey = generateSecretKey();
    return finalizeEvent(
      {
        kind: 1059,
        content: this.encryptContent(content, randomPrivKey, recipientPublicKey),
        created_at: this.randomTimestamp(),
        tags: [['p', recipientPublicKey]],
      },
      randomPrivKey,
    ) as GiftWrap;
  }

  private encryptContent(content: object, privateKey: Uint8Array, recipientPublicKey: string): string {
    const conversationKey = nip44.v2.utils.getConversationKey(privateKey, recipientPublicKey);
    return nip44.v2.encrypt(JSON.stringify(content), conversationKey);
  }

  private randomTimestamp(): number {
    const TWO_DAYS = 2 * 24 * 60 * 60;
    return Math.floor(Date.now() / 1000 - Math.random() * TWO_DAYS);
  }

  async publish(event: NostrEvent): Promise<void> {
    if (!this.initialized) {
      throw new Error('Nostr not initialized');
    }
    const ndkEvent = new NDKEvent(this.ndk, event);
    await ndkEvent.publish();
  }

  // New methods required by Mostro client
  async createAndPublishMostroEvent(payload: any, recipientPublicKey: string): Promise<void> {
    if (!this.privateKey) {
      throw new Error('Private key not set');
    }

    const content: GiftWrapContent = {
      id: generateSecretKey().toString(),
      pubkey: getPublicKey(Buffer.from(this.privateKey, 'hex')),
      created_at: this.randomTimestamp(),
      kind: 1,
      tags: [],
      content: JSON.stringify(payload),
    };

    const giftWrap = this.createGiftWrapEvent(content, Buffer.from(this.privateKey, 'hex'), recipientPublicKey);

    await this.publish(giftWrap);
  }

  async sendDirectMessageToPeer(message: string, destination: string, tags: string[][]): Promise<void> {
    if (!this.privateKey) {
      throw new Error('Private key not set');
    }

    const event = finalizeEvent(
      {
        kind: 4,
        created_at: Math.floor(Date.now() / 1000),
        content: message,
        tags: [['p', destination], ...tags],
      },
      Buffer.from(this.privateKey, 'hex'),
    );

    await this.publish(event);
  }

  updatePrivKey(privKey: string): void {
    this.privateKey = privKey;
  }

  getMyPubKey(type: PublicKeyType = PublicKeyType.NPUB): string {
    if (!this.privateKey) {
      throw new Error('Private key not set');
    }

    const pubkey = getPublicKey(Buffer.from(this.privateKey, 'hex'));
    return type === PublicKeyType.NPUB ? nip19.npubEncode(pubkey) : pubkey;
  }
}
