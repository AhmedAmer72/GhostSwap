import { useState, useCallback, useEffect } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { TradeOrder, Token, useAppStore, formatTokenAmount } from '@/utils/store';
import { PROGRAM_ID, toAleoField, toAleoU128 } from '@/utils/aleo';
import { generateTradeOrder, createShareableUrl } from '@/utils/crypto';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Remove "field" suffix and whitespace for comparison */
function normalizeField(val: string | undefined | null): string {
  return (val ?? '').replace(/field$/, '').trim();
}

/** Get a uint128 value from an Aleo record data field */
function parseU128(val: string | undefined | null): bigint {
  try { return BigInt((val ?? '0').replace(/u128$/, '').replace(/field$/, '').trim()); } catch { return 0n; }
}

/**
 * Get a field from a record in a wallet-agnostic way.
 * Shield wallet wraps fields under `data`, some adapters flatten them.
 */
function recField(record: any, field: string): string | undefined {
  return record?.data?.[field] ?? record?.[field];
}

/** Check record type against both `record_name`, `type`, and `name` properties */
function recType(record: any): string {
  return (record?.record_name ?? record?.type ?? record?.name ?? '').toLowerCase();
}

/** Generate a random Aleo-safe field value (fits in the BLS12-377 scalar field) */
function randomAleoField(): string {
  // Aleo scalar field modulus: 2^251 + delta — using Date.now() + random keeps it tiny + unique
  const n = BigInt(Date.now()) * BigInt(1_000_000) + BigInt(Math.floor(Math.random() * 1_000_000));
  return `${n}field`;
}

/**
 * Fetch all records for our program from the wallet.
 * Returns the raw array; each element usually has:
 *   { owner, data: { field: value }, plaintext, record_name, ... }
 */
async function walletRecords(requestRecords: (p: string, plain?: boolean) => Promise<unknown[]>): Promise<any[]> {
  const recs = await requestRecords(PROGRAM_ID, true);
  return Array.isArray(recs) ? recs : [];
}

/**
 * Best-effort plaintext string for a record.
 * Wallets typically include a `plaintext` string we can pass directly to executeTransaction.
 */
