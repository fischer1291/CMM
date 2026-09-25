import * as SplashScreen from 'expo-splash-screen';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { AppText, colors, fonts } from '../ui';
import { LogoMark, logoGeometry } from '../ui/components/LogoMark';

/** Same size as the native splash logo (app.config.js: imageWidth 200) */
const LOGO = 200;
/** Long enough to be seen, short enough not to be in the way */
const MIN_VISIBLE_MS = 1300;

/**
 * Takes over from the native splash screen with the same logo in the same
 * place, animates it (glow, ringing signal, dot, wordmark) while the app
 * loads, then zooms away to reveal the app.
 */
export function LaunchScreen({ ready, fontsLoaded, onDone }: { ready: boolean; fontsLoaded: boolean; onDone: () => void }) {
  const shownAt = useRef(Date.now());
  const [leaving, setLeaving] = useState(false);
  const g = logoGeometry(LOGO);

  const glow = useSharedValue(0.35);
  const ambient = useSharedValue(0);
  const innerArc = useSharedValue(1);
  const outerArc = useSharedValue(1);
  const dot = useSharedValue(1);
  const word = useSharedValue(0);
  const exit = useSharedValue(0);

  useEffect(() => {
    const ease = Easing.inOut(Easing.ease);
    glow.value = withRepeat(withTiming(0.85, { duration: 900, easing: ease }), -1, true);
    ambient.value = withTiming(1, { duration: 700 });
    // Ringing: the signal fades out and back in, outer arc a beat later
    innerArc.value = withDelay(200, withRepeat(withSequence(withTiming(0.2, { duration: 380 }), withTiming(1, { duration: 380 })), -1));
    outerArc.value = withDelay(390, withRepeat(withSequence(withTiming(0.15, { duration: 380 }), withTiming(1, { duration: 380 })), -1));
    dot.value = withDelay(250, withSequence(withSpring(1.35, { damping: 6, stiffness: 220 }), withSpring(1, { damping: 10 })));
  }, [ambient, dot, glow, innerArc, outerArc]);

  useEffect(() => {
    if (fontsLoaded) word.value = withDelay(150, withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }));
  }, [fontsLoaded, word]);

  useEffect(() => {
    if (!ready || leaving) return;
    const wait = Math.max(0, MIN_VISIBLE_MS - (Date.now() - shownAt.current));
    const timer = setTimeout(() => {
      setLeaving(true);
      exit.value = withTiming(1, { duration: 480, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(onDone)();
      });
    }, wait);
    return () => clearTimeout(timer);
  }, [ready, leaving, exit, onDone]);

  const rootStyle = useAnimatedStyle(() => ({ opacity: 1 - exit.value }));
  const ambientStyle = useAnimatedStyle(() => ({ opacity: ambient.value * (1 - exit.value) }));
  const logoStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + exit.value * 0.35 }] }));
  const glowStyle = useAnimatedStyle(() => ({ shadowOpacity: glow.value, opacity: 0.9 }));
  const innerArcStyle = useAnimatedStyle(() => ({ opacity: innerArc.value }));
  const outerArcStyle = useAnimatedStyle(() => ({ opacity: outerArc.value }));
  const dotStyle = useAnimatedStyle(() => ({ transform: [{ scale: dot.value }] }));
  const wordStyle = useAnimatedStyle(() => ({
    opacity: word.value * (1 - exit.value),
    transform: [{ translateY: (1 - word.value) * 14 }],
  }));

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.root, rootStyle]}
      // The native splash stays until this identical screen is drawn
      onLayout={() => SplashScreen.hideAsync().catch(() => {})}
      pointerEvents={leaving ? 'none' : 'auto'}
    >
      <Animated.View style={[StyleSheet.absoluteFill, ambientStyle]} pointerEvents="none">
        <LinearGradient colors={['rgba(0,229,255,0.18)', 'transparent']} style={[styles.glowBlob, styles.glowTop]} start={{ x: 0, y: 0 }} end={{ x: 0.8, y: 0.8 }} />
        <LinearGradient colors={['transparent', 'rgba(255,46,147,0.16)']} style={[styles.glowBlob, styles.glowBottom]} start={{ x: 0.2, y: 0.2 }} end={{ x: 1, y: 1 }} />
      </Animated.View>

      <View style={styles.center} pointerEvents="none">
        <Animated.View style={[{ width: LOGO, height: LOGO }, logoStyle]}>
          {/* Neon glow behind the ring */}
          <Animated.View
            style={[
              styles.glow,
              {
                left: g.c - g.r,
                top: g.c - g.r,
                width: g.r * 2,
                height: g.r * 2,
                borderRadius: g.r,
                borderWidth: g.stroke,
              },
              glowStyle,
            ]}
          />
          <LogoMark size={LOGO} innerArcStyle={innerArcStyle} outerArcStyle={outerArcStyle} dotStyle={dotStyle} />
        </Animated.View>
      </View>

      {/* Mounted once the font is loaded: text drawn earlier keeps the system font */}
      {fontsLoaded && (
        <Animated.View style={[styles.wordmark, wordStyle]} pointerEvents="none">
          <AppText style={styles.title} center>
            Wanna yap?
          </AppText>
          <AppText variant="caption" color={colors.textSecondary} center style={styles.tagline}>
            Ruf an, wenn’s passt.
          </AppText>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.bg, zIndex: 1000 },
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  glow: {
    position: 'absolute',
    borderColor: colors.violet,
    shadowColor: colors.violet,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 26,
  },
  glowBlob: { position: 'absolute', width: 460, height: 460, borderRadius: 230 },
  glowTop: { top: -180, left: -170 },
  glowBottom: { bottom: -200, right: -180 },
  wordmark: { position: 'absolute', left: 0, right: 0, top: '50%', marginTop: LOGO / 2 + 20 },
  title: { fontFamily: fonts.bold, fontSize: 30, lineHeight: 36, letterSpacing: -0.6, color: colors.text },
  tagline: { marginTop: 4, letterSpacing: 0.4 },
});
