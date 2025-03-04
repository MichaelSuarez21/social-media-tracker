/**
 * Simple in-memory session store for PKCE authentication
 * This is used because cookies aren't reliably persisting between redirects
 */

// Store format: { [sessionId]: { state, codeVerifier, isReconnect, createdAt } }
const sessions: Record<string, {
  state: string;
  codeVerifier: string;
  isReconnect: boolean;
  createdAt: number;
}> = {};

/**
 * Create a new auth session
 */
export function createAuthSession(state: string, codeVerifier: string, isReconnect: boolean): string {
  // Generate a random session ID
  const sessionId = Math.random().toString(36).substring(2, 15) + 
                    Math.random().toString(36).substring(2, 15);
  
  // Store the session data
  sessions[sessionId] = {
    state,
    codeVerifier,
    isReconnect,
    createdAt: Date.now()
  };
  
  // Clean up old sessions (older than 10 minutes)
  cleanupOldSessions();
  
  return sessionId;
}

/**
 * Get a session by ID
 */
export function getAuthSession(sessionId: string) {
  return sessions[sessionId];
}

/**
 * Delete a session after use
 */
export function deleteAuthSession(sessionId: string) {
  if (sessions[sessionId]) {
    delete sessions[sessionId];
    return true;
  }
  return false;
}

/**
 * Clean up old sessions
 */
function cleanupOldSessions() {
  const now = Date.now();
  const tenMinutes = 10 * 60 * 1000;
  
  Object.entries(sessions).forEach(([id, session]) => {
    if (now - session.createdAt > tenMinutes) {
      delete sessions[id];
    }
  });
} 