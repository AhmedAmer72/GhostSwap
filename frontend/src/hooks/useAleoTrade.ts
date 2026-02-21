import { useState, useCallback, useEffect } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { TradeOrder, Token, useAppStore } from '@/utils/store';
import { 
  executeCreate, 
  executeSwap, 
  executeCancel,
  executeMint,
  getGhostTokenRecords,
  GhostTokenRecord,
  TradeOrderRecord,
  PROGRAM_ID,
  toAleoField,
  toAleoU128
} from '@/utils/aleo';
import { generateTradeOrder, createShareableUrl } from '@/utils/crypto';

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
  isProcessing: boolean;
  error: string | null;
  clearError: () => void;
}

export function useAleoTrade(): UseAleoTradeReturn {
  const { connected, address, executeTransaction } = useWallet();
  const { addOrder, updateOrderStatus, addTransaction, setLoading } = useAppStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const createTrade = useCallback(
    async (
      offerToken: Token,
      offerAmount: string,
      requestToken: Token,
      requestAmount: string,
      expiresInHours: number = 24
    ): Promise<string> => {
      if (!connected || !address) {
        throw new Error('Wallet not connected');
      }

      setIsProcessing(true);
      setError(null);

      try {
        // Generate order locally first
        const order = generateTradeOrder(
          address,
          offerToken,
          offerAmount,
          requestToken,
          requestAmount,
          expiresInHours
        );

        // Execute on-chain create transition
        if (executeTransaction) {
          try {
            const result = await executeTransaction({
              program: PROGRAM_ID,
              function: 'create',
              inputs: [
                // GhostToken record - wallet will select from user's records
                `{ owner: ${address}, token_id: ${toAleoField(offerToken.tokenId.replace('field', ''))}, amount: ${toAleoU128(offerAmount)} }`,
                toAleoField(requestToken.tokenId.replace('field', '')),
                toAleoU128(requestAmount),
              ],
              fee: 500000,
            });
            if (result?.transactionId) {
              order.orderId = result.transactionId;
            }
          } catch (txErr: any) {
            console.warn('On-chain transaction failed, using local order:', txErr.message);
          }
        }

        // Add to local store
        addOrder(order);

        // Add transaction record
        addTransaction({
          id: order.orderId,
          type: 'create_order',
          status: 'confirmed',
          timestamp: Date.now(),
          orderId: order.orderId,
        });

        // Generate shareable URL
        const shareUrl = createShareableUrl(order);

        return shareUrl;
      } catch (err: any) {
        const errorMsg = err.message || 'Failed to create trade';
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setIsProcessing(false);
      }
    },
    [connected, address, executeTransaction, addOrder, addTransaction]
  );

  const executeTrade = useCallback(
    async (order: TradeOrder, takerToken: Token, takerAmount: string): Promise<string> => {
      if (!connected || !address) {
        throw new Error('Wallet not connected');
      }

      setIsProcessing(true);
      setError(null);

      try {
        let txId = `tx_${Date.now()}`;

        // Execute on-chain swap transition
        if (executeTransaction) {
          try {
            const result = await executeTransaction({
              program: PROGRAM_ID,
              function: 'swap',
              inputs: [
                // TradeOrder record
                `{ owner: ${order.makerAddress}, maker_token_id: ${toAleoField(order.makerToken.tokenId.replace('field', ''))}, maker_amount: ${toAleoU128(order.makerAmount)}, taker_token_id: ${toAleoField(order.takerToken.tokenId.replace('field', ''))}, taker_amount: ${toAleoU128(order.takerAmount)}, order_id: ${toAleoField(order.orderId)} }`,
                // Payment GhostToken record
                `{ owner: ${address}, token_id: ${toAleoField(takerToken.tokenId.replace('field', ''))}, amount: ${toAleoU128(takerAmount)} }`,
              ],
              fee: 750000,
            });
            if (result?.transactionId) {
              txId = result.transactionId;
            }
          } catch (txErr: any) {
            console.warn('On-chain swap failed:', txErr.message);
            throw txErr;
          }
        }

        // Update order status
        updateOrderStatus(order.orderId, 'fulfilled');

        // Add transaction record
        addTransaction({
          id: txId,
          type: 'execute_swap',
          status: 'confirmed',
          timestamp: Date.now(),
          orderId: order.orderId,
        });

        return txId;
      } catch (err: any) {
        const errorMsg = err.message || 'Failed to execute swap';
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setIsProcessing(false);
      }
    },
    [connected, address, executeTransaction, updateOrderStatus, addTransaction]
  );

  const cancelTrade = useCallback(
    async (order: TradeOrder): Promise<string> => {
      if (!connected || !address) {
        throw new Error('Wallet not connected');
      }

      setIsProcessing(true);
      setError(null);

      try {
        let txId = `tx_cancel_${Date.now()}`;

        // Execute on-chain cancel transition
        if (executeTransaction) {
          try {
            const result = await executeTransaction({
              program: PROGRAM_ID,
              function: 'cancel',
              inputs: [
                // TradeOrder record
                `{ owner: ${order.makerAddress}, maker_token_id: ${toAleoField(order.makerToken.tokenId.replace('field', ''))}, maker_amount: ${toAleoU128(order.makerAmount)}, taker_token_id: ${toAleoField(order.takerToken.tokenId.replace('field', ''))}, taker_amount: ${toAleoU128(order.takerAmount)}, order_id: ${toAleoField(order.orderId)} }`,
              ],
              fee: 300000,
            });
            if (result?.transactionId) {
              txId = result.transactionId;
            }
          } catch (txErr: any) {
            console.warn('On-chain cancel failed:', txErr.message);
            throw txErr;
          }
        }

        // Update order status
        updateOrderStatus(order.orderId, 'cancelled');

        // Add transaction record
        addTransaction({
          id: txId,
          type: 'cancel_order',
          status: 'confirmed',
          timestamp: Date.now(),
          orderId: order.orderId,
        });

        return txId;
      } catch (err: any) {
        const errorMsg = err.message || 'Failed to cancel order';
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setIsProcessing(false);
      }
    },
    [connected, address, executeTransaction, updateOrderStatus, addTransaction]
  );

  const mintTokens = useCallback(
    async (tokenId: string, amount: string): Promise<string> => {
      if (!connected || !address) {
        throw new Error('Wallet not connected');
      }

      setIsProcessing(true);
      setError(null);

      try {
        let txId = `tx_mint_${Date.now()}`;

        // Execute mint transition (testnet only)
        if (executeTransaction) {
          try {
            const result = await executeTransaction({
              program: PROGRAM_ID,
              function: 'mint',
              inputs: [
                toAleoField(tokenId.replace('field', '')),
                toAleoU128(amount),
              ],
              fee: 300000,
            });
            if (result?.transactionId) {
              txId = result.transactionId;
            }
          } catch (txErr: any) {
            console.warn('On-chain mint failed:', txErr.message);
            throw txErr;
          }
        }

        return txId;
      } catch (err: any) {
        const errorMsg = err.message || 'Failed to mint tokens';
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setIsProcessing(false);
      }
    },
    [connected, address, executeTransaction]
  );

  return {
    createTrade,
    executeTrade,
    cancelTrade,
    mintTokens,
    isProcessing,
    error,
    clearError,
  };
}

