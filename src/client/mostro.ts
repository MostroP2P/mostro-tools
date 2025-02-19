import { EventEmitter } from 'tseep';
import { NDKEvent } from '@nostr-dev-kit/ndk';
import { Nostr } from '../utils/nostr';
import {
  Action,
  NewOrder,
  Order,
  MostroInfo,
  MostroMessage,
  OrderStatus,
  OrderType
} from '../types/core';
import { GiftWrap, Rumor, Seal } from '../types/core/nostr';
import { extractOrderFromEvent, prepareNewOrder } from '../core/order';
import { KeyManager } from '../utils/key-manager';

const REQUEST_TIMEOUT = 30000; // 30 seconds

interface PendingRequest {
  resolve: (value: MostroMessage) => void;
  reject: (reason: any) => void;
  timer: NodeJS.Timeout;
}

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
  NPUB = 'npub'
}

export class Mostro extends EventEmitter<MostroEvents> {
  private nostr: Nostr;
  private keyManager?: KeyManager;
  private activeOrders: Map<string, Order> = new Map();
  private pendingRequests: Map<number, PendingRequest> = new Map();
  private nextRequestId = 1;
  private readyPromise: Promise<void>;
  private readyResolve!: () => void;

  constructor(private options: MostroOptions) {
    super();
    this.nostr = new Nostr(options.relays, options.debug || false);

    if (options.privateKey) {
      this.keyManager = new KeyManager();
      this.nostr.updatePrivKey(options.privateKey);
    }

    this.readyPromise = new Promise((resolve) => {
      this.readyResolve = resolve;
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.nostr.on('ready', this.onNostrReady.bind(this));
    this.nostr.on('public-message', this.handlePublicMessage.bind(this));
    this.nostr.on('private-message', this.handlePrivateMessage.bind(this));
  }

  private onNostrReady() {
    if (this.options.debug) {
      console.log('Mostro ready');
    }
    this.nostr.subscribeOrders(this.options.mostroPubKey);
    this.emit('ready');
    this.readyResolve();
  }

  async connect(): Promise<void> {
    await this.nostr.connect();
    return this.readyPromise;
  }

  private async handlePublicMessage(ev: NDKEvent) {
    const tags = new Map(ev.tags.map(tag => [tag[0], tag[1]]));
    const type = tags.get('z');

    if (type === 'order') {
      const order = extractOrderFromEvent(ev);
      if (order) {
        if (order.status === OrderStatus.PENDING) {
          this.activeOrders.set(order.id, order);
        } else {
          this.activeOrders.delete(order.id);
        }
        this.emit('order-update', order, ev);
      }
    } else if (type === 'info') {
      const info = this.extractInfoFromEvent(ev);
      if (info) {
        this.emit('info-update', info);
      }
    }
  }

  private async handlePrivateMessage(gift: GiftWrap, seal: Seal, rumor: Rumor) {
    this.emit('peer-message', gift, seal, rumor);

    if (this.isPendingRequest(rumor)) {
      this.handlePendingRequest(rumor);
    }
  }

  private isPendingRequest(rumor: Rumor): boolean {
    try {
      const message = JSON.parse(rumor.content);
      return message?.order?.request_id !== undefined;
    } catch {
      return false;
    }
  }

  private handlePendingRequest(rumor: Rumor) {
    try {
      const message = JSON.parse(rumor.content) as MostroMessage;
      const requestId = message.order?.request_id;

      if (requestId && this.pendingRequests.has(requestId)) {
        const { resolve, timer } = this.pendingRequests.get(requestId)!;
        clearTimeout(timer);
        this.pendingRequests.delete(requestId);
        resolve(message);
      }
    } catch (error) {
      if (this.options.debug) {
        console.error('Error handling pending request:', error);
      }
    }
  }

  async submitOrder(newOrder: NewOrder): Promise<MostroMessage> {
    if (!this.keyManager) {
      throw new Error('Key manager not initialized');
    }

    const order = prepareNewOrder(newOrder);
    const [requestId, promise] = this.createPendingRequest();

    const payload = {
      order: {
        version: 1,
        request_id: requestId,
        action: Action.NewOrder,
        content: { order }
      }
    };

    await this.nostr.createAndPublishMostroEvent(
      payload,
      this.getMostroPublicKey(PublicKeyType.HEX)
    );

    return promise;
  }

  async takeSell(order: Order, amount?: number): Promise<MostroMessage> {
    const [requestId, promise] = this.createPendingRequest();

    const payload = {
      order: {
        version: 1,
        request_id: requestId,
        action: Action.TakeSell,
        id: order.id,
        content: amount ? { amount } : null
      }
    };

    await this.nostr.createAndPublishMostroEvent(
      payload,
      this.getMostroPublicKey(PublicKeyType.HEX)
    );

    return promise;
  }

  async takeBuy(order: Order, amount?: number): Promise<MostroMessage> {
    const [requestId, promise] = this.createPendingRequest();

    const payload = {
      order: {
        version: 1,
        request_id: requestId,
        action: Action.TakeBuy,
        id: order.id,
        content: amount ? { amount } : null
      }
    };

    await this.nostr.createAndPublishMostroEvent(
      payload,
      this.getMostroPublicKey(PublicKeyType.HEX)
    );

    return promise;
  }

  async addInvoice(order: Order, invoice: string, amount?: number): Promise<MostroMessage> {
    const [requestId, promise] = this.createPendingRequest();

    const payload = {
      order: {
        version: 1,
        request_id: requestId,
        action: Action.AddInvoice,
        id: order.id,
        content: {
          payment_request: [null, invoice, amount]
        }
      }
    };

    await this.nostr.createAndPublishMostroEvent(
      payload,
      this.getMostroPublicKey(PublicKeyType.HEX)
    );

    return promise;
  }

  async release(order: Order): Promise<MostroMessage> {
    const [requestId, promise] = this.createPendingRequest();

    const payload = {
      order: {
        version: 1,
        request_id: requestId,
        action: Action.Release,
        id: order.id,
        content: null
      }
    };

    await this.nostr.createAndPublishMostroEvent(
      payload,
      this.getMostroPublicKey(PublicKeyType.HEX)
    );

    return promise;
  }

  async fiatSent(order: Order): Promise<MostroMessage> {
    const [requestId, promise] = this.createPendingRequest();

    const payload = {
      order: {
        version: 1,
        request_id: requestId,
        action: Action.FiatSent,
        id: order.id,
        content: null
      }
    };

    await this.nostr.createAndPublishMostroEvent(
      payload,
      this.getMostroPublicKey(PublicKeyType.HEX)
    );

    return promise;
  }

  async getActiveOrders(): Promise<Order[]> {
    return Array.from(this.activeOrders.values());
  }

  async waitForAction(action: Action, orderId: string, timeout: number = REQUEST_TIMEOUT): Promise<MostroMessage> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.removeListener('mostro-message', handler);
        reject(new Error(`Timeout waiting for action ${action} for order ${orderId}`));
      }, timeout);

