// Aleo blockchain integration utilities
// Compatible with Shield Wallet and Aleo SDK

import { TradeOrder, Token, TOKENS } from './store';

// Aleo network configuration
export const ALEO_NETWORK = {
  testnet: {
    endpoint: 'https://api.explorer.aleo.org/v1/testnet',
    programId: 'ghostswap_v1.aleo',
  },
  mainnet: {
    endpoint: 'https://api.explorer.aleo.org/v1/mainnet',
    programId: 'ghostswap_v1.aleo',
  },
};

// Current network
export const CURRENT_NETWORK = 'testnet';
export const PROGRAM_ID = ALEO_NETWORK[CURRENT_NETWORK].programId;

// Aleo Record types
export interface AleoRecord {
  owner: string;
  data: Record<string, string>;
  nonce: string;
}

export interface GhostTokenRecord extends AleoRecord {
  data: {
    owner: string;
    token_id: string;
    amount: string;
  };
}

export interface TradeOrderRecord extends AleoRecord {
  data: {
    owner: string;
    maker_token_id: string;
    maker_amount: string;
    taker_token_id: string;
    taker_amount: string;
    order_id: string;
    nonce: string;
    expires_at: string;
  };
}

// Convert JS values to Aleo field format
export function toAleoField(value: string | number | bigint): string {
  return `${value}field`;
}

export function toAleoU128(value: string | number | bigint): string {
  return `${value}u128`;
}

export function toAleoU64(value: string | number | bigint): string {
  return `${value}u64`;
}

export function toAleoAddress(address: string): string {
  // Validate Aleo address format
  if (!address.startsWith('aleo1') || address.length !== 63) {
    throw new Error('Invalid Aleo address format');
  }
  return address;
}

// Parse Aleo values back to JS
export function parseAleoField(field: string): string {
  return field.replace('field', '');
}

export function parseAleoU128(value: string): string {
  return value.replace('u128', '');
}

export function parseAleoU64(value: string): string {
  return value.replace('u64', '');
}

// Build transition inputs for create_order
export function buildCreateOrderInputs(
  makerToken: GhostTokenRecord,
  takerTokenId: string,
  takerAmount: string,
  nonce: string,
  expiresAt: number
): string[] {
  return [
    JSON.stringify(makerToken), // maker_token: GhostToken record
    toAleoField(takerTokenId),  // taker_token_id: field
    toAleoU128(takerAmount),    // taker_amount: u128
    toAleoField(nonce),         // nonce: field  
    toAleoU64(expiresAt),       // expires_at: u64
  ];
}

// Build transition inputs for execute_swap
export function buildExecuteSwapInputs(
  claimTicket: AleoRecord,
  takerToken: GhostTokenRecord,
  makerOrder: TradeOrderRecord
): string[] {
  return [
    JSON.stringify(claimTicket),
    JSON.stringify(takerToken),
    JSON.stringify(makerOrder),
  ];
}

// Build transition inputs for cancel_order
export function buildCancelOrderInputs(order: TradeOrderRecord): string[] {
  return [JSON.stringify(order)];
}

// Interact with Shield Wallet
export interface ShieldWalletAdapter {
  connect(): Promise<{ address: string; publicKey: string }>;
  disconnect(): Promise<void>;
  signMessage(message: string): Promise<string>;
  requestTransaction(params: TransactionParams): Promise<string>;
  getRecords(programId: string): Promise<AleoRecord[]>;
  decrypt(ciphertext: string): Promise<string>;
}

export interface TransactionParams {
  programId: string;
  functionName: string;
  inputs: string[];
  fee: number;
}

// Check if Shield Wallet is available
export function isShieldWalletAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  // Check for various Aleo wallet providers
  return !!(
    (window as any).shieldWallet || 
    (window as any).aleo || 
    (window as any).leoWallet ||
    (window as any).puzzle
  );
}

