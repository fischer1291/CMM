import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { colors, fonts, glow } from '../theme';
import { AppText } from './AppText';

type Props = {
  name: string;
  uri?: string | null;
  size?: number;
  /** true: pulsing neon ring, false: dim ring, undefined: no ring (unregistered) */
  available?: boolean;
};

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '?';

/** Profile picture (or initials) with an availability ring. */
export function Avatar({ name, uri, size = 56, available }: Props) {
  const ring = available === undefined ? 0 : Math.max(2, Math.round(size * 0.05));
  const gap = ring ? ring + 1 : 0;
  const inner = size - 2 * (ring + gap);

  const pulse = useSharedValue(0);
  useEffect(() => {
    if (available) {
      pulse.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.ease) }), -1, true);
    } else {
      pulse.value = withTiming(0);
    }
  }, [available, pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ shadowOpacity: 0.25 + pulse.value * 0.45 }));

  const radius = (size - ring) / 2;

  return (
    <Animated.View
      style={[{ width: size, height: size }, available ? glow(colors.cyan, 0.4) : null, available ? pulseStyle : null]}
      accessibilityLabel={`${name}${available ? ', erreichbar' : available === false ? ', nicht erreichbar' : ''}`}
    >
      {ring > 0 && (
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          <Defs>
            <SvgGradient id="ring" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={colors.cyan} />
              <Stop offset="1" stopColor={colors.pink} />
            </SvgGradient>
          </Defs>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={available ? 'url(#ring)' : colors.offline}
            strokeWidth={ring}
            fill="none"
          />
        </Svg>
      )}
      <View
        style={[
          styles.inner,
          { width: inner, height: inner, borderRadius: inner / 2, margin: ring + gap },
        ]}
      >
        {uri ? (
          <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
        ) : (
          <LinearGradient colors={['#2B2B45', '#1A1A2B']} style={[StyleSheet.absoluteFill, styles.center]}>
            <AppText
              style={{ fontFamily: fonts.semibold, fontSize: inner * 0.36, lineHeight: inner * 0.46 }}
              color={colors.textSecondary}
            >
              {initialsOf(name)}
            </AppText>
          </LinearGradient>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  inner: { overflow: 'hidden', backgroundColor: colors.bgElevated },
  center: { alignItems: 'center', justifyContent: 'center' },
});
