import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, glow, spacing } from '../theme';
import { AppText } from './AppText';

const ICONS: Record<string, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  index: ['radio-button-on', 'radio-button-off'],
  contacts: ['people', 'people-outline'],
  callmoments: ['sparkles', 'sparkles-outline'],
  settings: ['person-circle', 'person-circle-outline'],
};

/** Floating glass tab bar with a neon dot under the active tab. */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
      <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.row}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const label = typeof options.title === 'string' ? options.title : route.name;
          const [activeIcon, idleIcon] = ICONS[route.name] ?? ['ellipse', 'ellipse-outline'];

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              Haptics.selectionAsync().catch(() => {});
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              style={styles.tab}
            >
              <Ionicons
                name={focused ? activeIcon : idleIcon}
                size={24}
                color={focused ? colors.cyan : colors.textMuted}
              />
              <AppText variant="caption" color={focused ? colors.text : colors.textMuted} style={styles.label}>
                {label}
              </AppText>
              <View style={[styles.dot, focused && [styles.dotActive, glow(colors.cyan, 0.9)]]} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: 'rgba(11,11,18,0.72)',
  },
  row: { flexDirection: 'row', paddingTop: spacing.sm },
  tab: { flex: 1, alignItems: 'center', gap: 2 },
  label: { fontSize: 11 },
  dot: { width: 4, height: 4, borderRadius: 2, marginTop: 2, backgroundColor: 'transparent' },
  dotActive: { backgroundColor: colors.cyan },
});
