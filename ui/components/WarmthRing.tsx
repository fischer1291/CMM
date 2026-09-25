import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors, glow } from '../theme';
import { AppText } from './AppText';

/**
 * A circle's warmth: the ring fills with how many members talked this week;
 * full ring = weekly goal reached (and it glows).
 */
export function WarmthRing({ emoji, value, size = 64, full }: { emoji: string; value: number; size?: number; full?: boolean }) {
  const stroke = Math.max(4, size * 0.08);
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = Math.max(0, Math.min(1, value));
  return (
    <View style={[{ width: size, height: size }, full ? glow(colors.pink, 0.55) : null]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="warmth" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.cyan} />
            <Stop offset="0.5" stopColor={colors.violet} />
            <Stop offset="1" stopColor={colors.pink} />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.surfaceStrong} strokeWidth={stroke} fill={colors.bgElevated} />
        {progress > 0 && (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="url(#warmth)"
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference * progress} ${circumference}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </Svg>
      <View style={styles.center}>
        <AppText style={{ fontSize: size * 0.4, lineHeight: size * 0.5 }}>{emoji}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
});