// Get Shield Wallet adapter
export function getShieldWallet(): ShieldWalletAdapter | null {
  if (typeof window === 'undefined') return null;
  
  // Try different wallet providers
  const wallet = (window as any).shieldWallet || 
                 (window as any).aleo || 
                 (window as any).leoWallet ||
                 (window as any).puzzle;
  
  if (!wallet) return null;
  
  // Normalize the wallet API
  return {
    connect: async () => {
      // Handle different wallet connection methods
      if (typeof wallet.connect === 'function') {
        const result = await wallet.connect();
        // Leo Wallet returns { publicKey, ... }
        // Shield Wallet might return { address, publicKey }
        const publicKey = result?.publicKey || result?.address || result;
        const address = typeof publicKey === 'string' && publicKey.startsWith('aleo1') 
          ? publicKey 
          : result?.address || publicKey;
        return { address, publicKey: address };
      }
      if (typeof wallet.requestAccess === 'function') {
        await wallet.requestAccess();
        const address = await wallet.getSelectedAccount?.() || wallet.publicKey;
        return { address, publicKey: address };
      }
      throw new Error('Wallet does not support connect method');
    },
    disconnect: async () => {
      if (typeof wallet.disconnect === 'function') {
        await wallet.disconnect();
      }
    },
    signMessage: async (message: string) => {
      if (typeof wallet.signMessage === 'function') {
        return await wallet.signMessage(message);
      }
      if (typeof wallet.sign === 'function') {
        return await wallet.sign(message);
      }
      throw new Error('Wallet does not support signing');
    },
    requestTransaction: async (params: TransactionParams) => {
      if (typeof wallet.requestTransaction === 'function') {
        return await wallet.requestTransaction(params);
      }
      if (typeof wallet.execute === 'function') {
        return await wallet.execute({
          program: params.programId,
          function: params.functionName,
          inputs: params.inputs,
          fee: params.fee,
        });
      }
      throw new Error('Wallet does not support transactions');
    },
    getRecords: async (programId: string) => {
      if (typeof wallet.getRecords === 'function') {
        return await wallet.getRecords(programId);
      }
      if (typeof wallet.requestRecords === 'function') {
        return await wallet.requestRecords(programId);
      }
      return [];
    },
    decrypt: async (ciphertext: string) => {
      if (typeof wallet.decrypt === 'function') {
        return await wallet.decrypt(ciphertext);
      }
      throw new Error('Wallet does not support decryption');
    },
  };
}

// Connect to Shield Wallet
export async function connectShieldWallet(): Promise<{ address: string; publicKey: string } | null> {
  const wallet = getShieldWallet();
  if (!wallet) {
    throw new Error('Shield Wallet not found. Please install Shield Wallet extension.');
  }
  
  try {
    const result = await wallet.connect();
    return result;
  } catch (error) {
    console.error('Failed to connect to Shield Wallet:', error);
    throw error;
  }
}

// Disconnect from Shield Wallet
export async function disconnectShieldWallet(): Promise<void> {
  const wallet = getShieldWallet();
  if (wallet) {
    await wallet.disconnect();
  }
}

// Execute create_order transition
export async function executeCreateOrder(
  makerToken: Token,
  makerAmount: string,
  takerToken: Token,
  takerAmount: string,
  nonce: string,
  expiresAt: number,
  fee: number = 100000 // 0.1 ALEO default fee
): Promise<string> {
  const wallet = getShieldWallet();
  if (!wallet) {
    throw new Error('Shield Wallet not connected');
  }

  // Build the GhostToken record for maker
  const makerTokenRecord: GhostTokenRecord = {
    owner: '', // Will be filled by wallet
    nonce: '',
    data: {
      owner: '',
      token_id: makerToken.tokenId,
      amount: toAleoU128(makerAmount),
    },
  };

  const inputs = [
    JSON.stringify(makerTokenRecord),
    toAleoField(takerToken.tokenId.replace('field', '')),
    toAleoU128(takerAmount),
    toAleoField(nonce),
    toAleoU64(expiresAt),
  ];

  const txId = await wallet.requestTransaction({
    programId: PROGRAM_ID,
    functionName: 'create_order',
    inputs,
    fee,
  });

  return txId;
}

