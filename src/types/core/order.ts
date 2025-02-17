export enum OrderType {
  BUY = 'buy',
  SELL = 'sell',
}

export enum OrderStatus {
  ACTIVE = 'active',
  CANCELED = 'canceled',
  CANCELED_BY_ADMIN = 'canceled-by-admin',
  COMPLETED_BY_ADMIN = 'completed-by-admin',
  DISPUTE = 'dispute',
  EXPIRED = 'expired',
  FIAT_SENT = 'fiat-sent',
  SETTLE_HODL_INVOICE = 'settled-hold-invoice',
  PENDING = 'pending',
  SUCCESS = 'success',
  WAITING_BUYER_INVOICE = 'waiting-buyer-invoice',
  WAITING_PAYMENT = 'waiting-payment',
}

export interface NewOrder {
  kind: OrderType;
  status: OrderStatus;
  amount: number;
  fiat_code: string;
  min_amount?: number;
  max_amount?: number;
  fiat_amount: number;
  payment_method: string;
  premium: number;
  created_at: number;
  buyer_invoice?: string;
}

export interface Order extends NewOrder {
  id: string;
  buyer_pubkey?: string;
  seller_pubkey?: string;
  master_buyer_pubkey?: string;
  master_seller_pubkey?: string;
  expires_at: number;
  trade_index?: number;
}
