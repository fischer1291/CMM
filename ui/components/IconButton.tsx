import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { colors, glow } from '../theme';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  accessibilityLabel: string;
  size?: number;
  /** filled color (e.g. danger for hang up); glass when omitted */
  color?: string;
  active?: boolean;
  /** Icon rotation in degrees, e.g. 135 for a "hang up" handset */
  rotate?: number;
};

/** Round glass button, e.g. for call controls. */
export function IconButton({ icon, onPress, accessibilityLabel, size = 60, color, active, rotate }: Props) {
  const background = color ?? (active ? colors.text : colors.surfaceStrong);
  const iconColor = active && !color ? colors.bg : colors.text;

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: !!active }}
      hitSlop={8}
      style={({ pressed }) => [
        styles.base,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: background },
        color ? glow(color, 0.5) : null,
        { transform: [{ scale: pressed ? 0.94 : 1 }] },
      ]}
    >
      <Ionicons
        name={icon}
        size={size * 0.42}
        color={iconColor}
        style={rotate ? { transform: [{ rotate: `${rotate}deg` }] } : undefined}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
});
