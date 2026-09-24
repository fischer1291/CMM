import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { AnimatedStyle } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';
import { colors } from '../theme';

// Same geometry as the app icon and the native splash logo (see
// docs/brand/logo.js): a ring of radius 0.36 of the box, handset,
// two signal arcs and the "available" dot.
const HANDSET =
  'M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z';

export function logoGeometry(size: number) {
  const c = size / 2;
  const r = size * 0.36;
  const stroke = r * 0.19;
  const s = r / 18;
  const arc = (rad: number) => {
    const ox = c;
    const oy = c - r * 0.1;
    return `M ${ox} ${oy - rad} A ${rad} ${rad} 0 0 1 ${ox + rad} ${oy}`;
  };
  return {
    c,
    r,
    stroke,
    handsetTransform: `translate(${c - 12.6 * s} ${c - 11.4 * s}) scale(${s})`,
    arcInner: arc(r * 0.31),
    arcOuter: arc(r * 0.48),
    arcWidth: r * 0.075,
    dot: { x: c + r * 0.707, y: c - r * 0.707, r: r * 0.17 },
    gloss: `M ${c - r * 0.72} ${c - r * 0.69} A ${r} ${r} 0 0 1 ${c - r * 0.1} ${c - r * 0.995}`,
  };
}

type Props = {
  size: number;
  style?: ViewStyle;
  /** Optional animated styles for the parts (launch animation) */
  innerArcStyle?: AnimatedStyle<ViewStyle>;
  outerArcStyle?: AnimatedStyle<ViewStyle>;
  dotStyle?: AnimatedStyle<ViewStyle>;
};

/** The Call Me Maybe mark: neon ring, handset, signal and dot. */
export function LogoMark({ size, style, innerArcStyle, outerArcStyle, dotStyle }: Props) {
  const g = logoGeometry(size);
  return (
    <View style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.cyan} />
            <Stop offset="0.5" stopColor={colors.violet} />
            <Stop offset="1" stopColor={colors.pink} />
          </LinearGradient>
          <RadialGradient id="inner" cx="0.4" cy="0.35" r="0.8">
            <Stop offset="0" stopColor="#23233A" />
            <Stop offset="1" stopColor="#101019" />
          </RadialGradient>
        </Defs>
        <Circle cx={g.c} cy={g.c} r={g.r - g.stroke / 2} fill="url(#inner)" />
        <Circle cx={g.c} cy={g.c} r={g.r} fill="none" stroke="url(#ring)" strokeWidth={g.stroke} />
        <Path d={g.gloss} fill="none" stroke="#FFFFFF" strokeOpacity={0.45} strokeWidth={g.stroke * 0.22} strokeLinecap="round" />
        <Path d={HANDSET} fill={colors.text} transform={g.handsetTransform} />
      </Svg>
      <Animated.View style={[StyleSheet.absoluteFill, innerArcStyle]} pointerEvents="none">
        <Svg width={size} height={size}>
          <Path d={g.arcInner} fill="none" stroke={colors.cyan} strokeWidth={g.arcWidth} strokeLinecap="round" />
        </Svg>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, outerArcStyle]} pointerEvents="none">
        <Svg width={size} height={size}>
          <Path d={g.arcOuter} fill="none" stroke={colors.cyan} strokeOpacity={0.55} strokeWidth={g.arcWidth} strokeLinecap="round" />
        </Svg>
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.dot,
          {
            left: g.dot.x - g.dot.r,
            top: g.dot.y - g.dot.r,
            width: g.dot.r * 2,
            height: g.dot.r * 2,
            borderRadius: g.dot.r,
            borderWidth: g.dot.r * 0.32,
          },
          dotStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    position: 'absolute',
    backgroundColor: colors.pink,
    borderColor: colors.bg,
    shadowColor: colors.pink,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
});
