// In-memory storage for deposit sessions
// Designed to be easily replaceable with Redis or database

interface StoredSession {
  data: any;
  expiresAt: number;
}

class DepositSessionStorage {
  private sessions: Map<string, StoredSession> = new Map();
  private readonly TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Create a new session
   */
  createSession(sessionId: string, data: any, ttlMs?: number): void {
    const expiresAt = Date.now() + (ttlMs || this.TTL_MS);
    this.sessions.set(sessionId, {
      data,
      expiresAt,
    });

    // Clean up expired sessions periodically
    this.cleanup();
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): any | null {
    const stored = this.sessions.get(sessionId);

    if (!stored) {
      return null;
    }

    // Check if expired
    if (Date.now() > stored.expiresAt) {
      this.sessions.delete(sessionId);
      return null;
    }

    return stored.data;
  }

  /**
   * Update session data
   */
  updateSession(sessionId: string, data: Partial<any>): boolean {
    const stored = this.sessions.get(sessionId);

    if (!stored) {
      return false;
    }

    // Check if expired
    if (Date.now() > stored.expiresAt) {
      this.sessions.delete(sessionId);
      return false;
    }

    // Merge with existing data
    stored.data = {
      ...stored.data,
      ...data,
    };

    return true;
  }

  /**
   * Delete session
   */
  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * Check if session exists
   */
  hasSession(sessionId: string): boolean {
    const stored = this.sessions.get(sessionId);
    if (!stored) {
      return false;
    }

    // Check if expired
    if (Date.now() > stored.expiresAt) {
      this.sessions.delete(sessionId);
      return false;
    }

    return true;
  }

  /**
   * Clean up expired sessions
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [sessionId, stored] of this.sessions.entries()) {
      if (now > stored.expiresAt) {
        this.sessions.delete(sessionId);
      }
    }
  }

  /**
   * Get all active sessions (for debugging/admin)
   */
  getAllSessions(): Array<{ sessionId: string; data: any; expiresAt: number }> {
    const now = Date.now();
    const active: Array<{ sessionId: string; data: any; expiresAt: number }> = [];

    for (const [sessionId, stored] of this.sessions.entries()) {
      if (now <= stored.expiresAt) {
        active.push({
          sessionId,
          data: stored.data,
          expiresAt: stored.expiresAt,
        });
      }
    }

    return active;
  }
}

// Singleton instance (stable across Next.js hot reloads)
const GLOBAL_KEY = '__DEPOSIT_SESSION_STORAGE__';

type GlobalWithDepositStorage = typeof globalThis & {
  [GLOBAL_KEY]?: DepositSessionStorage;
};

const globalWithStorage = globalThis as GlobalWithDepositStorage;

if (!globalWithStorage[GLOBAL_KEY]) {
  globalWithStorage[GLOBAL_KEY] = new DepositSessionStorage();
}

export const depositSessionStorage =
  globalWithStorage[GLOBAL_KEY] as DepositSessionStorage;

// Helper function to generate session ID
export function generateSessionId(): string {
  return `deposit_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

