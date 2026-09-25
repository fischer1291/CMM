import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Modal, StyleSheet, View } from 'react-native';
import type { AlbumBadge } from '../services/badgesApi';
import { AppText, BadgeMedal, Button, colors, spacing } from '../ui';

const CONFETTI_COLORS = [colors.cyan, colors.pink, colors.violet, '#FFE38A', '#FFFFFF'];
const PIECES = 36;

/** Falling confetti, once. */
function Confetti({ run }: { run: number }) {
  const { width, height } = Dimensions.get('window');
  const pieces = useMemo(
    () =>
      Array.from({ length: PIECES }, (_, i) => ({
        x: Math.random() * width,
        drift: (Math.random() - 0.5) * 120,
        size: 6 + Math.random() * 6,
        delay: Math.random() * 400,
        duration: 1800 + Math.random() * 1200,
        spin: Math.random() > 0.5 ? 1 : -1,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        progress: new Animated.Value(0),
      })),
    // New pieces for every badge
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [run, width]
  );

  useEffect(() => {
    Animated.parallel(
      pieces.map((p) =>
        Animated.timing(p.progress, { toValue: 1, duration: p.duration, delay: p.delay, easing: Easing.in(Easing.quad), useNativeDriver: true })
      )
    ).start();
  }, [pieces]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: p.x,
            top: -20,
            width: p.size,
            height: p.size * 0.5,
            borderRadius: 1,
            backgroundColor: p.color,
            opacity: p.progress.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateY: p.progress.interpolate({ inputRange: [0, 1], outputRange: [0, height + 40] }) },
              { translateX: p.progress.interpolate({ inputRange: [0, 1], outputRange: [0, p.drift] }) },
              { rotate: p.progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin * 540}deg`] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}

type Props = {
  /** Newly earned badges; the overlay steps through them */
  badges: AlbumBadge[];
  onOpenAlbum: () => void;
  /** All shown (or skipped) */
  onDone: () => void;
};

/** "Neues Abzeichen!": medal pops in, confetti falls. */
export function BadgeCelebration({ badges, onOpenAlbum, onDone }: Props) {
  const [index, setIndex] = useState(0);
  const scale = useRef(new Animated.Value(0)).current;
  const badge = badges[index];

  useEffect(() => {
    if (!badge) return;
    scale.setValue(0);
    Animated.spring(scale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }).start();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, [badge, scale]);

  if (!badge) return null;
  const last = index === badges.length - 1;
  const upgraded = badge.tiers > 1 && badge.tier > 1;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDone}>
      <View style={styles.backdrop}>
        <Confetti run={index} />
        <View style={styles.content} accessibilityViewIsModal>
          <AppText variant="label" color={colors.cyan}>
            {upgraded ? 'Neue Stufe' : 'Neues Abzeichen'}
            {badges.length > 1 ? ` · ${index + 1}/${badges.length}` : ''}
          </AppText>
          <Animated.View style={{ transform: [{ scale }], marginVertical: spacing.xl, alignItems: 'center', justifyContent: 'center' }}>
            <LinearGradient colors={[colors.violet, 'transparent']} style={[styles.halo, { top: -35 }]} />
            <BadgeMedal icon={badge.icon} earned tierName={badge.tierName} size={140} />
          </Animated.View>
          <AppText variant="h1" center>
            {badge.title}
          </AppText>
          {badge.tierName ? (
            <AppText variant="bodyStrong" color={colors.textSecondary} center>
              {badge.tierName}
            </AppText>
          ) : null}
          <AppText variant="body" color={colors.textSecondary} center style={{ marginTop: spacing.sm }}>
            {badge.secret ? `Geheimnis gelüftet: ${badge.description}` : badge.description}
          </AppText>
          <View style={styles.actions}>
            <Button title={last ? 'Schön!' : 'Weiter'} onPress={() => (last ? onDone() : setIndex(index + 1))} />
            <Button
              title="Zum Album"
              variant="ghost"
              onPress={() => {
                onDone();
                onOpenAlbum();
              }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center' },
  halo: { position: 'absolute', width: 210, height: 210, borderRadius: 105, alignSelf: 'center', opacity: 0.3 },
  content: { alignItems: 'center', paddingHorizontal: spacing.xxl },
  actions: { alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.xxl },
});
