/**
 * Address book contacts matched against registered users, shared by all
 * screens. Loads once after login (without a permission prompt) and keeps
 * availability live through the backend's "statusUpdate" socket events.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { contactJoinedEvents } from '../services/appEvents';
import { ContactsPermissionError, matchContacts } from '../services/contactsService';
import { fetchBlocked } from '../services/socialApi';
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
  /** Hide someone right away (just blocked them) */
  hide: (phone: string) => void;
};

const ContactsContext = createContext<ContactsContextType>({
  contacts: [],
  loading: false,
  permissionDenied: false,
  error: false,
  refresh: async () => {},
  find: () => undefined,
  hide: () => {},
});

/** Registered contacts seen last time, to notice who is new */
const knownKey = (userPhone: string) => `knownRegisteredContacts:${userPhone}`;

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
  // Blocked either way: never shown, even though they're in the address book
  const blockedRef = useRef(new Set<string>());

  const refresh = useCallback(
    async ({ askPermission = false }: { askPermission?: boolean } = {}) => {
      if (!userPhone || loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      try {
        const [{ deviceNames, matched }, blocked] = await Promise.all([
          matchContacts(userPhone, { askPermission }),
          fetchBlocked().catch(() => null),
        ]);
        if (blocked) blockedRef.current = new Set(blocked.map((b) => b.phone));
        const registered = new Map(matched.map((m) => [m.phone, m]));
        const entries = [...deviceNames.entries()].filter(([phone]) => !blockedRef.current.has(phone));
        const list: Contact[] = entries.map(([phone, deviceName]) => {
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
        announceNewcomers(userPhone, list);
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

  // Live: someone we invited joined; someone blocked us or we blocked them
  useEffect(() => {
    const onJoined = async ({ phone, name }: { phone?: string; name?: string }) => {
      if (typeof phone !== 'string' || !userPhone) return;
      contactJoinedEvents.emit({ phone, name: name || '' });
      // Announced here already: the sync below must not announce them again
      await rememberKnown(userPhone, phone);
      refresh();
    };
    const onRemoved = ({ phone }: { phone?: string }) => {
      if (typeof phone !== 'string') return;
      blockedRef.current.add(phone);
      setContacts((prev) => prev.filter((c) => c.phone !== phone));
    };
    socket.on('contactJoined', onJoined);
    socket.on('contactRemoved', onRemoved);
    return () => {
      socket.off('contactJoined', onJoined);
      socket.off('contactRemoved', onRemoved);
    };
  }, [refresh, userPhone]);

  const hide = useCallback((phone: string) => {
    blockedRef.current.add(phone);
    setContacts((prev) => prev.filter((c) => c.phone !== phone));
  }, []);

  const byPhone = useMemo(() => new Map(contacts.map((c) => [c.phone, c])), [contacts]);
  const find = useCallback((phone: string | null | undefined) => (phone ? byPhone.get(phone) : undefined), [byPhone]);

  return (
    <ContactsContext.Provider value={{ contacts, loading, permissionDenied, error, refresh, find, hide }}>
      {children}
    </ContactsContext.Provider>
  );
}

export const useContacts = () => useContext(ContactsContext);

async function rememberKnown(userPhone: string, phone: string) {
  try {
    const stored = await AsyncStorage.getItem(knownKey(userPhone));
    // No baseline yet: the next sync records one without announcing anyone
    if (!stored) return;
    const known = new Set<string>(JSON.parse(stored));
    known.add(phone);
    await AsyncStorage.setItem(knownKey(userPhone), JSON.stringify([...known]));
  } catch {
    // Only a nicety
  }
}

/**
 * Registered contacts that weren't registered at the last sync: they just
 * joined (without our invite). The first sync only records the baseline.
 */
async function announceNewcomers(userPhone: string, list: Contact[]) {
  try {
    const registered = list.filter((c) => c.registered);
    const stored = await AsyncStorage.getItem(knownKey(userPhone));
    await AsyncStorage.setItem(knownKey(userPhone), JSON.stringify(registered.map((c) => c.phone)));
    if (!stored) return;
    const known = new Set<string>(JSON.parse(stored));
    for (const c of registered.filter((c) => !known.has(c.phone)).slice(0, 3)) {
      contactJoinedEvents.emit({ phone: c.phone, name: c.name });
    }
  } catch {
    // Only a nicety
  }
}
