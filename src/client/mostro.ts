import { EventEmitter } from 'tseep';
import { NDKEvent } from '@nostr-dev-kit/ndk';
import { Nostr } from '../utils/nostr';
import { Action, NewOrder, Order, MostroInfo, MostroMessage } from '../types/core';
import { GiftWrap, Rumor, Seal } from '../types/core/nostr';

export interface MostroEvents {
  ready: () => void;
  'order-update': (order: Order, ev: NDKEvent) => void;
  'info-update': (info: MostroInfo) => void;
  'mostro-message': (message: MostroMessage, ev: NDKEvent) => void;
  'peer-message': (gift: GiftWrap, seal: Seal, rumor: Rumor) => void;
  [key: string]: (...args: any[]) => void;
  [key: symbol]: (...args: any[]) => void;
}

export interface MostroOptions {
  mostroPubKey: string;
  relays: string[];
  privateKey?: string;
  debug?: boolean;
}

export enum PublicKeyType {
  HEX = 'hex',
  NPUB = 'npub',
}

const REQUEST_TIMEOUT = 30000; // 30 seconds

interface PendingRequest {
  resolve: (value: MostroMessage) => void;
  reject: (reason: any) => void;
  timer: NodeJS.Timeout;
}

export class Mostro extends EventEmitter<MostroEvents> {
  private nostr: Nostr;
  private debug: boolean;
  private mostroPubKey: string;
  private readyPromise: Promise<void>;
  private readyResolve!: () => void;
  private pendingRequests: Map<number, PendingRequest> = new Map();
  private nextRequestId: number = 1;

  constructor(options: MostroOptions) {
    super();
    this.mostroPubKey = options.mostroPubKey;
    this.debug = options.debug || false;

    this.nostr = new Nostr({
      relays: options.relays.join(','),
      mostroPubKey: options.mostroPubKey,
      debug: this.debug,
    });

    this.readyPromise = new Promise((resolve) => {
      this.readyResolve = resolve;
    });

    this.nostr.on('ready', this.onNostrReady.bind(this));
    this.nostr.on('public-message', this.handlePublicMessage.bind(this));
    this.nostr.on('private-message', this.handlePrivateMessage.bind(this));
  }

  private onNostrReady() {
    this.debug && console.log('Mostro ready');
    this.emit('ready');
    this.readyResolve();
  }

  private async handlePublicMessage(ev: NDKEvent) {
    // Event handling will be implemented later
    this.debug && console.log('Received public message', ev);
  }

  private async handlePrivateMessage(gift: GiftWrap, seal: Seal, rumor: Rumor) {
    this.emit('peer-message', gift, seal, rumor);
  }

  private getNextRequestId(): number {
    return this.nextRequestId++;
  }

  async connect(): Promise<void> {
    await this.nostr.connect();
    return this.readyPromise;
  }

  async waitForAction(action: Action, orderId: string, timeout: number = REQUEST_TIMEOUT): Promise<MostroMessage> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.removeListener('mostro-message', handler);
        reject(new Error(`Timeout waiting for action ${action} for order ${orderId}`));
      }, timeout);

      const handler = (mostroMessage: MostroMessage, ev: NDKEvent) => {
        if (mostroMessage.order && mostroMessage.order.action === action && mostroMessage.order.id === orderId) {
          clearTimeout(timer);
          this.removeListener('mostro-message', handler);
          resolve(mostroMessage);
        }
      };

      this.on('mostro-message', handler);
    });
  }

  async submitOrder(order: NewOrder): Promise<MostroMessage> {
    throw new Error('Not implemented');
  }

  async takeSell(order: Order, amount?: number): Promise<MostroMessage> {
    throw new Error('Not implemented');
  }

  async takeBuy(order: Order, amount?: number): Promise<MostroMessage> {
    throw new Error('Not implemented');
  }

  async addInvoice(order: Order, invoice: string, amount?: number | null): Promise<MostroMessage> {
    throw new Error('Not implemented');
  }

  async release(order: Order): Promise<MostroMessage> {
    throw new Error('Not implemented');
  }

  async fiatSent(order: Order): Promise<MostroMessage> {
    throw new Error('Not implemented');
  }

  async rateUser(order: Order, rating: number): Promise<MostroMessage> {
    throw new Error('Not implemented');
  }

  async dispute(order: Order): Promise<MostroMessage> {
    throw new Error('Not implemented');
  }

  async cancel(order: Order): Promise<MostroMessage> {
    throw new Error('Not implemented');
  }

  async submitDirectMessageToPeer(message: string, destination: string, tags: string[][]): Promise<void> {
    await this.nostr.sendDirectMessageToPeer(message, destination, tags);
  }

  getMostroPublicKey(type?: PublicKeyType): string {
    return this.nostr.getMyPubKey();
  }

  updatePrivKey(privKey: string): void {
    this.nostr.updatePrivKey(privKey);
  }

  getNostr(): Nostr {
    return this.nostr;
  }
}
