import { SimplePool, nip59, Event } from 'nostr-tools';

const pool = new SimplePool();

export interface GiftWrapContent {
  [key: string]: unknown;
}

interface UnwrapResult {
  success: boolean;
  result: GiftWrapContent | Error;
}

/**
 * Publish an event to a specific relay.
 * @param event The event object to publish.
 * @param relayUrl The relay URL to publish the event to.
 */
export async function publishEvent(event: Event, relayUrl: string): Promise<void> {
  try {
    const results = await Promise.all(pool.publish([relayUrl], event));

    const success = results.every((result) => result === 'ok');
    if (success) {
      console.log(`Event successfully published to ${relayUrl}`);
    } else {
      console.error(`Failed to publish event to some relays.`);
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Error publishing event: ${error.message}`);
    }
    throw new Error('Unknown error occurred while publishing event');
  }
}

/**
 * Create a wrapped event using NIP-59.
 * @param content The event content.
 * @param senderPrivateKey Sender's private key.
 * @param recipientPublicKey Recipient's public key.
 * @returns A wrapped Nostr event.
 */
export function createGiftWrapEvent(
  content: GiftWrapContent,
  senderPrivateKey: Uint8Array,
  recipientPublicKey: string,
): Event {
  if (!content || Object.keys(content).length === 0) {
    throw new Error('Content cannot be empty');
  }
  if (senderPrivateKey.length !== 32) {
    throw new Error('Invalid sender private key length');
  }
  if (!recipientPublicKey.match(/^[0-9a-f]{64}$/)) {
    throw new Error('Invalid recipient public key format');
  }

  try {
    const rumor = nip59.createRumor(content, senderPrivateKey);
    const seal = nip59.createSeal(rumor, senderPrivateKey, recipientPublicKey);
    return nip59.createWrap(seal, recipientPublicKey);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to create gift wrap event: ${error.message}`);
    }
    throw new Error('Unknown error occurred while creating gift wrap event');
  }
}

/**
 * Unwrap a wrapped event.
 * @param wrappedEvent The wrapped Nostr event.
 * @param recipientPrivateKey Recipient's private key.
 * @returns The unwrapped rumor as GiftWrapContent.
 */
export function unwrapGiftWrapEvent(wrappedEvent: Event, recipientPrivateKey: Uint8Array): GiftWrapContent {
  if (!wrappedEvent || wrappedEvent.kind !== 1059) {
    throw new Error('Invalid wrapped event format');
  }
  if (recipientPrivateKey.length !== 32) {
    throw new Error('Invalid recipient private key length');
  }

  try {
    return nip59.unwrapEvent(wrappedEvent, recipientPrivateKey);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to unwrap event: ${error.message}`);
    }
    throw new Error('Unknown error occurred while unwrapping event');
  }
}

/**
 * Unwrap multiple wrapped events.
 * @param wrappedEvents Array of wrapped Nostr events.
 * @param recipientPrivateKey Recipient's private key.
 * @returns An array of unwrap results.
 */
export function unwrapMultipleGiftWrapEvents(wrappedEvents: Event[], recipientPrivateKey: Uint8Array): UnwrapResult[] {
  if (!Array.isArray(wrappedEvents)) {
    throw new Error('wrappedEvents must be an array');
  }
  if (recipientPrivateKey.length !== 32) {
    throw new Error('Invalid recipient private key length');
  }

  return wrappedEvents.map((event) => {
    try {
      return {
        success: true,
        result: nip59.unwrapEvent(event, recipientPrivateKey),
      };
    } catch (error) {
      return {
        success: false,
        result: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  });
}
