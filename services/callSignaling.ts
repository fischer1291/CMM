/**
 * Telling the other party that a call is over (declined, cancelled, hung
 * up). Sent twice on purpose: over the socket (fast) and over HTTP, which
 * also works when the app was just woken in the background and has no
 * socket connection yet (e.g. declined on the lock screen). The backend
 * handles repeats.
 */
import { apiPostJson } from '../utils/api';
import { socket } from './socket';

export function sendCallEnded(channel: string, other: string, from?: string | null): void {
  socket.emit('callEnded', { from, to: other, channel });
  apiPostJson('/calls/end', { channel, other }, 8000).catch((error) =>
    console.warn('📞 /calls/end failed (socket event was sent too):', error)
  );
}
