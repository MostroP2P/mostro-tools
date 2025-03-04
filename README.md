# @mostrop2p/mostro-tools

## Tools for building Mostro Clients

`@mostrop2p/mostro-tools` is a modern TypeScript library that simplifies building applications on the [Mostro P2P protocol](https://mostro.network/). It provides developers with a complete toolkit for creating decentralized, non-custodial Bitcoin trading platforms with Lightning Network support.

[![npm version](https://img.shields.io/npm/v/@mostrop2p/mostro-tools.svg)](https://www.npmjs.com/package/@mostrop2p/mostro-tools)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![test coverage](https://img.shields.io/badge/coverage-90%25-brightgreen.svg)](https://mostrop2p.github.io/mostro-tools/coverage)

---

## Features

- **📦 Complete Protocol Implementation**: Full support for the Mostro protocol including orders, messaging, and disputes
- **⚡ Lightning Network Integration**: Built-in utilities for invoice generation and payment handling
- **🔒 Advanced Key Management**: Secure, deterministic key derivation (BIP-39/BIP-32) and rotation
- **🔐 Encrypted Communications**: NIP-44 and NIP-59 support for private messaging
- **📊 Order Management**: Comprehensive tools for creating, listing and executing trades
- **🛡️ Dispute Resolution**: Built-in support for handling trade disputes
- **⭐ Reputation System**: Tools for implementing user ratings and reputation tracking
- **🧩 Modular Architecture**: Extensible design allowing custom implementations and plugins

---

## Installation

```bash
# Using npm
npm install @mostrop2p/mostro-tools

# Using yarn
yarn add @mostrop2p/mostro-tools

# Using pnpm
pnpm add @mostrop2p/mostro-tools
```

---

## Quick Start

```typescript
import { Mostro, KeyManager } from '@mostrop2p/mostro-tools';
import { generateMnemonic } from 'bip39';

async function main() {
  // Initialize key manager with a mnemonic phrase
  const mnemonic = generateMnemonic();
  const keyManager = new KeyManager();
  await keyManager.initialize(mnemonic);

  // Create and configure Mostro client
  const mostro = new Mostro({
    mostroPubKey: 'npub1...', // Mostro instance pubkey
    relays: ['wss://relay.damus.io', 'wss://relay.nostr.info'],
    privateKey: keyManager.getIdentityKey()!,
    debug: true,
  });

  // Connect to Mostro network
  await mostro.connect();
  console.log('Connected to Mostro network');

  // Get active orders
  const orders = await mostro.getActiveOrders();
  console.log(`Found ${orders.length} active orders`);

  // Create a new sell order
  const sellOrder = await mostro.submitOrder({
    kind: 'sell',
    status: 'pending',
    amount: 50000, // 50,000 sats
    fiat_code: 'USD',
    fiat_amount: 25, // $25 USD
    payment_method: 'BANK',
    premium: 2, // 2% premium
  });

  console.log(`Order created with ID: ${sellOrder.order?.id}`);
}

main().catch(console.error);
```

---

## Core Components

### Mostro Client

The main interface for interacting with the Mostro network:

```typescript
// Initialize client
const mostro = new Mostro({
  mostroPubKey: 'npub1...', // Mostro instance pubkey
  relays: ['wss://relay.damus.io'],
  privateKey: keyManager.getIdentityKey()!,
});

// Connect to network
await mostro.connect();

// Listen for order updates
mostro.on('order-update', (order, event) => {
  console.log('Order updated:', order);
});
```

### Key Management

Secure key derivation and management:

```typescript
// Initialize with mnemonic
const keyManager = new KeyManager();
await keyManager.initialize('your mnemonic phrase here');

// Get identity key
const identityKey = keyManager.getIdentityKey();

// Generate trade key for a specific order
const tradeKey = await keyManager.generateTradeKey('order-id');
```

### Order Operations

Complete order lifecycle management:

```typescript
// List active orders
const orders = await mostro.getActiveOrders();

// Take a sell order
await mostro.takeSell(order);

// Add invoice for payment
await mostro.addInvoice(order, 'lnbc500...');

// Confirm fiat payment sent
await mostro.fiatSent(order);

// Release funds (for seller)
await mostro.release(order);
```

---

## Examples

Check out the `examples` directory for complete usage examples:

- [Basic Connection](examples/01-basic-connection.ts) - Connect to Mostro network
- [List Orders](examples/02-list-orders.ts) - Query and display active orders
- [Create Sell Order](examples/03-create-sell-order.ts) - Create a new sell order

Run examples with:

```bash
# Run basic connection example
npx tsx examples/01-basic-connection.ts
```

---

## Documentation

- [API Reference](https://mostrop2p.github.io/mostro-tools/api) - Detailed API documentation
- [Protocol Guide](https://mostro.network/protocol/) - Mostro protocol documentation
- [Examples](examples/) - Usage examples

---

## Contributing

Contributions are welcome! Please check out our [contribution guidelines](CONTRIBUTING.md).

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Resources

- [Mostro Website](https://mostro.network)
- [Mostro Protocol Documentation](https://mostro.network/protocol/)
- [GitHub Repository](https://github.com/MostroP2P/mostro-tools)
