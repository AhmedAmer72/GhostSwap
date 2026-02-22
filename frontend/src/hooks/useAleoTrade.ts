import { useState, useCallback, useEffect } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { TradeOrder, Token, useAppStore } from '@/utils/store';
import { PROGRAM_ID, toAleoField, toAleoU128 } from '@/utils/aleo';
import { generateTradeOrder, createShareableUrl } from '@/utils/crypto';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a random Aleo field element for use as a nonce. */
function randomField(): string {
  const hi = BigInt(Date.now());
  const lo = BigInt(Math.floor(Math.random() * 1_000_000_000));
  return `${hi * 1_000_000_000n + lo}field`;
}

/** Find a GhostToken record matching tokenId in the user's records. */
function findTokenRecord(records: unknown[], tokenId: string): unknown | null {
  if (!records?.length) return null;
  return records.find((r: any) => {
    const id: string = r?.token_id ?? r?.data?.token_id ?? '';
    return id.replace('field', '').trim() === tokenId.replace('field', '').trim();
  }) ?? null;
}

/** Serialise a record (or object) to the string format the wallet expects. */
function serializeRecord(record: unknown): string {
  if (typeof record === 'string') return record;
  return JSON.stringify(record);
}

// ---------------------------------------------------------------------------
// useAleoTrade hook
// ---------------------------------------------------------------------------
interface UseAleoTradeReturn {
  createTrade: (
    offerToken: Token,
    offerAmountBase: string,   // in base units (no decimals)
    requestToken: Token,
    requestAmountBase: string, // in base units (no decimals)
    expiresInHours?: number
  ) => Promise<string>;
  executeTrade: (order: TradeOrder, takerToken: Token, takerAmountBase: string) => Promise<string>;
  cancelTrade: (order: TradeOrder) => Promise<string>;
  mintTokens: (tokenId: string, amountBase: string) => Promise<string>;
  isProcessing: boolean;
  error: string | null;
  clearError: () => void;
}

