// Core classes
export { Mostro, PublicKeyType } from './client/mostro';
export { OrderManager } from './client/order';

// Core types
export {
  Order,
  NewOrder,
  OrderType,
  OrderStatus,
  Action,
  MostroInfo,
  MostroMessage,
} from './types/core';

// Nostr types
export {
  Rumor,
  Seal,
  GiftWrap,
  GiftWrapContent,
} from './types/core/nostr';

// Utility classes
export { KeyManager, KeyManagerError } from './utils/key-manager';
export { CryptoUtils, KeyPair } from './utils/crypto';
export { Nostr } from './utils/nostr';
export { ValidationError } from './utils/validations';

// Core order functions
export {
  generateOrderTags,
  extractOrderFromEvent,
  prepareNewOrder,
  isOrderExpired,
  isRangeOrder,
  isMarketPriceOrder,
  NOSTR_REPLACEABLE_EVENT_KIND,
  ORDER_EXPIRATION_TIME,
} from './core/order';

// Helper functions
export function wait(timeout?: number): Promise<boolean> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, timeout);
  });
}
