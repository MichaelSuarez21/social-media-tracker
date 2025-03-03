/**
 * Twitter OAuth utility functions
 */

/**
 * Generates a random code verifier for PKCE
 * @returns A random string
 */
export function generateCodeVerifier(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  const charactersLength = characters.length;
  
  // Generate a random string between 43 and 128 characters
  const length = Math.floor(Math.random() * (128 - 43 + 1)) + 43;
  
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  
  return result;
}

/**
 * Generates a code challenge from a code verifier using SHA-256
 * @param codeVerifier - The code verifier to create a challenge from
 * @returns The code challenge
 */
export async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  // Convert the code verifier to a Uint8Array
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  
  // Hash the code verifier using SHA-256
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  // Convert the hash to a Base64 URL encoded string
  return base64UrlEncode(new Uint8Array(hashBuffer));
}

/**
 * Converts a Uint8Array to a Base64 URL encoded string
 * @param input - The Uint8Array to encode
 * @returns Base64 URL encoded string
 */
function base64UrlEncode(input: Uint8Array): string {
  // Convert the Uint8Array to a Base64 string
  const base64 = btoa(String.fromCharCode(...input));
  
  // Convert the Base64 string to a Base64 URL encoded string
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
} 