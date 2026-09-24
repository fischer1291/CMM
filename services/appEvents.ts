/**
 * Small in-app event bus for things several parts of the app react to
 * that don't come from one socket event, e.g. "a contact joined" (from an
 * invite over the socket, or found as newly registered in the address book).
 */
type JoinedEvent = { phone: string; name: string };
type Listener = (event: JoinedEvent) => void;

const listeners = new Set<Listener>();

export const contactJoinedEvents = {
  emit(event: JoinedEvent) {
    listeners.forEach((l) => l(event));
  },
  on(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
