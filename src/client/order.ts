import { KeyManager } from '../utils/key-manager';
import { Order, NewOrder, OrderType } from '../types/core/order';
import { CryptoUtils } from '../utils/crypto';

export class OrderManager {
  constructor(
    private keyManager: KeyManager,
    private debug: boolean = false
  ) {}

  async createOrder(orderData: NewOrder): Promise<Order> {
    if (!this.keyManager.getIdentityKey()) {
      throw new Error('Key manager not initialized');
    }

    const orderId = CryptoUtils.generateId();
    const tradeKey = await this.keyManager.generateTradeKey(orderId);
    const tradePubKey = this.keyManager.getPublicKeyFromPrivate(tradeKey);

    const order: Order = {
      ...orderData,
      id: orderId,
      expires_at: this.calculateExpiration(orderData.created_at),
      trade_index: this.keyManager.getNextKeyIndex()
    };

    // Set appropriate pubkey based on order type
    if (order.kind === OrderType.BUY) {
      order.buyer_pubkey = tradePubKey;
      order.master_buyer_pubkey = this.keyManager.getPublicKeyFromPrivate(
        this.keyManager.getIdentityKey()!
      );
    } else {
      order.seller_pubkey = tradePubKey;
      order.master_seller_pubkey = this.keyManager.getPublicKeyFromPrivate(
        this.keyManager.getIdentityKey()!
      );
    }

    if (this.debug) {
      console.log('Created order:', {
        orderId,
        tradeIndex: order.trade_index,
        tradePubKey
      });
    }

    return order;
  }

  private calculateExpiration(createdAt: number): number {
    // Default 24 hour expiration
    return createdAt + (24 * 60 * 60);
  }

  async takeOrder(existingOrder: Order): Promise<Order> {
    if (!this.keyManager.getIdentityKey()) {
      throw new Error('Key manager not initialized');
    }

    const tradeKey = await this.keyManager.generateTradeKey(existingOrder.id);
    const tradePubKey = this.keyManager.getPublicKeyFromPrivate(tradeKey);
    const identityPubKey = this.keyManager.getPublicKeyFromPrivate(
      this.keyManager.getIdentityKey()!
    );

    // Update order with taker's keys
    if (existingOrder.kind === OrderType.SELL) {
      existingOrder.buyer_pubkey = tradePubKey;
      existingOrder.master_buyer_pubkey = identityPubKey;
    } else {
      existingOrder.seller_pubkey = tradePubKey;
      existingOrder.master_seller_pubkey = identityPubKey;
    }

    existingOrder.trade_index = this.keyManager.getNextKeyIndex();

    if (this.debug) {
      console.log('Taking order:', {
        orderId: existingOrder.id,
        tradeIndex: existingOrder.trade_index,
        tradePubKey
      });
    }

    return existingOrder;
  }
}
