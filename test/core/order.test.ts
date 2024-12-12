import { generateSecretKey, getPublicKey } from 'nostr-tools';
import { describe, expect, it } from 'vitest';
import { OrderStatus, OrderType } from '../../src/types/core/order.ts';
import { unwrapGiftWrapEvent } from '../../src/utils/nostr.ts';
import { createOrder } from '../../src/core/order.ts';

describe('createOrder with NIP-59', () => {
  it('should create a valid NIP-59 wrapped Nostr event for an order', () => {
    const senderPrivateKey = generateSecretKey();
    const recipientPublicKey = getPublicKey(generateSecretKey()); // Simulated recipient

    const order = {
      kind: OrderType.SELL,
      fiat_code: 'EUR',
      amount: 100,
      payment_method: 'SEPA',
    };

    const wrappedEvent = createOrder(order, senderPrivateKey, recipientPublicKey);

    // Validate the wrapped event structure
    expect(wrappedEvent.kind).toBe(1059); // Kind for NIP-59
    expect(wrappedEvent.tags).toContainEqual(['p', recipientPublicKey]);
    expect(wrappedEvent.content).not.toBeNull();
    expect(wrappedEvent.created_at).toBeDefined();
    expect(wrappedEvent.created_at).toBeLessThanOrEqual(Math.floor(Date.now() / 1000));
    expect(wrappedEvent.pubkey).toBeDefined();
    expect(wrappedEvent.sig).toBeDefined();

    // Verify all required NIP-59 tags are present
    const hasEncryptedTag = wrappedEvent.tags.some(([t]) => t === 'encrypted');
    expect(hasEncryptedTag).toBe(true);

    // Unwrap the event and validate the original content
    const unwrappedEvent = unwrapGiftWrapEvent(wrappedEvent, senderPrivateKey);
    const originalContent = JSON.parse(unwrappedEvent.content);

    expect(originalContent.kind).toBe(OrderType.SELL);
    expect(originalContent.fiat_code).toBe('EUR');
    expect(originalContent.amount).toBe(100);
    expect(originalContent.payment_method).toBe('SEPA');
    expect(originalContent.status).toBe(OrderStatus.PENDING);
  });

  it('should throw an error for invalid recipient public key', () => {
    const senderPrivateKey = generateSecretKey();
    const invalidRecipientPublicKey = 'invalid_pubkey'; // Simulated invalid recipient

    const order = {
      kind: OrderType.BUY,
      fiat_code: 'USD',
      amount: 50,
      payment_method: 'PayPal',
    };

    expect(() => createOrder(order, senderPrivateKey, invalidRecipientPublicKey)).toThrowError(
      'Invalid recipient public key format',
    );
  });

  it('should throw an error for missing required fields', () => {
    const senderPrivateKey = generateSecretKey();
    const recipientPublicKey = getPublicKey(generateSecretKey());

    const invalidOrder = {
      fiat_code: 'USD',
    };

    expect(() => createOrder(invalidOrder as any, senderPrivateKey, recipientPublicKey)).toThrowError(
      'Order amount must be greater than zero',
    );
  });

  it('should create an order with minimum valid inputs', () => {
    const senderPrivateKey = generateSecretKey();
    const recipientPublicKey = getPublicKey(generateSecretKey());

    const order = {
      amount: 1,
    };

    const wrappedEvent = createOrder(order, senderPrivateKey, recipientPublicKey);

    expect(wrappedEvent.kind).toBe(1059); // Kind for NIP-59
    const unwrappedEvent = unwrapGiftWrapEvent(wrappedEvent, senderPrivateKey);
    const originalContent = JSON.parse(unwrappedEvent.content);

    expect(originalContent.amount).toBe(1);
    expect(originalContent.kind).toBe(OrderType.BUY); // Default kind
    expect(originalContent.fiat_code).toBe('USD'); // Default fiat code
    expect(originalContent.payment_method).toBe('unknown'); // Default payment method
  });

  it('should handle edge cases for premium values', () => {
    const senderPrivateKey = generateSecretKey();
    const recipientPublicKey = getPublicKey(generateSecretKey());

    const validOrder = {
      amount: 100,
      premium: 10,
    };

    const wrappedEvent = createOrder(validOrder, senderPrivateKey, recipientPublicKey);
    const unwrappedEvent = unwrapGiftWrapEvent(wrappedEvent, senderPrivateKey);
    const originalContent = JSON.parse(unwrappedEvent.content);

    expect(originalContent.premium).toBe(10);

    const invalidOrder = {
      amount: 100,
      premium: 110, // Invalid premium value
    };

    expect(() => createOrder(invalidOrder as any, senderPrivateKey, recipientPublicKey)).toThrowError(
      'Order premium must be between 0 and 100',
    );
  });
});
