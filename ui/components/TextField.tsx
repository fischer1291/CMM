import React, { forwardRef, useState } from 'react';
import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { colors, fonts, radius, spacing } from '../theme';
import { AppText } from './AppText';

type Props = TextInputProps & {
  label?: string;
  /** Fixed text before the input, e.g. a country code */
  prefix?: string;
  error?: string | null;
};

/** Glass text input with optional label, prefix and error message. */
export const TextField = forwardRef<TextInput, Props>(function TextField(
  { label, prefix, error, style, onFocus, onBlur, ...rest },
  ref
) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: spacing.sm }}>
      {label ? (
        <AppText variant="label" color={colors.textMuted}>
          {label}
        </AppText>
      ) : null}
      <View
        style={[
          styles.field,
          focused && { borderColor: colors.cyan },
          error ? { borderColor: colors.danger } : null,
        ]}
      >
        {prefix ? (
          <AppText variant="title" color={colors.textSecondary}>
            {prefix}
          </AppText>
        ) : null}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.cyan}
          style={[styles.input, style]}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
      </View>
      {error ? (
        <AppText variant="caption" color={colors.danger}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 60,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: { flex: 1, color: colors.text, fontFamily: fonts.medium, fontSize: 20, paddingVertical: spacing.md },
});