// Execute swap transition
export async function executeSwap(
  order: TradeOrder,
  takerToken: Token,
  takerAmount: string,
  fee: number = 150000 // 0.15 ALEO default fee for swap
): Promise<string> {
  const wallet = getShieldWallet();
  if (!wallet) {
    throw new Error('Shield Wallet not connected');
  }

  // In production, these records would come from the wallet
  const claimTicket = {
    owner: '',
    nonce: '',
    data: {
      order_id: toAleoField(order.orderId),
      maker_address: order.makerAddress,
      maker_token_id: order.makerToken.tokenId,
      maker_amount: toAleoU128(order.makerAmount),
      taker_token_id: order.takerToken.tokenId,
      taker_amount: toAleoU128(order.takerAmount),
    },
  };

  const takerTokenRecord = {
    owner: '',
    nonce: '',
    data: {
      owner: '',
      token_id: takerToken.tokenId,
      amount: toAleoU128(takerAmount),
    },
  };

  const makerOrderRecord = {
    owner: order.makerAddress,
    nonce: order.nonce,
    data: {
      owner: order.makerAddress,
      maker_token_id: order.makerToken.tokenId,
      maker_amount: toAleoU128(order.makerAmount),
      taker_token_id: order.takerToken.tokenId,
      taker_amount: toAleoU128(order.takerAmount),
      order_id: toAleoField(order.orderId),
      nonce: toAleoField(order.nonce),
      expires_at: toAleoU64(order.expiresAt),
    },
  };

  const txId = await wallet.requestTransaction({
    programId: PROGRAM_ID,
    functionName: 'execute_swap',
    inputs: [
      JSON.stringify(claimTicket),
      JSON.stringify(takerTokenRecord),
      JSON.stringify(makerOrderRecord),
    ],
    fee,
  });

  return txId;
}

// Cancel order transition
export async function executeCancelOrder(
  order: TradeOrder,
  fee: number = 50000
): Promise<string> {
  const wallet = getShieldWallet();
  if (!wallet) {
    throw new Error('Shield Wallet not connected');
  }

  const orderRecord = {
    owner: order.makerAddress,
    nonce: order.nonce,
    data: {
      owner: order.makerAddress,
      maker_token_id: order.makerToken.tokenId,
      maker_amount: toAleoU128(order.makerAmount),
      taker_token_id: order.takerToken.tokenId,
      taker_amount: toAleoU128(order.takerAmount),
      order_id: toAleoField(order.orderId),
      nonce: toAleoField(order.nonce),
      expires_at: toAleoU64(order.expiresAt),
    },
  };

  const txId = await wallet.requestTransaction({
    programId: PROGRAM_ID,
    functionName: 'cancel_order',
    inputs: [JSON.stringify(orderRecord)],
    fee,
  });

  return txId;
}

// Mint test tokens (testnet only)
export async function mintTestTokens(
  tokenId: string,
  amount: string,
  fee: number = 50000
): Promise<string> {
  const wallet = getShieldWallet();
  if (!wallet) {
    throw new Error('Shield Wallet not connected');
  }

  const txId = await wallet.requestTransaction({
    programId: PROGRAM_ID,
    functionName: 'mint_test_tokens',
    inputs: [
      toAleoField(tokenId.replace('field', '')),
      toAleoU128(amount),
    ],
    fee,
  });

  return txId;
}

// Get user's GhostToken records
export async function getGhostTokenRecords(): Promise<GhostTokenRecord[]> {
  const wallet = getShieldWallet();
  if (!wallet) {
    return [];
  }

  try {
    const records = await wallet.getRecords(PROGRAM_ID);
    return records.filter((r) => r.data.token_id) as GhostTokenRecord[];
  } catch (error) {
    console.error('Failed to get records:', error);
    return [];
  }
}

// Format token balance from records
export function calculateTokenBalance(
  records: GhostTokenRecord[],
  tokenId: string
): bigint {
  return records
    .filter((r) => r.data.token_id === tokenId)
    .reduce((sum, r) => sum + BigInt(parseAleoU128(r.data.amount)), 0n);
}
