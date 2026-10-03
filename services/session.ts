/**
 * Current auth token, readable outside React (API client, socket, services).
 * AuthContext owns persistence and keeps this in sync.
 *
 * "Überall abmelden" (plan 2.9) swaps the token while requests may still be
 * on their way: the backend ends every session, the old token is refused
 * from then on and the answer brings a new one. A 401 for the old token is
 * expected in that moment and must not sign this device out, so
 * handleUnauthorized ignores 401s for a token that is no longer the current
 * one, and all 401s while swapToken runs.
 */
let token: string | null = null;
let unauthorizedHandler: (() => void) | null = null;
let swaps = 0;

export const session = {
  getToken: () => token,
  setToken: (value: string | null) => {
    token = value;
  },
  /** Called when the backend rejects the token (expired or revoked). */
  onUnauthorized: (handler: (() => void) | null) => {
    unauthorizedHandler = handler;
  },
  /**
   * The backend refused `usedToken` (the token the request was sent with).
   * Signs out only when that is still the current token and no swap runs.
   */
  handleUnauthorized: (usedToken?: string | null) => {
    if (swaps > 0) return;
    if (usedToken !== undefined && usedToken !== token) return;
    unauthorizedHandler?.();
  },
  /**
   * Run `swap` (fetch a new token and store it) without being signed out by
   * 401s for the old token meanwhile. Resolves with what `swap` returns.
   */
  swapToken: async <T>(swap: () => Promise<T>): Promise<T> => {
    swaps += 1;
    try {
      return await swap();
    } finally {
      swaps -= 1;
    }
  },
};
