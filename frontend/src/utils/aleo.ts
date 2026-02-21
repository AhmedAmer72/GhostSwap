// Aleo blockchain integration utilities
// Compatible with Shield Wallet and Aleo SDK

import { TradeOrder, Token, TOKENS } from './store';

// Aleo network configuration
export const ALEO_NETWORK = {
  testnet: {
    endpoint: 'https://api.explorer.aleo.org/v1/testnet',
    programId: 'ghostswap_otc_v2.aleo',
  },
  mainnet: {
    endpoint: 'https://api.explorer.aleo.org/v1/mainnet',
    programId: 'ghostswap_otc_v2.aleo',
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

// Build transition inputs for create (matches deployed contract)
export function buildCreateInputs(
  makerToken: GhostTokenRecord,
  wantTokenId: string,
  wantAmount: string
): string[] {
  return [
    JSON.stringify(makerToken), // token: GhostToken record
    toAleoField(wantTokenId),   // want_id: field
    toAleoU128(wantAmount),     // want_amt: u128
  ];
}

// Build transition inputs for swap (matches deployed contract)
export function buildSwapInputs(
  order: TradeOrderRecord,
  payment: GhostTokenRecord
): string[] {
  return [
    JSON.stringify(order),   // order: TradeOrder record
    JSON.stringify(payment), // payment: GhostToken record
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

// Execute create transition (matches deployed contract)
export async function executeCreate(
  ghostTokenRecord: GhostTokenRecord,
  wantTokenId: string,
  wantAmount: string,
  fee: number = 500000 // 0.5 ALEO default fee
): Promise<string> {
  const wallet = getShieldWallet();
  if (!wallet) {
    throw new Error('Shield Wallet not connected');
  }

  const inputs = buildCreateInputs(ghostTokenRecord, wantTokenId, wantAmount);

  const txId = await wallet.requestTransaction({
    programId: PROGRAM_ID,
    functionName: 'create',
    inputs,
    fee,
  });

  return txId;
}

// Execute swap transition (matches deployed contract)
export async function executeSwap(
  orderRecord: TradeOrderRecord,
  paymentRecord: GhostTokenRecord,
  fee: number = 750000 // 0.75 ALEO default fee for async swap
): Promise<string> {
  const wallet = getShieldWallet();
  if (!wallet) {
    throw new Error('Shield Wallet not connected');
  }

  const inputs = buildSwapInputs(orderRecord, paymentRecord);

  const txId = await wallet.requestTransaction({
    programId: PROGRAM_ID,
    functionName: 'swap',
    inputs,
    fee,
  });

  return txId;
}

// Cancel order transition (matches deployed contract)
export async function executeCancel(
  orderRecord: TradeOrderRecord,
  fee: number = 300000 // 0.3 ALEO fee
): Promise<string> {
  const wallet = getShieldWallet();
  if (!wallet) {
    throw new Error('Shield Wallet not connected');
  }

  const txId = await wallet.requestTransaction({
    programId: PROGRAM_ID,
    functionName: 'cancel',
    inputs: [JSON.stringify(orderRecord)],
    fee,
  });

  return txId;
}

// Mint GhostTokens (testnet only - matches deployed contract)
export async function executeMint(
  tokenId: string,
  amount: string,
  fee: number = 300000 // 0.3 ALEO fee
): Promise<string> {
  const wallet = getShieldWallet();
  if (!wallet) {
    throw new Error('Shield Wallet not connected');
  }

  const txId = await wallet.requestTransaction({
    programId: PROGRAM_ID,
    functionName: 'mint',
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