function recordPlaintext(record: any): string | null {
  if (record?.plaintext && typeof record.plaintext === 'string') return record.plaintext;
  return null;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UseAleoTradeReturn {
  createTrade: (
    offerToken: Token,
    offerAmount: string,
    requestToken: Token,
    requestAmount: string,
    expiresInHours?: number
  ) => Promise<string>;
  executeTrade: (order: TradeOrder, takerToken: Token, takerAmount: string) => Promise<string>;
  cancelTrade: (order: TradeOrder) => Promise<string>;
  mintTokens: (tokenId: string, amount: string) => Promise<string>;
  generateTicket: (order: TradeOrder, takerAddress: string) => Promise<string>;
  isProcessing: boolean;
  error: string | null;
  clearError: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAleoTrade(): UseAleoTradeReturn {
  const wallet = useWallet() as any;
  const { connected, address } = wallet;
  const executeTransaction: ((opts: any) => Promise<{ transactionId: string } | undefined>) | undefined
    = wallet.executeTransaction;
  const requestRecords: ((prog: string, plain?: boolean) => Promise<unknown[]>) | undefined
    = wallet.requestRecords;

  const { addOrder, updateOrderStatus, addTransaction, setOrderRecordPlaintext } = useAppStore() as any;
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  // ── REQUIRE helpers ─────────────────────────────────────────────────────

  function requireWallet() {
    if (!connected || !address) throw new Error('Wallet not connected');
  }

  function requireExecute() {
    requireWallet();
    if (!executeTransaction) throw new Error('Wallet does not support executeTransaction');
  }

  function requireRecords() {
    requireWallet();
    if (!requestRecords) throw new Error('Wallet does not support requestRecords');
  }

  // ── create_order ─────────────────────────────────────────────────────────
  const createTrade = useCallback(
    async (
      offerToken: Token,
      offerAmount: string,
      requestToken: Token,
      requestAmount: string,
      expiresInHours: number = 24
    ): Promise<string> => {
      requireExecute();
      requireRecords();

      setIsProcessing(true);
      setError(null);

      try {
        // 1. Fetch GhostToken records from wallet
        const records = await walletRecords(requestRecords!);
        const tokenRecord = records.find((r: any) => {
          const matchId = normalizeField(recField(r, 'token_id')) === normalizeField(offerToken.tokenId);
          const hasAmount = parseU128(recField(r, 'amount')) >= BigInt(offerAmount);
          return matchId && hasAmount;
        });

        if (!tokenRecord) {
          const displayAmt = formatTokenAmount(offerAmount, offerToken.decimals);
          throw new Error(
            `No ${offerToken.symbol} record found in your wallet with at least ${displayAmt} ${offerToken.symbol}. ` +
            `Click "Mint Test Tokens" in the balances panel to get test tokens first.`
          );
        }

        const tokenInput = recordPlaintext(tokenRecord);
        if (!tokenInput) throw new Error('Could not read GhostToken record plaintext from wallet');

        // 2. Generate nonce for create_order
        const nonce = randomAleoField();

        // 3. Build local order (orderId is provisional; will be updated after tx)
        const order = generateTradeOrder(
          address!,
          offerToken,
          offerAmount,
          requestToken,
          requestAmount,
          expiresInHours
        );
        // Store nonce so it's embedded in the link
        (order as any).aleoNonce = nonce;

        // 4. Call create_order on-chain — throws if wallet rejects
        const result = await executeTransaction!({
          program: PROGRAM_ID,
          function: 'create_order',
          inputs: [
            tokenInput,
            toAleoField(requestToken.tokenId.replace('field', '')),
            toAleoU128(requestAmount),
            nonce,
          ],
          fee: 500000,
        });

        if (result?.transactionId) {
          order.orderId = result.transactionId;
        }

        // 5. Persist to store
        addOrder(order);
        addTransaction({
          id: order.orderId,
          type: 'create_order',
          status: 'confirmed',
          timestamp: Date.now(),
          orderId: order.orderId,
        });

        return createShareableUrl(order);
      } catch (err: any) {
        const msg = err.message || 'Failed to create trade';
        setError(msg);
        throw new Error(msg);
      } finally {
        setIsProcessing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [connected, address, executeTransaction, requestRecords]
  );

  // ── execute_swap ─────────────────────────────────────────────────────────
  const executeTrade = useCallback(
    async (order: TradeOrder, takerToken: Token, takerAmount: string): Promise<string> => {
      requireExecute();
      requireRecords();

      setIsProcessing(true);
      setError(null);

      try {
        const records = await walletRecords(requestRecords!);

        // a) ClaimTicket for this order
        const ticketRecord = records.find((r: any) => {
          const rid = normalizeField(recField(r, 'order_id'));
          const oid = normalizeField(order.orderId);
          return rid === oid && recType(r) === 'claimticket';
        });

        if (!ticketRecord) throw new Error("ClaimTicket not found in wallet. Ask Alice to issue your ticket first.");

        const ticketInput = recordPlaintext(ticketRecord);
        if (!ticketInput) throw new Error("Could not read ClaimTicket plaintext");

        // b) Taker's GhostToken payment
        const payRecord = records.find((r: any) => {
          const matchId = normalizeField(recField(r, 'token_id')) === normalizeField(takerToken.tokenId);
          const hasAmount = parseU128(recField(r, 'amount')) >= BigInt(takerAmount);
          return matchId && hasAmount;
        });

        if (!payRecord) {
          const displayAmt = formatTokenAmount(takerAmount, takerToken.decimals);
          throw new Error(`No ${takerToken.symbol} record with at least ${displayAmt} ${takerToken.symbol} in your wallet`);
        }

        const payInput = recordPlaintext(payRecord);
        if (!payInput) throw new Error("Could not read taker GhostToken plaintext");

        // c) TradeOrder record plaintext.
        //    Primary source: embedded in the link by Alice after generate_ticket.
        //    Fallback: our local store (if Alice is viewing her own orders).
        const orderRecordPlaintext: string | null =
          (order as any).recordPlaintext ??
          (() => {
            const storedOrders = useAppStore.getState().myOrders;
            const m = storedOrders.find(o => normalizeField(o.orderId) === normalizeField(order.orderId));
            return (m as any)?.recordPlaintext ?? null;
          })();

        if (!orderRecordPlaintext) {
          throw new Error(
            "TradeOrder record is missing from the link. " +
            "Ask Alice to click 'Issue Ticket' in Trade History — it fetches the record and regenerates the link. " +
            "Paste the new link here."
          );
        }

        // d) Execute swap
        const result = await executeTransaction!({
          program: PROGRAM_ID,
          function: 'execute_swap',
          inputs: [ticketInput, payInput, orderRecordPlaintext],
          fee: 750000,
        });

        const txId = result?.transactionId ?? `tx_swap_${Date.now()}`;
        updateOrderStatus(order.orderId, 'fulfilled');
        addTransaction({
          id: txId,
          type: 'execute_swap',
          status: 'confirmed',
          timestamp: Date.now(),
          orderId: order.orderId,
        });

        return txId;
      } catch (err: any) {
        const msg = err.message || 'Failed to execute swap';
        setError(msg);
        throw new Error(msg);
      } finally {
        setIsProcessing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [connected, address, executeTransaction, requestRecords]
  );

  // ── cancel_order ─────────────────────────────────────────────────────────
  const cancelTrade = useCallback(
    async (order: TradeOrder): Promise<string> => {
      requireExecute();
      requireRecords();

      setIsProcessing(true);
      setError(null);

      try {
        const records = await walletRecords(requestRecords!);

        // Find TradeOrder record for this order
        const orderRecord = records.find((r: any) => {
          const rid = normalizeField(recField(r, 'order_id'));
          const oid = normalizeField(order.orderId);
          return rid === oid && recType(r) === 'tradeorder';
        });

        if (!orderRecord) throw new Error("TradeOrder record not found in wallet. Wait for the create_order transaction to confirm, then try again.");

        const orderInput = recordPlaintext(orderRecord);
        if (!orderInput) throw new Error("Could not read TradeOrder record plaintext");

        const result = await executeTransaction!({
          program: PROGRAM_ID,
          function: 'cancel_order',
          inputs: [orderInput],
          fee: 300000,
        });

        const txId = result?.transactionId ?? `tx_cancel_${Date.now()}`;
        updateOrderStatus(order.orderId, 'cancelled');
        addTransaction({
          id: txId,
          type: 'cancel_order',
          status: 'confirmed',
          timestamp: Date.now(),
          orderId: order.orderId,
        });

        return txId;
      } catch (err: any) {
        const msg = err.message || 'Failed to cancel order';
        setError(msg);
        throw new Error(msg);
      } finally {
        setIsProcessing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [connected, address, executeTransaction, requestRecords]
  );

  // ── generate_ticket ──────────────────────────────────────────────────────
  const generateTicket = useCallback(
    async (order: TradeOrder, takerAddress: string): Promise<string> => {
      requireExecute();
      requireRecords();

      setIsProcessing(true);
      setError(null);

      try {
        const records = await walletRecords(requestRecords!);

        // Find Alice's TradeOrder record
        const orderRecord = records.find((r: any) => {
          const rid = normalizeField(recField(r, 'order_id'));
          const oid = normalizeField(order.orderId);
          return rid === oid && recType(r) === 'tradeorder';
        });

        if (!orderRecord) throw new Error("TradeOrder record not found in wallet. Make sure the create_order transaction has confirmed (check your wallet's transaction history).");

        const orderInput = recordPlaintext(orderRecord);
        if (!orderInput) throw new Error("Could not read TradeOrder record plaintext");

        const result = await executeTransaction!({
          program: PROGRAM_ID,
          function: 'generate_ticket',
          inputs: [orderInput, takerAddress],
          fee: 300000,
        });

        const txId = result?.transactionId ?? `tx_ticket_${Date.now()}`;

        // After generate_ticket, Alice gets back a NEW TradeOrder record.
        // We need to store its plaintext so Bob can use it in execute_swap.
        // Poll records to find the updated TradeOrder and save its plaintext.
        try {
          await new Promise(r => setTimeout(r, 2000));
          const updatedRecords = await walletRecords(requestRecords!);
          const newOrderRecord = updatedRecords.find((r: any) => {
            const rid = normalizeField(recField(r, 'order_id'));
            const oid = normalizeField(order.orderId);
            return rid === oid && recType(r) === 'tradeorder';
          });
          if (newOrderRecord && recordPlaintext(newOrderRecord)) {
            // Store the record plaintext on the order so the new link includes it
            if (typeof setOrderRecordPlaintext === 'function') {
              setOrderRecordPlaintext(order.orderId, recordPlaintext(newOrderRecord));
            }
          }
        } catch {
          // Non-critical — user can try refreshing
        }

        addTransaction({
          id: txId,
          type: 'generate_ticket',
          status: 'confirmed',
          timestamp: Date.now(),
          orderId: order.orderId,
        });

        return txId;
      } catch (err: any) {
        const msg = err.message || 'Failed to generate ticket';
        setError(msg);
        throw new Error(msg);
      } finally {
        setIsProcessing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [connected, address, executeTransaction, requestRecords]
  );

  // ── mint_tokens ──────────────────────────────────────────────────────────
  const mintTokens = useCallback(
    async (tokenId: string, amount: string): Promise<string> => {
      requireExecute();

      setIsProcessing(true);
      setError(null);

      try {
        const result = await executeTransaction!({
          program: PROGRAM_ID,
          function: 'mint_tokens',
          inputs: [
            toAleoField(tokenId.replace('field', '')),
            toAleoU128(amount),
          ],
          fee: 300000,
        });

        const txId = result?.transactionId ?? `tx_mint_${Date.now()}`;

        addTransaction({
          id: txId,
          type: 'mint',
          status: 'confirmed',
          timestamp: Date.now(),
        });

        return txId;
      } catch (err: any) {
        const msg = err.message || 'Failed to mint tokens';
        setError(msg);
        throw new Error(msg);
      } finally {
        setIsProcessing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [connected, address, executeTransaction]
  );

  return {
    createTrade,
    executeTrade,
    cancelTrade,
    mintTokens,
    generateTicket,
    isProcessing,
    error,
    clearError,
  };
}

// ---------------------------------------------------------------------------
// useTokenBalances
// ---------------------------------------------------------------------------
export function useTokenBalances() {
  const wallet = useWallet() as any;
  const { connected, address, requestRecords } = wallet;
  const { balances, setBalances } = useAppStore();
  const [isLoading, setIsLoading] = useState(false);

  const refreshBalances = useCallback(async () => {
    if (!connected || !address || !requestRecords) return;
    setIsLoading(true);
    try {
      const records = await requestRecords(PROGRAM_ID, true) as any[];
      const newBalances: Record<string, string> = {};
      for (const r of records ?? []) {
        if (recType(r) !== '' && recType(r) !== 'ghosttoken') continue;
        const rawId = recField(r, 'token_id') ?? '';
        const tokenId = normalizeField(rawId) + 'field';
        const amt = parseU128(recField(r, 'amount'));
        if (tokenId !== 'field') {
          newBalances[tokenId] = ((BigInt(newBalances[tokenId] ?? '0')) + amt).toString();
        }
      }
      setBalances(newBalances);
    } catch (e) {
      console.warn('Failed to fetch balances:', e);
    } finally {
      setIsLoading(false);
    }
  }, [connected, address, requestRecords, setBalances]);

  useEffect(() => {
    if (connected) refreshBalances();
  }, [connected, refreshBalances]);

  return { balances, isLoading, refreshBalances };
}
