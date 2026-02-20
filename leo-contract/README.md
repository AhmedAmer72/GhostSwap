# GhostSwap Leo Contract

Zero-knowledge P2P OTC trading smart contract for Aleo.

## Building

```bash
# Install Leo CLI
curl -sSL https://raw.githubusercontent.com/AleoHQ/leo/mainnet/install.sh | bash

# Build the program
leo build

# Run tests
leo test
```

## Deployment

```bash
# Deploy to testnet
leo deploy --network testnet --private-key YOUR_PRIVATE_KEY

# Verify deployment
leo verify ghostswap_v1.aleo
```

## Program Functions

### `create_order`
Create a new private trade order. Locks maker tokens and generates encrypted TradeOrder record.

**Inputs:**
- `maker_token: GhostToken` - Token record to lock
- `taker_token_id: field` - Desired token ID
- `taker_amount: u128` - Desired amount
- `nonce: field` - Random value for encryption
- `expires_at: u64` - Expiration block height

### `execute_swap`
Execute atomic swap with zero-knowledge proof verification.

**Inputs:**
- `ticket: ClaimTicket` - Claim ticket from shareable link
- `taker_token: GhostToken` - Taker's token record
- `maker_order: TradeOrder` - Original order record

### `cancel_order`
Cancel an existing order and refund locked tokens.

**Inputs:**
- `order: TradeOrder` - Order to cancel

### `mint_test_tokens`
Mint test tokens for testnet development.

**Inputs:**
- `token_id: field` - Token type
- `amount: u128` - Amount to mint

## Token IDs

| Token | Field Value |
|-------|-------------|
| ALEO Credits | 1field |
| USDCx | 2field |
| USAD | 3field |
| wETH | 4field |
| wBTC | 5field |

## Security Considerations

1. All trade data is encrypted in Aleo records
2. Nullifiers prevent double-spending
3. Atomic execution ensures all-or-nothing swaps
4. Expiration prevents stale orders
