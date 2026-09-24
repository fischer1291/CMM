import * as Haptics from 'expo-haptics';
import { usePathname, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { SlideInUp, SlideOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { Contact, useContacts } from '../contexts/ContactsContext';
import { useNewCall } from '../contexts/NewCallContext';
import CallStateManager from '../services/CallStateManager';
import { contactJoinedEvents } from '../services/appEvents';
import { markBannerShown } from '../services/bannerLog';
import { startSession } from '../services/gamificationApi';
import { socket } from '../services/socket';
import { AppText, Avatar, colors, glow, radius, spacing } from '../ui';

type Banner = {
  id: number;
  phone: string;
  name: string;
  avatarUrl: string | null;
  kind: 'available' | 'nudge' | 'joined';
};

const TEXT = {
  available: { title: (n: string) => `${n} ist jetzt erreichbar`, sub: 'Zeit für einen Anruf?', action: 'Anrufen' },
  nudge: { title: (n: string) => `${n} möchte sprechen 👋`, sub: 'Nur wenn es dir passt', action: '30 Min.' },
  joined: { title: (n: string) => `${n} ist jetzt dabei 🎉`, sub: 'Sag doch mal Hallo!', action: 'Hallo' },
};

const SHOW_MS = 6000;

/**
 * Live hints while the app is open: "Anna ist jetzt erreichbar" (with a
 * call button) and nudges. Driven by socket events, so they are instant and
 * independent of push throttling. The matching system banners are hidden in
 * the foreground (services/notifications.ts).
 */
export function InAppBanner() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { userPhone } = useAuth();
  const { contacts } = useContacts();
  const { startVideoCall } = useNewCall();
  const [banner, setBanner] = useState<Banner | null>(null);

  // Read in socket handlers, which run before React applies the update
  const contactsRef = useRef<Contact[]>(contacts);
  contactsRef.current = contacts;
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  useEffect(() => {
    let counter = 0;
    const show = (next: Omit<Banner, 'id'>) => {
      // Never on top of a call
      if (CallStateManager.hasActiveCall() || pathnameRef.current === '/videocall') return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      markBannerShown({ available: 'contact_available', nudge: 'nudge', joined: 'contact_joined' }[next.kind], next.phone);
      setBanner({ ...next, id: ++counter });
    };

    const onStatusUpdate = ({ phone, isAvailable }: { phone?: string; isAvailable?: boolean }) => {
      if (typeof phone !== 'string' || !isAvailable) return;
      const contact = contactsRef.current.find((c) => c.phone === phone);
      // Only the switch from offline to available, only for known contacts
      if (!contact || contact.isAvailable) return;
      show({ phone, name: contact.name, avatarUrl: contact.avatarUrl, kind: 'available' });
    };

    const onNudge = ({ from, name }: { from?: string; name?: string }) => {
      if (typeof from !== 'string') return;
      const contact = contactsRef.current.find((c) => c.phone === from);
      show({ phone: from, name: contact?.name || name || 'Jemand', avatarUrl: contact?.avatarUrl ?? null, kind: 'nudge' });
    };

    const offJoined = contactJoinedEvents.on(({ phone, name }) => {
      const contact = contactsRef.current.find((c) => c.phone === phone);
      show({ phone, name: contact?.name || name || 'Jemand', avatarUrl: contact?.avatarUrl ?? null, kind: 'joined' });
    });

    socket.on('statusUpdate', onStatusUpdate);
    socket.on('nudge', onNudge);
    return () => {
      socket.off('statusUpdate', onStatusUpdate);
      socket.off('nudge', onNudge);
      offJoined();
    };
  }, []);

  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(() => setBanner(null), SHOW_MS);
    return () => clearTimeout(timer);
  }, [banner]);

  if (!banner) return null;

  const act = () => {
    setBanner(null);
    if (banner.kind !== 'nudge') {
      if (userPhone) startVideoCall(banner.phone, userPhone);
    } else {
      startSession(30).catch(() => {});
      router.navigate('/');
    }
  };

  return (
    <Animated.View
      key={banner.id}
      entering={SlideInUp.springify().damping(18)}
      exiting={SlideOutUp.duration(200)}
      style={[styles.wrap, { top: insets.top + spacing.sm }]}
      pointerEvents="box-none"
    >
      <BannerCard
        {...banner}
        onPress={() => {
          setBanner(null);
          router.push({ pathname: '/friend', params: { phone: banner.phone } });
        }}
        onAction={act}
      />
    </Animated.View>
  );
}

/** The banner itself (also used by the dev preview). */
export function BannerCard({
  name,
  avatarUrl,
  kind,
  onPress,
  onAction,
}: Pick<Banner, 'name' | 'avatarUrl' | 'kind'> & { onPress: () => void; onAction: () => void }) {
  const firstName = name.split(' ')[0];
  const text = TEXT[kind];
  const accent = kind === 'available' ? colors.cyan : kind === 'nudge' ? colors.pink : colors.violet;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={text.title(name)}
      style={[styles.banner, glow(accent, 0.45)]}
    >
      <Avatar name={name} uri={avatarUrl} size={40} available={kind === 'available' ? true : undefined} />
      <View style={styles.text}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {text.title(firstName)}
        </AppText>
        <AppText variant="caption" color={colors.textSecondary} numberOfLines={1}>
          {text.sub}
        </AppText>
      </View>
      <Pressable
        onPress={onAction}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={kind === 'nudge' ? '30 Minuten erreichbar' : `${name} anrufen`}
        style={[styles.action, { backgroundColor: accent }]}
      >
        <AppText variant="caption" color={kind === 'joined' ? colors.text : colors.bg} style={styles.actionText}>
          {text.action}
        </AppText>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: spacing.md, right: spacing.md, zIndex: 100 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(19,19,30,0.96)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  text: { flex: 1 },
  action: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill },
  actionText: { fontWeight: '700' },
});
