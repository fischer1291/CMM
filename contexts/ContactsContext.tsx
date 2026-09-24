/**
 * Address book contacts matched against registered users, shared by all
 * screens. Loads once after login (without a permission prompt) and keeps
 * availability live through the backend's "statusUpdate" socket events.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ContactsPermissionError, matchContacts } from '../services/contactsService';
import { socket } from '../services/socket';
import { useAuth } from './AuthContext';

export type Contact = {
  phone: string;
  name: string;
  avatarUrl: string | null;
  /** false for address book entries that don't use the app */
  registered: boolean;
  isAvailable: boolean;
  lastOnline: string | null;
};

type ContactsContextType = {
  contacts: Contact[];
  loading: boolean;
  /** true after the user denied contacts access */
  permissionDenied: boolean;
  error: boolean;
  refresh: (options?: { askPermission?: boolean }) => Promise<void>;
  /** Contact for a phone number (E.164), if known */
  find: (phone: string | null | undefined) => Contact | undefined;
};

const ContactsContext = createContext<ContactsContextType>({
  contacts: [],
  loading: false,
  permissionDenied: false,
  error: false,
  refresh: async () => {},
  find: () => undefined,
});

/** Available first, then other registered users, then everyone else; by name. */
function sortContacts(list: Contact[]): Contact[] {
  const rank = (c: Contact) => (c.isAvailable ? 0 : c.registered ? 1 : 2);
  return [...list].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, 'de'));
}

export function ContactsProvider({ children }: { children: React.ReactNode }) {
  const { userPhone } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [error, setError] = useState(false);
  const loadingRef = useRef(false);

  const refresh = useCallback(
    async ({ askPermission = false }: { askPermission?: boolean } = {}) => {
      if (!userPhone || loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      try {
        const { deviceNames, matched } = await matchContacts(userPhone, { askPermission });
        const registered = new Map(matched.map((m) => [m.phone, m]));
        const list: Contact[] = [...deviceNames.entries()].map(([phone, deviceName]) => {
          const user = registered.get(phone);
          return {
            phone,
            // Prefer the name from the address book: it's what the user calls them
            name: deviceName || user?.name || phone,
            avatarUrl: user?.avatarUrl || null,
            registered: !!user,
            isAvailable: !!user?.isAvailable,
            lastOnline: user?.lastOnline ?? null,
          };
        });
        setContacts(sortContacts(list));
        setPermissionDenied(false);
        setError(false);
      } catch (e) {
        if (e instanceof ContactsPermissionError) {
          setPermissionDenied(true);
        } else {
          setError(true);
        }
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    [userPhone]
  );

  // Load after login; clear on logout
  useEffect(() => {
    if (userPhone) {
      refresh();
    } else {
      setContacts([]);
    }
  }, [userPhone, refresh]);

  // Live availability of contacts
  useEffect(() => {
    const onStatusUpdate = ({ phone, isAvailable, lastOnline }: any) => {
      if (typeof phone !== 'string') return;
      setContacts((prev) => {
        if (!prev.some((c) => c.phone === phone)) return prev;
        return sortContacts(
          prev.map((c) =>
            c.phone === phone
              ? { ...c, isAvailable: !!isAvailable, lastOnline: lastOnline ?? c.lastOnline }
              : c
          )
        );
      });
    };
    socket.on('statusUpdate', onStatusUpdate);
    return () => {
      socket.off('statusUpdate', onStatusUpdate);
    };
  }, []);

  const byPhone = useMemo(() => new Map(contacts.map((c) => [c.phone, c])), [contacts]);
  const find = useCallback((phone: string | null | undefined) => (phone ? byPhone.get(phone) : undefined), [byPhone]);

  return (
    <ContactsContext.Provider value={{ contacts, loading, permissionDenied, error, refresh, find }}>
      {children}
    </ContactsContext.Provider>
  );
}

export const useContacts = () => useContext(ContactsContext);
