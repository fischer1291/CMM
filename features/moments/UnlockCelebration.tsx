import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, View } from 'react-native';
import { AppText, colors, spacing } from '../../ui';

type Props = {
  /** A picture of the day to reveal (the newest friend's moment) */
  screenshot: string | null;
  count: number;
  streak: number;
  via: 'talk' | 'daily' | null;
  onDone: () => void;
};

/** The blur lifts, the lock opens: today's moments are yours. */
export function UnlockCelebration({ screenshot, count, streak, via, onDone }: Props) {
  const blur = useRef(new Animated.Value(1)).current;
  const lock = useRef(new Animated.Value(0)).current;
  const text = useRef(new Animated.Value(0)).current;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setOpen(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }, 550);
    Animated.sequence([
      Animated.spring(lock, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(blur, { toValue: 0, duration: 1100, delay: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(text, { toValue: 1, duration: 500, delay: 300, useNativeDriver: true }),
      ]),
    ]).start();
    const auto = setTimeout(onDone, 3600);
    return () => {
      clearTimeout(t);
      clearTimeout(auto);
    };
  }, [blur, lock, text, onDone]);

  const reason = via === 'daily' ? 'Du warst beim Yap Moment dabei.' : 'Du hast heute mit jemandem gesprochen.';
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDone}>
      <Pressable style={styles.root} onPress={onDone} accessibilityRole="button" accessibilityLabel="Weiter zu den Moments">
        {screenshot ? <Image source={{ uri: screenshot }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: blur }]}>
          <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
        </Animated.View>
        <View style={styles.shade} />
        <View style={styles.center}>
          <Animated.View
            style={[
              styles.lock,
              {
                transform: [
                  { scale: lock.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
                  { rotate: lock.interpolate({ inputRange: [0, 1], outputRange: ['-12deg', '0deg'] }) },
                ],
              },
            ]}
          >
            <Ionicons name={open ? 'lock-open' : 'lock-closed'} size={44} color={colors.text} />
          </Animated.View>
          <Animated.View style={[styles.card, { opacity: text }]}>
            <AppText variant="h1" center>
              Freigeschaltet!
            </AppText>
            <AppText variant="body" color={colors.textSecondary} center>
              {reason} {count === 1 ? 'Ein Moment wartet' : `${count} Moments warten`} auf dich.
            </AppText>
            {streak > 1 ? (
              <View style={styles.streak}>
                <AppText variant="bodyStrong" color={colors.cyan}>
                  🔓 {streak} Tage in Folge
                </AppText>
              </View>
            ) : null}
          </Animated.View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  shade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(11,11,18,0.35)' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xl, paddingHorizontal: spacing.xxl },
  lock: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139,92,255,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  // Readable on any photo
  card: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: 24,
    backgroundColor: 'rgba(11,11,18,0.72)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  streak: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: 'rgba(0,229,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.4)',
  },
});
