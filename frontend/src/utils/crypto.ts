import { nanoid } from 'nanoid';
import { TradeOrder, Token } from './store';

// Encryption key derived from a secret (in production, this would be more sophisticated)
const ENCRYPTION_VERSION = '1';
const LINK_PREFIX = 'ghost';

// Encode trade data for shareable link.
// Uses URL-safe base64 JSON — no encryption needed since the link's
// randomness (orderId + nonce) already acts as an unguessable capability URL.
export function encodeTradeLink(order: TradeOrder): string {
  const payload: Record<string, unknown> = {
    v: '2',
    oid: order.orderId,
    ma: order.makerAddress,
    mt: order.makerToken.id,
    mam: order.makerAmount,
    tt: order.takerToken.id,
    tam: order.takerAmount,
    n: order.nonce,
    exp: order.expiresAt,
    ts: order.createdAt,
  };
  // Include the record plaintext if Alice has fetched it after generate_ticket
  if (order.recordPlaintext) payload.rp = order.recordPlaintext;
  const b64 = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `${LINK_PREFIX}_v2_${b64}`;
}

// Decode trade data from shareable link
export function decodeTradeLink(linkData: string, tokens: Token[]): TradeOrder | null {
  try {
    const parts = linkData.split('_');
    if (parts[0] !== LINK_PREFIX) throw new Error('Invalid link prefix');

    let payload: Record<string, unknown>;
    if (parts[1] === 'v2') {
      // v2: URL-safe base64 JSON
      const b64 = parts.slice(2).join('_').replace(/-/g, '+').replace(/_/g, '/');
      const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
      payload = JSON.parse(atob(padded));
    } else {
      throw new Error('Unrecognised link format — please ask the sender to generate a new link.');
    }

    const makerToken = tokens.find(t => t.id === payload.mt);
    const takerToken = tokens.find(t => t.id === payload.tt);
    if (!makerToken || !takerToken) throw new Error('Unknown token in trade');

    return {
      orderId: payload.oid as string,
      makerAddress: payload.ma as string,
      makerToken,
      makerAmount: payload.mam as string,
      takerToken,
      takerAmount: payload.tam as string,
      nonce: payload.n as string,
      expiresAt: payload.exp as number,
      createdAt: payload.ts as number,
      status: 'pending',
      recordPlaintext: (payload.rp as string | undefined) ?? undefined,
    };
  } catch (error) {
    console.error('Failed to decode trade link:', error);
    return null;
  }
}

// Generate a new trade order
export function generateTradeOrder(
  makerAddress: string,
  makerToken: Token,
  makerAmount: string,
  takerToken: Token,
  takerAmount: string,
  expiresInHours: number = 24
): TradeOrder {
  const nonce = nanoid(32);
  const now = Date.now();
  
  return {
    orderId: `order_${nanoid(16)}`,
    makerAddress,
    makerToken,
    makerAmount,
    takerToken,
    takerAmount,
    nonce,
    expiresAt: now + expiresInHours * 60 * 60 * 1000,
    createdAt: now,
    status: 'pending',
  };
}

// Create full shareable URL
export function createShareableUrl(order: TradeOrder): string {
  const encoded = encodeTradeLink(order);
  // Use current origin in browser, fallback for SSR
  const origin = typeof window !== 'undefined' 
    ? window.location.origin 
    : 'https://ghostswap.io';
  return `${origin}/claim/${encoded}`;
}

// Extract link data from URL
export function extractLinkData(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const claimIndex = pathParts.indexOf('claim');
    if (claimIndex >= 0 && pathParts[claimIndex + 1]) {
      return pathParts[claimIndex + 1];
    }
    return null;
  } catch {
    // If it's not a full URL, assume it's just the link data
    if (url.startsWith(LINK_PREFIX + '_')) {
      return url;
    }
    return null;
  }
}

// Validate trade order
export function validateTradeOrder(order: TradeOrder): { valid: boolean; error?: string } {
  if (!order.orderId || !order.makerAddress) {
    return { valid: false, error: 'Invalid order data' };
  }

  if (BigInt(order.makerAmount) <= 0n || BigInt(order.takerAmount) <= 0n) {
    return { valid: false, error: 'Invalid amounts' };
  }

  if (order.expiresAt < Date.now()) {
    return { valid: false, error: 'Order has expired' };
  }

  if (order.makerToken.id === order.takerToken.id) {
    return { valid: false, error: 'Cannot swap same token' };
  }

  return { valid: true };
}

// Format address for display
export function shortenAddress(address: string): string {
  if (!address || address.length < 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Calculate time remaining
export function getTimeRemaining(expiresAt: number): string {
  const now = Date.now();
  const diff = expiresAt - now;

  if (diff <= 0) return 'Expired';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }

  return `${hours}h ${minutes}m`;
}
