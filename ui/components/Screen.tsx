import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';

type Props = {
  children: React.ReactNode;
  scroll?: boolean;
  /** Safe-area edges to pad; tab screens skip the bottom (tab bar handles it). */
  edges?: Edge[];
  contentStyle?: ViewStyle;
  /** Soft neon glows in the corners; off for media-heavy screens. */
  ambient?: boolean;
};

/** Dark page background with ambient glows and safe-area padding. */
export function Screen({ children, scroll, edges = ['top'], contentStyle, ambient = true }: Props) {
  return (
    <View style={styles.root}>
      {ambient && (
        <>
          <LinearGradient
            colors={['rgba(0,229,255,0.16)', 'transparent']}
            style={[styles.glow, styles.glowTop]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.8, y: 0.8 }}
            pointerEvents="none"
          />
          <LinearGradient
            colors={['transparent', 'rgba(255,46,147,0.12)']}
            style={[styles.glow, styles.glowBottom]}
            start={{ x: 0.2, y: 0.2 }}
            end={{ x: 1, y: 1 }}
            pointerEvents="none"
          />
        </>
      )}
      <SafeAreaView style={styles.flex} edges={edges}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={[styles.content, contentStyle]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.flex, styles.content, contentStyle]}>{children}</View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  glow: { position: 'absolute', width: 420, height: 420, borderRadius: 210 },
  glowTop: { top: -180, left: -160 },
  glowBottom: { bottom: -200, right: -180 },
});
