import type { Order } from '../core/index';

export interface OrderFunctions {
  listorders: () => Promise<Order[]>;
  neworder: (order: Partial<Order>) => Promise<Order>;
  takesell: (orderId: string, amount?: number) => Promise<Order>;
  takebuy: (orderId: string, amount?: number) => Promise<Order>;
  cancel: (orderId: string) => Promise<void>;
}
