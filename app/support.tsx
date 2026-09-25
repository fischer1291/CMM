import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { SupportView, TicketView } from '../features/support/SupportView';
import { APP_BUILD, APP_VERSION } from '../services/appInfo';
import { socket } from '../services/socket';
import { fetchTickets, markTicketRead, openTicket, replyToTicket, SupportCategory, SupportTicket } from '../services/supportApi';

export default function SupportScreen() {
  const router = useRouter();
  const [tickets, setTickets] = useState<SupportTicket[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const load = useCallback(() => {
    fetchTickets()
      .then(setTickets)
      .catch(() => setTickets((t) => t ?? []));
  }, []);
  useFocusEffect(load);
  // An answer while the screen is open
  useEffect(() => {
    socket.on('supportReply', load);
    return () => {
      socket.off('supportReply', load);
    };
  }, [load]);

  const open = tickets?.find((t) => t.id === openId) ?? null;
  useEffect(() => {
    if (open?.unread) {
      markTicketRead(open.id);
      setTickets((list) => list?.map((t) => (t.id === open.id ? { ...t, unread: false } : t)) ?? null);
    }
  }, [open]);

  const send = async (category: SupportCategory, message: string) => {
    setSending(true);
    try {
      const ticket = await openTicket(category, message);
      setTickets((list) => [ticket, ...(list ?? [])]);
      Alert.alert('Danke!', 'Deine Nachricht ist angekommen. Wir melden uns hier bei dir.');
      return true;
    } catch (err) {
      const code = (err as { code?: string }).code;
      Alert.alert('Nicht gesendet', code === 'too_many_open' ? 'Du hast schon mehrere offene Anfragen. Wir melden uns bald.' : 'Bitte versuche es gleich noch einmal.');
      return false;
    } finally {
      setSending(false);
    }
  };

  const reply = async (text: string) => {
    if (!open) return false;
    setSending(true);
    try {
      const ticket = await replyToTicket(open.id, text);
      setTickets((list) => list?.map((t) => (t.id === ticket.id ? ticket : t)) ?? null);
      return true;
    } catch {
      Alert.alert('Nicht gesendet', 'Bitte versuche es gleich noch einmal.');
      return false;
    } finally {
      setSending(false);
    }
  };

  if (open) return <TicketView ticket={open} sending={sending} onBack={() => setOpenId(null)} onReply={reply} />;
  return (
    <SupportView
      tickets={tickets}
      sending={sending}
      onBack={() => router.back()}
      onSend={send}
      onOpen={(t) => setOpenId(t.id)}
      version={`${APP_VERSION} (${APP_BUILD})`}
    />
  );
}
