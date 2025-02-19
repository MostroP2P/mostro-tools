import { NDKEvent } from '@nostr-dev-kit/ndk';

export enum OrderType {
  BUY = 'buy',
  SELL = 'sell'
}

export enum OrderStatus {
  ACTIVE = 'active',
  CANCELED = 'canceled',
  CANCELED_BY_ADMIN = 'canceled-by-admin',
  SETTLED_BY_ADMIN = 'settled-by-admin',
  COMPLETED_BY_ADMIN = 'completed-by-admin',
  DISPUTE = 'dispute',
  EXPIRED = 'expired',
  FIAT_SENT = 'fiat-sent',
  SETTLED_HOLD_INVOICE = 'settled-hold-invoice',
  PENDING = 'pending',
  SUCCESS = 'success',
  WAITING_BUYER_INVOICE = 'waiting-buyer-invoice',
  WAITING_PAYMENT = 'waiting-payment'
}

export interface Order {
  id: string;
  kind: OrderType;
  status: OrderStatus;
  amount: number;
  fiat_code: string;
  min_amount?: number | undefined;
  max_amount?: number | undefined;
  fiat_amount: number;
  payment_method: string;
  premium: number;
  created_at: number;
  expires_at: number;
  buyer_pubkey?: string;
  seller_pubkey?: string;
  master_buyer_pubkey?: string;
  master_seller_pubkey?: string;
  trade_index?: number;
  buyer_invoice?: string | undefined;
}

export interface NewOrder {
  kind: OrderType;
  status: OrderStatus;
  amount?: number;
  fiat_code: string;
  fiat_amount: number;
  min_amount?: number;
  max_amount?: number;
  payment_method: string;
  premium: number;
  buyer_invoice?: string;
}

export interface OrderEvent extends NDKEvent {
  order: Order;
}
