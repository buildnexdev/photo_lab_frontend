// Developer by: Buildnexdev.in
// API payload encryption & decryption using browser-native Web Crypto API (AES-256-CBC)

const SECRET_STR =
    (import.meta.env.VITE_API_CRYPTO_SECRET as string | undefined) ||
    'photolab-secure-payload-encryption-secret-key-2026!';

let cachedKeyPromise: Promise<CryptoKey> | null = null;

function getCryptoKey(): Promise<CryptoKey> {
    if (!cachedKeyPromise) {
        cachedKeyPromise = (async () => {
            const enc = new TextEncoder();
            const hash = await crypto.subtle.digest('SHA-256', enc.encode(SECRET_STR));
            return crypto.subtle.importKey('raw', hash, { name: 'AES-CBC' }, false, ['encrypt', 'decrypt']);
        })();
    }
    return cachedKeyPromise;
}

function bufToHex(buf: Uint8Array): string {
    let hex = '';
    for (let i = 0; i < buf.length; i++) {
        hex += buf[i].toString(16).padStart(2, '0');
    }
    return hex;
}

function hexToBuf(hex: string): Uint8Array {
    const len = hex.length / 2;
    const buf = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        buf[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
    }
    return buf;
}

/**
 * Encrypt any JavaScript object or value into an AES-256-CBC hex string (iv:ciphertext).
 */
export async function encryptPayload(data: unknown): Promise<string> {
    const json = typeof data === 'string' ? data : JSON.stringify(data);
    const iv = crypto.getRandomValues(new Uint8Array(16));
    const key = await getCryptoKey();
    const encBuf = await crypto.subtle.encrypt({ name: 'AES-CBC', iv }, key, new TextEncoder().encode(json));
    return `${bufToHex(iv)}:${bufToHex(new Uint8Array(encBuf))}`;
}

/**
 * Decrypt an AES-256-CBC hex string (iv:ciphertext) back into a parsed JavaScript object or value.
 */
export async function decryptPayload<T = any>(payload: string): Promise<T> {
    if (!payload || typeof payload !== 'string' || !payload.includes(':')) {
        return payload as unknown as T;
    }
    const [ivHex, encHex] = payload.split(':');
    const iv = hexToBuf(ivHex);
    const data = hexToBuf(encHex);
    const key = await getCryptoKey();
    const decryptedBuf = await crypto.subtle.decrypt({ name: 'AES-CBC', iv: iv as any }, key, data as any);
    const text = new TextDecoder().decode(decryptedBuf);
    try {
        return JSON.parse(text) as T;
    } catch {
        return text as unknown as T;
    }
}

// Expose helper on window for debugging in Chrome DevTools Console:
if (typeof window !== 'undefined') {
    (window as any).__decrypt = decryptPayload;
    (window as any).__encrypt = encryptPayload;
}

