import React, { useRef } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { colors, fonts, glow, radius, spacing } from '../theme';
import { AppText } from './AppText';

type Props = {
  value: string;
  onChange: (code: string) => void;
  length?: number;
  /** Called once all digits are entered */
  onComplete?: (code: string) => void;
  autoFocus?: boolean;
};

/**
 * One box per digit over a single hidden input, so iOS can fill the SMS code
 * ("oneTimeCode") and paste works.
 */
export function CodeInput({ value, onChange, length = 6, onComplete, autoFocus }: Props) {
  const inputRef = useRef<TextInput>(null);
  const digits = value.split('');

  return (
    <Pressable onPress={() => inputRef.current?.focus()} accessibilityLabel="Bestätigungscode">
      <View style={styles.row}>
        {Array.from({ length }).map((_, i) => {
          const active = i === Math.min(digits.length, length - 1);
          return (
            <View key={i} style={[styles.box, active && [styles.boxActive, glow(colors.cyan, 0.35)]]}>
              <AppText style={styles.digit}>{digits[i] ?? ''}</AppText>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(text) => {
          const code = text.replace(/\D/g, '').slice(0, length);
          onChange(code);
          if (code.length === length) onComplete?.(code);
        }}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        autoFocus={autoFocus}
        maxLength={length}
        style={styles.hidden}
        caretHidden
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  box: {
    flex: 1,
    aspectRatio: 0.82,
    maxWidth: 56,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxActive: { borderColor: colors.cyan },
  digit: { fontFamily: fonts.bold, fontSize: 26, lineHeight: 32, color: colors.text },
  hidden: { position: 'absolute', opacity: 0, width: 1, height: 1 },
});
