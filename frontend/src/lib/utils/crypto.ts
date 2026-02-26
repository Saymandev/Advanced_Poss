/**
 * Shared decryption utility for API responses
 */

const SECRET = 'ykg44s8k80wsok80s880w0gw';
const SALT = 'response-encryption-salt';

export const decryptData = async (body: any): Promise<any> => {
  try {
    // Only run in browser
    if (typeof window === 'undefined' || !window.crypto?.subtle) {
      return body;
    }

    // Handle wrapped format: { success: true, data: { encrypted: true, ... } }
    let target = body;
    if (
      body &&
      typeof body === 'object' &&
      'success' in body &&
      'data' in body &&
      body.data &&
      typeof body.data === 'object' &&
      'encrypted' in body.data
    ) {
      target = body.data;
    }

    if (
      !target ||
      typeof target !== 'object' ||
      !target.encrypted ||
      !target.iv ||
      !target.data
    ) {
      return body;
    }

    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      enc.encode(SECRET),
      { name: 'PBKDF2' },
      false,
      ['deriveKey'],
    );

    const key = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: enc.encode(SALT),
        iterations: 1000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-CBC', length: 256 },
      false,
      ['decrypt'],
    );

    const iv = Uint8Array.from(atob(target.iv || ''), (c) => c.charCodeAt(0));
    const cipherBytes = Uint8Array.from(atob(target.data || ''), (c) => c.charCodeAt(0));

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-CBC', iv },
      key,
      cipherBytes,
    );

    const decoded = new TextDecoder().decode(decryptedBuffer);
    
    try {
      return JSON.parse(decoded);
    } catch {
      return decoded;
    }
  } catch (error) {
    console.error('[Crypto] Decryption failed:', error);
    return body;
  }
};
