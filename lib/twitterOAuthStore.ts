/**
 * Server-side storage for Twitter OAuth sessions
 * This provides a fallback mechanism if cookies don't work correctly
 */

type TwitterOAuthSession = {
  state: string;
  codeVerifier: string;
  isReconnect: boolean;
  created: number;
};

// In-memory store for OAuth sessions
const sessions = new Map<string, TwitterOAuthSession>();

// Store a new OAuth session
export function storeTwitterOAuthSession(
  loginId: string, 
  state: string, 
  codeVerifier: string, 
  isReconnect: boolean
): void {
  sessions.set(loginId, {
    state,
    codeVerifier,
    isReconnect,
    created: Date.now()
  });
  
  // Clean up old sessions periodically
  if (Math.random() < 0.1) { // 10% chance to run cleanup
    cleanupOldSessions();
  }
}

// Get an OAuth session
export function getTwitterOAuthSession(loginId: string): TwitterOAuthSession | null {
  const session = sessions.get(loginId);
  return session || null;
}

// Delete an OAuth session
export function deleteTwitterOAuthSession(loginId: string): void {
  sessions.delete(loginId);
}

// Clean up sessions older than 10 minutes
function cleanupOldSessions(): void {
  const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
  
  for (const [loginId, session] of sessions.entries()) {
    if (session.created < tenMinutesAgo) {
      sessions.delete(loginId);
    }
  }
} 