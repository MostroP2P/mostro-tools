


export interface MostroEvents {
  'ready': () => void
  'order-update': (order: Order, ev: NDKEvent) => void
  'info-update': (info: MostroInfo) => void
  'mostro-message': (message: MostroMessage, ev NDKEvent) => void
  'peer-message': (gift: GiftWrap, seal: Seal, rumor: Rumor) => void
  [key: string]: (...args: any[]) => void
  [key: symbol]: (...args: any[]) => void
}

export interface MostroOptions {
  mostroPubKey: string
  relays: string[]
  privateKey?: string
  debug?: boolean
}

export enum PublicKeyType {
  HEX = 'hex',
  NPUB = 'npub',
}

const REQUEST_TIMEOUT = 30000 // 30 seconds

interface PendingRequest {
  resolve: (value: MostroMessage) => void
  reject: (reason: any) => void
  timer: NodeJS.Timeout
}
