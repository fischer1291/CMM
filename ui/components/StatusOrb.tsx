import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { colors, glow, gradients } from '../theme';
import { AppText } from './AppText';

type Props = {
  available: boolean;
  onToggle: () => void;
  /** 0..1 remaining share of a timed session; draws the countdown ring */
  progress?: number | null;
  /** e.g. "12:34" remaining */
  caption?: string | null;
  size?: number;
  disabled?: boolean;
};

/** Big availability switch: glowing gradient orb when available. */
export function StatusOrb({ available, onToggle, progress, caption, size = 220, disabled }: Props) {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = available
      ? withRepeat(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.ease) }), -1, true)
      : withTiming(0, { duration: 300 });
  }, [available]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.25 + pulse.value * 0.35,
    transform: [{ scale: 1 + pulse.value * 0.08 }],
  }));

  const ringWidth = 6;
  const r = (size + 28 - ringWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const showRing = available && typeof progress === 'number';

  return (
    <View style={[styles.wrap, { width: size + 28, height: size + 28 }]}>
      {available && (
        <Animated.View
          pointerEvents="none"
          style={[styles.halo, { width: size + 28, height: size + 28, borderRadius: (size + 28) / 2 }, haloStyle]}
        />
      )}
      {showRing && (
        <Svg width={size + 28} height={size + 28} style={[StyleSheet.absoluteFill, { transform: [{ rotate: '-90deg' }] }]}>
          <Circle cx={(size + 28) / 2} cy={(size + 28) / 2} r={r} stroke={colors.surfaceStrong} strokeWidth={ringWidth} fill="none" />
          <Circle
            cx={(size + 28) / 2}
            cy={(size + 28) / 2}
            r={r}
            stroke={colors.pink}
            strokeWidth={ringWidth}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference * (1 - Math.max(0, Math.min(1, progress!)))}
          />
        </Svg>
      )}
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          onToggle();
        }}
        disabled={disabled}
        accessibilityRole="switch"
        accessibilityState={{ checked: available, disabled }}
        accessibilityLabel="Erreichbarkeit"
        style={({ pressed }) => [
          { width: size, height: size, borderRadius: size / 2 },
          available ? glow(colors.violet, 0.7) : null,
          { transform: [{ scale: pressed ? 0.97 : 1 }] },
        ]}
      >
        <LinearGradient
          colors={available ? gradients.brand : gradients.offline}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.orb, { borderRadius: size / 2 }]}
        >
          <AppText variant="label" color={available ? colors.bg : colors.textMuted}>
            {available ? 'Du bist' : 'Du bist gerade'}
          </AppText>
          <AppText variant="h1" color={available ? colors.bg : colors.text} center>
            {available ? 'erreichbar' : 'offline'}
          </AppText>
          <AppText variant="caption" color={available ? colors.bg : colors.textSecondary}>
            {caption ?? 'Tippen zum Ändern'}
          </AppText>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', backgroundColor: colors.violet },
  orb: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
});