export function useAleoTrade(): UseAleoTradeReturn {
  const { connected, address, executeTransaction, requestRecords } = useWallet() as any;
  const { addOrder, updateOrderStatus, addTransaction } = useAppStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  // ---- create_order -------------------------------------------------------
  const createTrade = useCallback(
    async (
      offerToken: Token,
      offerAmountBase: string,
      requestToken: Token,
      requestAmountBase: string,
      expiresInHours = 24
    ): Promise<string> => {
      if (!connected || !address) throw new Error('Wallet not connected');

      setIsProcessing(true);
      setError(null);

      try {
        const nonce = randomField();

        // Build a local order first so we have something to link to.
        const order = generateTradeOrder(
          address,
          offerToken,
          offerAmountBase,
          requestToken,
          requestAmountBase,
          expiresInHours
        );
        order.nonce = nonce;

        // Try to call create_order on-chain
        if (executeTransaction) {
          try {
            // Attempt to fetch the user's GhostToken record for the offer token.
            let tokenRecord: unknown = null;
            if (requestRecords) {
              try {
                const records: unknown[] = await requestRecords(PROGRAM_ID);
                tokenRecord = findTokenRecord(records, offerToken.tokenId);
              } catch (e) {
                console.warn('[GhostSwap] requestRecords failed:', e);
              }
            }

            // Use the fetched record when available; otherwise construct an
            // inline record literal that the wallet can match to a real record.
            const tokenInput = tokenRecord
              ? serializeRecord(tokenRecord)
              : `{ owner: ${address}, token_id: ${offerToken.tokenId}, amount: ${offerAmountBase}u128 }`;

            const result = await executeTransaction({
              program: PROGRAM_ID,
              function: 'create_order',
              inputs: [
                tokenInput,                            // token: GhostToken
                requestToken.tokenId,                  // taker_token_id: field
                `${requestAmountBase}u128`,            // taker_amount: u128
                nonce,                                 // nonce: field
              ],
              fee: 500_000,
            });

            if (result?.transactionId) {
              order.orderId = result.transactionId;
            }
          } catch (txErr: any) {
            console.warn('[GhostSwap] create_order tx failed, using local order:', txErr.message);
          }
        }

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
    [connected, address, executeTransaction, requestRecords, addOrder, addTransaction]
  );

  // ---- execute_swap -------------------------------------------------------
  // Contract: execute_swap(ticket: ClaimTicket, taker_token: GhostToken, order: TradeOrder)
  const executeTrade = useCallback(
    async (order: TradeOrder, takerToken: Token, takerAmountBase: string): Promise<string> => {
      if (!connected || !address) throw new Error('Wallet not connected');

      setIsProcessing(true);
      setError(null);

      try {
        let txId = `tx_swap_${Date.now()}`;

        if (executeTransaction) {
          // Fetch taker's records for ClaimTicket + GhostToken
          let claimTicket: unknown = null;
          let takerRecord: unknown = null;
          if (requestRecords) {
            try {
              const records: unknown[] = await requestRecords(PROGRAM_ID);
              // Find ClaimTicket for this order
              claimTicket = records?.find((r: any) => {
                const orderId: string = r?.order_id ?? r?.data?.order_id ?? '';
                return orderId.replace('field', '').trim() === order.orderId.replace('field', '').trim();
              }) ?? null;
              takerRecord = findTokenRecord(records, takerToken.tokenId);
            } catch (e) {
              console.warn('[GhostSwap] requestRecords failed:', e);
            }
          }

          const ticketInput = claimTicket
            ? serializeRecord(claimTicket)
            : `{ owner: ${address}, order_id: ${toAleoField(order.orderId)}, maker_address: ${order.makerAddress}, maker_token_id: ${order.makerToken.tokenId}, maker_amount: ${toAleoU128(order.makerAmount)}, taker_token_id: ${order.takerToken.tokenId}, taker_amount: ${toAleoU128(order.takerAmount)} }`;

          const takerTokenInput = takerRecord
            ? serializeRecord(takerRecord)
            : `{ owner: ${address}, token_id: ${takerToken.tokenId}, amount: ${takerAmountBase}u128 }`;

          const orderInput = `{ owner: ${order.makerAddress}, maker_token_id: ${order.makerToken.tokenId}, maker_amount: ${toAleoU128(order.makerAmount)}, taker_token_id: ${order.takerToken.tokenId}, taker_amount: ${toAleoU128(order.takerAmount)}, order_id: ${toAleoField(order.orderId)}, nonce: ${order.nonce || randomField()} }`;

          const result = await executeTransaction({
            program: PROGRAM_ID,
            function: 'execute_swap',
            inputs: [ticketInput, takerTokenInput, orderInput],
            fee: 750_000,
          });
          if (result?.transactionId) txId = result.transactionId;
        }

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
    [connected, address, executeTransaction, requestRecords, updateOrderStatus, addTransaction]
  );

  // ---- cancel_order -------------------------------------------------------
  const cancelTrade = useCallback(
    async (order: TradeOrder): Promise<string> => {
      if (!connected || !address) throw new Error('Wallet not connected');

      setIsProcessing(true);
      setError(null);

      try {
        let txId = `tx_cancel_${Date.now()}`;

        if (executeTransaction) {
          let orderRecord: unknown = null;
          if (requestRecords) {
            try {
              const records: unknown[] = await requestRecords(PROGRAM_ID);
              orderRecord = records?.find((r: any) => {
                const oid: string = r?.order_id ?? r?.data?.order_id ?? '';
                return oid.replace('field', '').trim() === order.orderId.replace('field', '').trim();
              }) ?? null;
            } catch (e) { /* ignore */ }
          }

          const orderInput = orderRecord
            ? serializeRecord(orderRecord)
            : `{ owner: ${order.makerAddress}, maker_token_id: ${order.makerToken.tokenId}, maker_amount: ${toAleoU128(order.makerAmount)}, taker_token_id: ${order.takerToken.tokenId}, taker_amount: ${toAleoU128(order.takerAmount)}, order_id: ${toAleoField(order.orderId)}, nonce: ${order.nonce || randomField()} }`;

          const result = await executeTransaction({
            program: PROGRAM_ID,
            function: 'cancel_order',
            inputs: [orderInput],
            fee: 300_000,
          });
          if (result?.transactionId) txId = result.transactionId;
        }

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
    [connected, address, executeTransaction, requestRecords, updateOrderStatus, addTransaction]
  );

  // ---- mint_tokens --------------------------------------------------------
  const mintTokens = useCallback(
    async (tokenId: string, amountBase: string): Promise<string> => {
      if (!connected || !address) throw new Error('Wallet not connected');

      setIsProcessing(true);
      setError(null);

      try {
        let txId = `tx_mint_${Date.now()}`;

        if (executeTransaction) {
          const result = await executeTransaction({
            program: PROGRAM_ID,
            function: 'mint_tokens',
            inputs: [
              tokenId.endsWith('field') ? tokenId : `${tokenId}field`,
              `${amountBase}u128`,
            ],
            fee: 300_000,
          });
          if (result?.transactionId) txId = result.transactionId;
        }

        return txId;
      } catch (err: any) {
        const msg = err.message || 'Failed to mint tokens';
        setError(msg);
        throw new Error(msg);
      } finally {
        setIsProcessing(false);
      }
    },
    [connected, address, executeTransaction]
  );

  return { createTrade, executeTrade, cancelTrade, mintTokens, isProcessing, error, clearError };
}

// ---------------------------------------------------------------------------
// useTokenBalances hook
// ---------------------------------------------------------------------------
export function useTokenBalances() {
  const { connected, requestRecords } = useWallet() as any;
  const { balances, setBalances } = useAppStore();
  const [isLoading, setIsLoading] = useState(false);

  const refreshBalances = useCallback(async () => {
    if (!connected || !requestRecords) return;

    setIsLoading(true);
    try {
      const records: any[] = await requestRecords(PROGRAM_ID);
      const newBalances: Record<string, string> = {};
      records?.forEach((record: any) => {
        const tokenId: string = record?.token_id ?? record?.data?.token_id ?? '';
        const rawAmount: string = record?.amount ?? record?.data?.amount ?? '0';
        const amount = rawAmount.replace('u128', '').trim();
        if (tokenId) {
          newBalances[tokenId] = (
            BigInt(newBalances[tokenId] || '0') + BigInt(amount || '0')
          ).toString();
        }
      });
      if (Object.keys(newBalances).length > 0) {
        setBalances(newBalances);
      }
    } catch (error) {
      console.error('[GhostSwap] Failed to refresh balances:', error);
    } finally {
      setIsLoading(false);
    }
  }, [connected, requestRecords, setBalances]);

  useEffect(() => {
    if (connected) refreshBalances();
  }, [connected, refreshBalances]);

  return { balances, isLoading, refreshBalances };
}