      const handler = (mostroMessage: MostroMessage, ev: NDKEvent) => {
        if (mostroMessage.order?.action === action && mostroMessage.order.id === orderId) {
          clearTimeout(timer);
          this.removeListener('mostro-message', handler);
          resolve(mostroMessage);
        }
      };

      this.on('mostro-message', handler);
    });
  }

  private createPendingRequest(): [number, Promise<MostroMessage>] {
    const requestId = this.nextRequestId++;
    let resolver: (value: MostroMessage) => void;
    let rejecter: (reason: any) => void;

    const promise = new Promise<MostroMessage>((resolve, reject) => {
      resolver = resolve;
      rejecter = reject;
    });

    const timer = setTimeout(() => {
      this.pendingRequests.delete(requestId);
      rejecter!(new Error('Request timed out'));
    }, REQUEST_TIMEOUT);

    this.pendingRequests.set(requestId, {
      resolve: resolver!,
      reject: rejecter!,
      timer
    });

    return [requestId, promise];
  }

  private extractInfoFromEvent(ev: NDKEvent): MostroInfo | null {
    try {
      const tags = new Map(ev.tags.map(tag => [tag[0], tag[1]]));
      return {
        mostro_pubkey: tags.get('mostro_pubkey') || '',
        mostro_version: tags.get('mostro_version') || '',
        mostro_commit_id: tags.get('mostro_commit_id') || '',
        max_order_amount: Number(tags.get('max_order_amount')) || 0,
        min_order_amount: Number(tags.get('min_order_amount')) || 0,
        expiration_hours: Number(tags.get('expiration_hours')) || 24,
        expiration_seconds: Number(tags.get('expiration_seconds')) || 900,
        fee: Number(tags.get('fee')) || 0,
        hold_invoice_expiration_window: Number(tags.get('hold_invoice_expiration_window')) || 120,
        invoice_expiration_window: Number(tags.get('invoice_expiration_window')) || 120
      };
    } catch (error) {
      if (this.options.debug) {
        console.error('Error extracting info from event:', error);
      }
      return null;
    }
  }

  async submitDirectMessageToPeer(message: string, destination: string, tags: string[][]): Promise<void> {
    await this.nostr.sendDirectMessageToPeer(message, destination, tags);
  }

  getMostroPublicKey(type: PublicKeyType = PublicKeyType.NPUB): string {
    return this.nostr.getMyPubKey(type);
  }

  updatePrivKey(privKey: string): void {
    this.nostr.updatePrivKey(privKey);
    this.keyManager = new KeyManager();
  }

  getNostr(): Nostr {
    return this.nostr;
  }
}
