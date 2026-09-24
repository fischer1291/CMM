/**
 * The app's single Socket.IO connection to the backend. NewCallContext
 * connects it after login (with the auth token) and disconnects on logout;
 * other parts of the app only subscribe to events.
 */
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../config/env';

export const socket = io(API_BASE_URL, { transports: ['websocket'], secure: true, autoConnect: false });
