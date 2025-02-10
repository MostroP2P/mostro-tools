import { Event as NostrEvent } from 'nostr-tools';

export interface Rumor extends Omit<NostrEvent, 'sig'> {
  id: string; // Remove signature since rumors are unsigned
}

export interface Seal extends NostrEvent {
  kind: 13;
}

export interface GiftWrap extends NostrEvent {
  kind: 1059;
}
