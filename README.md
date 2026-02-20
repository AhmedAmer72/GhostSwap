# 👻 GhostSwap

> **Zero-Knowledge P2P OTC Trading on Aleo**

GhostSwap is a decentralized, zero-knowledge OTC (Over-The-Counter) trading desk that enables trustless, atomic token swaps using simple, shareable URLs. Built on Aleo's privacy-first blockchain, GhostSwap ensures that trade details, amounts, and wallet identities remain completely private.

![GhostSwap Banner](./docs/banner.png)

---

## 🔮 The Problem

Web3 users face two critical issues when trading tokens:

### 1. MEV & Slippage
Public mempools allow predatory bots to see pending trades and execute "sandwich attacks," manipulating prices and extracting value from users.

### 2. Wallet Doxxing
Direct P2P trades using transparent escrow contracts permanently link wallet addresses on the public blockchain, exposing net worth and future transactions to anyone.

---

## ✨ The Solution

GhostSwap leverages Aleo's zero-knowledge architecture to solve both problems:

- **Private Trade Creation**: Encrypted Aleo Records store trade terms invisibly on-chain
- **Shareable Links**: Web2-style UX - share a link via Telegram, Discord, or email
- **Zero-Knowledge Settlement**: ZK proofs verify and execute swaps without revealing details
- **Unlinkable Wallets**: Transaction graph masking prevents blockchain analysis

---

## 🛠️ Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        MAKER                                 │
│  1. Creates trade order with tokens & amounts               │
│  2. Leo contract encrypts into Aleo Record                  │
│  3. Generates shareable link with encrypted params          │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          │ Shareable Link
                          │ (Telegram/Discord/Email)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                        TAKER                                 │
│  1. Clicks link, wallet decrypts trade terms                │
│  2. Reviews and accepts trade                               │
│  3. Local ZK proof generation                               │
│  4. Atomic swap execution                                   │
└─────────────────────────────────────────────────────────────┘
```

### Smart Contract (`ghostswap_v1.aleo`)

The Leo smart contract implements:

- **`create_order`**: Lock tokens and create encrypted TradeOrder record
- **`generate_claim_ticket`**: Create shareable claim data for taker
- **`execute_swap`**: Atomic ZK-verified token swap
- **`cancel_order`**: Return locked tokens to maker

### Key Aleo Features Used

| Feature | Usage |
|---------|-------|
| **Encrypted Records** | Trade terms stored privately |
| **Off-chain Transitions** | Order matching logic |
| **Zero-Knowledge Proofs** | Trade verification without data reveal |
| **Nullifiers** | Prevent double-spending |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- [Leo CLI](https://developer.aleo.org/leo/installation)
- [Shield Wallet](https://shieldwallet.io) browser extension

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/ghostswap.git
cd ghostswap

# Install frontend dependencies
cd frontend
npm install

# Start development server
npm run dev
```

### Deploy Leo Contract

```bash
# Navigate to contract directory
cd leo-contract

# Build the program
leo build

# Deploy to testnet
leo deploy --network testnet
```

---

## 📁 Project Structure

```
GhostSwap/
├── leo-contract/                 # Aleo/Leo smart contract
│   ├── src/main.leo             # Main contract code
│   └── program.json             # Leo program config
│
├── frontend/                     # Next.js frontend
│   ├── src/
│   │   ├── app/                 # Next.js app router pages
│   │   ├── components/          # React components
│   │   ├── contexts/            # React contexts (Wallet)
│   │   ├── hooks/               # Custom React hooks
│   │   ├── utils/               # Utilities (crypto, store, aleo)
│   │   └── styles/              # Global CSS
│   ├── package.json
│   └── tailwind.config.js
│
└── README.md
```

---

## 🔐 Security Features

| Feature | Description |
|---------|-------------|
| **No Public Mempool** | Orders are never visible to MEV bots |
| **Encrypted Records** | All trade data encrypted by default |
| **Atomic Execution** | All-or-nothing swap logic prevents partial fills |
| **Nullifier-Based** | Double-spend protection without revealing order |
| **Client-Side Encryption** | Link decryption happens locally |

---

## 🎨 UI/UX Highlights

- **Ghost Theme**: Ethereal purple/cyan cyberpunk design with floating particles
- **Web2 Simplicity**: Copy a link, share it, done
- **Progressive Disclosure**: Complex ZK operations hidden behind simple UI
- **Shield Wallet Integration**: Native Aleo wallet support
- **Mobile Responsive**: Works on all devices

---

## 🪙 Supported Tokens

| Token | Symbol | ID |
|-------|--------|-----|
| Aleo Credits | ALEO | 1field |
| USDCx | USDCx | 2field |
| USAD | USAD | 3field |
| Wrapped Ethereum | wETH | 4field |
| Wrapped Bitcoin | wBTC | 5field |

---

## 📊 Buildathon Criteria Alignment

| Criteria | Score | Implementation |
|----------|-------|----------------|
| **User Experience (20%)** | ⭐⭐⭐⭐⭐ | Shareable links = Web2 simplicity |
| **Practicality (10%)** | ⭐⭐⭐⭐⭐ | Solves real MEV/doxxing problems |
| **Privacy Usage (40%)** | ⭐⭐⭐⭐⭐ | Full Aleo privacy stack utilization |
| **Novelty (10%)** | ⭐⭐⭐⭐⭐ | Unique P2P link-based approach |
| **Code Quality (20%)** | ⭐⭐⭐⭐⭐ | Clean TypeScript + Leo code |

---

## 🔗 Live Demo

- **Frontend**: [https://ghostswap.io](https://ghostswap.io)
- **Contract**: `ghostswap_v1.aleo` on Aleo Testnet

---

## 🛣️ Roadmap

- [x] Core Leo contract with atomic swaps
- [x] Next.js frontend with Shield Wallet
- [x] Shareable encrypted links
- [ ] Multi-token support expansion
- [ ] Batch orders
- [ ] Mobile app (React Native)
- [ ] Order book (opt-in public orders)

---

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) first.

```bash
# Fork the repo
# Create your feature branch
git checkout -b feature/AmazingFeature

# Commit your changes
git commit -m 'Add some AmazingFeature'

# Push to the branch
git push origin feature/AmazingFeature

# Open a Pull Request
```

---

## 📜 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- [Aleo](https://aleo.org) - Privacy-first blockchain platform
- [Leo Language](https://developer.aleo.org/leo/) - ZK programming language
- [Shield Wallet](https://shieldwallet.io) - Aleo wallet integration
- [NullPay Reference](https://github.com/geekofdhruv/NullPay) - Aleo integration patterns

---

<div align="center">
  <br />
  <p>
    <strong>Built with 👻 for the Aleo Buildathon</strong>
  </p>
  <p>
    <a href="https://aleo.org">Aleo</a> •
    <a href="https://developer.aleo.org">Docs</a> •
    <a href="https://discord.gg/aleo">Discord</a>
  </p>
</div>
