import { useState, useCallback, useEffect } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { TradeOrder, Token, useAppStore } from '@/utils/store';
import { 
  executeCreate, 
  executeSwap, 
  executeCancel,
  executeMint,
  getGhostTokenRecords,
  GhostTokenRecord,
  TradeOrderRecord,
  PROGRAM_ID 
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
  const { isConnected, address } = useWallet();
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
      if (!isConnected || !address) {
        throw new Error('Wallet not connected');
      }

      setIsProcessing(true);
      setError(null);

      try {
        // Generate order locally
        const order = generateTradeOrder(
          address,
          offerToken,
          offerAmount,
          requestToken,
          requestAmount,
          expiresInHours
        );

        // Execute on-chain transition (if wallet available)
        // For demo mode, we skip this
        // const txId = await executeCreateOrder(...);

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
    [isConnected, address, addOrder, addTransaction]
  );

  const executeTrade = useCallback(
    async (order: TradeOrder, takerToken: Token, takerAmount: string): Promise<string> => {
      if (!isConnected || !address) {
        throw new Error('Wallet not connected');
      }

      setIsProcessing(true);
      setError(null);

      try {
        // Execute on-chain swap
        // const txId = await executeSwap(order, takerToken, takerAmount);

        // For demo, simulate success
        const txId = `tx_${Date.now()}`;

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
    [isConnected, address, updateOrderStatus, addTransaction]
  );

  const cancelTrade = useCallback(
    async (order: TradeOrder): Promise<string> => {
      if (!isConnected || !address) {
        throw new Error('Wallet not connected');
      }

      setIsProcessing(true);
      setError(null);

      try {
        // Execute on-chain cancel
        // const txId = await executeCancelOrder(order);

        // For demo, simulate success
        const txId = `tx_cancel_${Date.now()}`;

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
    [isConnected, address, updateOrderStatus, addTransaction]
  );

  const mintTokens = useCallback(
    async (tokenId: string, amount: string): Promise<string> => {
      if (!isConnected || !address) {
        throw new Error('Wallet not connected');
      }

      setIsProcessing(true);
      setError(null);

      try {
        // Execute mint (testnet only)
        // const txId = await mintTestTokens(tokenId, amount);

        // For demo, simulate success
        const txId = `tx_mint_${Date.now()}`;

        return txId;
      } catch (err: any) {
        const errorMsg = err.message || 'Failed to mint tokens';
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setIsProcessing(false);
      }
    },
    [isConnected, address]
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
  const { isConnected, address } = useWallet();
  const { balances, setBalances } = useAppStore();
  const [isLoading, setIsLoading] = useState(false);

  const refreshBalances = useCallback(async () => {
    if (!isConnected) return;

    setIsLoading(true);
    try {
      // Fetch actual balances from Aleo
      const records = await getGhostTokenRecords();
      
      // Process records into balances
      // For demo, we keep the mock balances
      
    } catch (error) {
      console.error('Failed to refresh balances:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, setBalances]);

  useEffect(() => {
    if (isConnected) {
      refreshBalances();
    }
  }, [isConnected, refreshBalances]);

  return {
    balances,
    isLoading,
    refreshBalances,
  };
}
