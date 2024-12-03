// Exportar funciones del cliente
export * from './client/order.ts';
//export * from './client/messages';
//export * from './client/disputes';
//export * from './client/admin';

// Exportar funciones y utilidades del core
export * from './core/order.ts';
//export * from './core/message';
//export * from './core/dispute';
//export * from './core/rating';
//export * from './core/user';

// Exportar utilidades de Nostr
export * from './utils/nostr.ts';
export * from './utils/crypto.ts';
export * from './utils/validation.ts';

// Exportar tipos compartidos
export * from './types/core/order.ts';
export * from './types/core/message.ts';
export * from './types/core/dispute.ts';
export * from './types/core/user.ts';
export * from './types/core/rating.ts';
export * from './types/client/admin.ts';
export * from './types/client/orders.ts';
export * from './types/client/messages.ts';
export * from './types/client/disputes.ts';

// Exportar constantes globales
//export * from './types/constants';

// Exportar metadatos del paquete
export const VERSION = '1.0.0'; // Cambia según sea necesario
export const LIBRARY_NAME = 'mostro-tools';

// Métodos auxiliares genéricos
export const wait = (timeout?: number): Promise<boolean> =>
  new Promise((resolve) => setTimeout(() => resolve(true), timeout));

export const dirname = __dirname; // En caso de que sea necesario
