/**
 * Storage Encryption Utility
 * 
 * Encrypts sensitive data before storing in localStorage to protect against XSS attacks.
 * This is a client-side encryption layer - for maximum security, use httpOnly cookies.
 */

import CryptoJS from 'crypto-js';

// Get encryption key from environment variable
// In production, this should be a strong, randomly generated key
const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_STORAGE_ENCRYPTION_KEY || 'default-key-change-in-production';

/**
 * Encrypts data before storing in localStorage
 */
export function encryptStorageData(data: any): string {
  try {
    const jsonString = JSON.stringify(data);
    const encrypted = CryptoJS.AES.encrypt(jsonString, ENCRYPTION_KEY).toString();
    return encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypts data retrieved from localStorage
 */
export function decryptStorageData(encrypted: string): any {
  try {
    const bytes = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!decrypted) {
      throw new Error('Decryption failed - invalid data');
    }
    
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    // Return null if decryption fails (data might be corrupted or from old format)
    return null;
  }
}

/**
 * Safely sets encrypted data in localStorage
 */
export function setEncryptedItem(key: string, data: any): void {
  if (typeof window === 'undefined') return;
  
  try {
    const encrypted = encryptStorageData(data);
    localStorage.setItem(key, encrypted);
  } catch (error) {
    console.error(`Failed to set encrypted item ${key}:`, error);
  }
}

/**
 * Safely gets and decrypts data from localStorage
 */
export function getEncryptedItem<T = any>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const encrypted = localStorage.getItem(key);
    if (!encrypted) return null;
    
    return decryptStorageData(encrypted) as T;
  } catch (error) {
    console.error(`Failed to get encrypted item ${key}:`, error);
    // Clear corrupted data
    localStorage.removeItem(key);
    return null;
  }
}

/**
 * Removes encrypted item from localStorage
 */
export function removeEncryptedItem(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(key);
}

/**
 * Checks if data should be cleared based on TTL (Time To Live)
 */
export function shouldClearData(timestampKey: string, ttlMs: number): boolean {
  if (typeof window === 'undefined') return false;
  
  const timestampStr = localStorage.getItem(timestampKey);
  if (!timestampStr) return true; // No timestamp, should clear
  
  try {
    const timestamp = parseInt(timestampStr, 10);
    const now = Date.now();
    return (now - timestamp) > ttlMs;
  } catch {
    return true; // Invalid timestamp, should clear
  }
}

/**
 * Sets data with expiration timestamp
 */
export function setEncryptedItemWithTTL(key: string, data: any, ttlMs: number): void {
  if (typeof window === 'undefined') return;
  
  setEncryptedItem(key, data);
  const timestampKey = `${key}_timestamp`;
  localStorage.setItem(timestampKey, Date.now().toString());
  
  // Set expiration time
  const expirationKey = `${key}_ttl`;
  localStorage.setItem(expirationKey, ttlMs.toString());
}

/**
 * Gets data and checks if it's expired
 */
export function getEncryptedItemWithTTL<T = any>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  
  const timestampKey = `${key}_timestamp`;
  const expirationKey = `${key}_ttl`;
  
  const ttlStr = localStorage.getItem(expirationKey);
  if (!ttlStr) {
    // No TTL set, return data if exists
    return getEncryptedItem<T>(key);
  }
  
  const ttl = parseInt(ttlStr, 10);
  if (shouldClearData(timestampKey, ttl)) {
    // Data expired, clear it
    removeEncryptedItem(key);
    localStorage.removeItem(timestampKey);
    localStorage.removeItem(expirationKey);
    return null;
  }
  
  return getEncryptedItem<T>(key);
}

