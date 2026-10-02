/**
 * The app's single Socket.IO connection to the backend. NewCallContext
 * connects it after login (with the auth token) and disconnects on logout;
 * other parts of the app only subscribe to events.
 */
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../config/env';

export const socket = io(API_BASE_URL, { transports: ['websocket'], secure: true, autoConnect: false });

/**
 * Connect again with a new auth token ("Überall abmelden", plan 2.9): the
 * backend has just cut every socket of the user, this one too, and a
 * socket the server disconnected does not reconnect on its own. The
 * 'connect' listener of NewCallContext registers the user again.
 */
export function reconnectSocket(token: string) {
  socket.auth = { token };
  if (socket.connected || socket.active) socket.disconnect();
  socket.connect();
}