// Hook for fetching and managing token balances
export function useTokenBalances() {
  const { connected, address, requestRecords } = useWallet();
  const { balances, setBalances } = useAppStore();
  const [isLoading, setIsLoading] = useState(false);

  const refreshBalances = useCallback(async () => {
    if (!connected) return;

    setIsLoading(true);
    try {
      // Fetch actual balances from Aleo via wallet
      if (requestRecords) {
        const records = await requestRecords(PROGRAM_ID);
        // Process records into balances
        const newBalances: Record<string, string> = {};
        records?.forEach((record: any) => {
          if (record.data?.token_id && record.data?.amount) {
            const tokenId = record.data.token_id;
            const amount = record.data.amount.replace('u128', '');
            newBalances[tokenId] = (BigInt(newBalances[tokenId] || '0') + BigInt(amount)).toString();
          }
        });
        if (Object.keys(newBalances).length > 0) {
          setBalances(newBalances);
        }
      }
    } catch (error) {
      console.error('Failed to refresh balances:', error);
    } finally {
      setIsLoading(false);
    }
  }, [connected, requestRecords, setBalances]);

  useEffect(() => {
    if (connected) {
      refreshBalances();
    }
  }, [connected, refreshBalances]);

  return {
    balances,
    isLoading,
    refreshBalances,
  };
}
