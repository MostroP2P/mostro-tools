# @mostrop2p/mostro-tools

##Tools for developing Mostro clients

`@mostrop2p/mostro-tools` is a lightweight and extensible library designed to simplify the development of Mostro clients. It provides low-level functionality for interacting with the Mostro protocol, including order management, messaging, dispute resolution, and more.

This library is ideal for developers building decentralized peer-to-peer Bitcoin trading platforms powered by the [Mostro protocol](https://mostro.network/).

---

## **Features**

- **Core Protocol Support**: Implements fundamental Mostro operations such as order creation, dispute handling, and messaging.
- **Flexible Client Integration**: Designed for easy integration with relays and Mostro-compatible clients.
- **Secure Key Management**: Supports NIP-06 and NIP-59 for deterministic key generation and privacy-focused operations.
- **Customizable Configurations**: Offers private mode and advanced options for reputation handling.
- **Developer-Friendly**: Written in TypeScript with comprehensive type definitions and modular architecture.

---

## **Installation**

Using [pnpm](https://pnpm.io/):

```bash
pnpm install @mostrop2p/mostro-tools
```

---

## **Roadmap**

### **Core Implementation**

Development of foundational modules to enable Mostro protocol interactions:

- **Key Management**: Deterministic key generation (NIP-06) and rotation (NIP-59).
- **Order Management**: Create, list, take, and cancel orders.
- **Messaging**: Handle direct messages, confirmations, and encrypted communication.
- **Dispute Resolution**: Initiate and manage disputes.
- **Reputation Handling**: Implement rating and reputation updates.

---

### **Client Features**

Expand library capabilities with client-side utilities:

- **Order Functions**:
  - List open orders (`listorders`).
  - Create new buy/sell orders (`neworder`).
  - Take orders (`takesell`, `takebuy`).
  - Cancel pending orders (`cancel`).
- **Messaging Functions**:
  - Add invoices (`addinvoice`).
  - Confirm fiat payments (`fiatsent`).
  - Settle transactions (`release`).
- **Administrative Tools**:
  - Cancel orders as admin (`admcancel`).
  - Resolve disputes as admin (`admsettle`).
- **Privacy Features**:
  - Private mode to ensure full anonymity without affecting usability.

---

## **Goals**

1. **Ease of Use**: Abstract complexities of the Mostro protocol, providing simple and intuitive APIs.
2. **Security First**: Adhere to best practices for cryptographic operations and data integrity.
3. **Scalability**: Design with modularity and extensibility to support future protocol updates.
4. **Community Support**: Enable seamless contribution through clear documentation and developer tools.

---

## **Get Involved**

- **Website**: [mostro.network](https://mostro.network/)
- **Report Issues**: [GitHub Issues](https://github.com/MostroP2P/mostro-tools/issues)
- **Contribute**: Contributions are welcome! Follow the [Contribution Guidelines](https://github.com/MostroP2P/mostro-tools).

---

## **License**

`@mostrop2p/mostro-tools` is licensed under the MIT License. See the [LICENSE](https://github.com/MostroP2P/mostro-tools/blob/main/LICENSE) file for details.
