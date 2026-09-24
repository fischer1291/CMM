/**
 * Current auth token, readable outside React (API client, socket, services).
 * AuthContext owns persistence and keeps this in sync.
 */
let token: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

export const session = {
  getToken: () => token,
  setToken: (value: string | null) => {
    token = value;
  },
  /** Called when the backend rejects the token (expired or revoked). */
  onUnauthorized: (handler: (() => void) | null) => {
    unauthorizedHandler = handler;
  },
  handleUnauthorized: () => unauthorizedHandler?.(),
};
