import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, glow } from '../theme';

/** Tier colors: one-tier badges use the brand gradient, tiers Bronze / Silber / Gold. */
const TIER_GRADIENTS: Record<string, readonly [string, string]> = {
  brand: [colors.cyan, colors.pink],
  Bronze: ['#F0A36B', '#B8643A'],
  Silber: ['#EEF3FA', '#8FA3BD'],
  Gold: ['#FFE38A', '#E8A317'],
};

type Props = {
  icon: string;
  earned: boolean;
  tierName?: string | null;
  size?: number;
  /** Softer look for undiscovered secrets */
  secret?: boolean;
};

/** A badge as a round medal: gradient and glow when earned, dim when not. */
export function BadgeMedal({ icon, earned, tierName, size = 60, secret }: Props) {
  const gradient = TIER_GRADIENTS[tierName ?? 'brand'] ?? TIER_GRADIENTS.brand;
  const iconColor = earned ? (tierName === 'Silber' || tierName === 'Gold' ? '#1B1B29' : colors.text) : colors.textMuted;
  return (
    <View style={[{ width: size, height: size }, earned ? glow(gradient[1], 0.5) : null]}>
      {earned ? (
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]} />
      ) : (
        <View
          style={[
            StyleSheet.absoluteFill,
            styles.locked,
            { borderRadius: size / 2, borderStyle: secret ? 'dashed' : 'solid' },
          ]}
        />
      )}
      <View style={styles.center}>
        <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={size * 0.42} color={iconColor} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  locked: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong },
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
});
