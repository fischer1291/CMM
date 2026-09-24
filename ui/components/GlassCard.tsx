import { BlurView } from 'expo-blur';
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { colors, glow as glowStyle, radius, spacing } from '../theme';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Neon glow color around the card */
  glow?: string;
  padded?: boolean;
};

/**
 * Frosted glass surface with a hairline border. The glow sits on an outer
 * view: iOS clips shadows of views with overflow hidden.
 */
export function GlassCard({ children, style, glow, padded = true }: Props) {
  return (
    <View style={[styles.shadowWrap, glow ? glowStyle(glow, 0.35) : null, style]}>
      <View style={styles.clip}>
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={padded && styles.padded}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowWrap: { borderRadius: radius.lg },
  clip: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  padded: { padding: spacing.lg },
});
