import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

// Use a consistent encryption key (in a real app, this would be in environment variables)
const RAW_KEY = process.env.COOKIE_ENCRYPTION_KEY || 'a-32-character-encryption-key-here123';
// Ensure the key is exactly 32 bytes (256 bits) for AES-256
const ENCRYPTION_KEY = createHash('sha256').update(RAW_KEY).digest();
const ALGORITHM = 'aes-256-cbc';

/**
 * Encrypt data to use in a cookie
 */
export function encryptData(data: Record<string, any>): string {
  try {
    // Generate a random initialization vector
    const iv = randomBytes(16);
    // Create cipher with key and iv
    const cipher = createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    
    // Encrypt the data
    const serialized = JSON.stringify(data);
    let encrypted = cipher.update(serialized, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    // Combine the IV and encrypted data
    return `${iv.toString('base64')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    return '';
  }
}

/**
 * Decrypt data from a cookie
 */
export function decryptData(cookieValue: string): Record<string, any> | null {
  try {
    // Split the IV and encrypted data
    const [ivBase64, encrypted] = cookieValue.split(':');
    if (!ivBase64 || !encrypted) {
      return null;
    }
    
    // Create decipher with key and iv
    const iv = Buffer.from(ivBase64, 'base64');
    const decipher = createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    
    // Decrypt the data
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    // Parse the decrypted JSON string
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
} 