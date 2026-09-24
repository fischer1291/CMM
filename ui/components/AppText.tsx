import React from 'react';
import { Text, TextProps } from 'react-native';
import { colors, type, TypeVariant } from '../theme';

type Props = TextProps & {
  variant?: TypeVariant;
  color?: string;
  center?: boolean;
};

/** All text in the app goes through this, so type and color stay consistent. */
export function AppText({ variant = 'body', color = colors.text, center, style, ...rest }: Props) {
  return (
    <Text
      {...rest}
      style={[type[variant], { color }, center && { textAlign: 'center' }, style]}
      maxFontSizeMultiplier={1.4}
    />
  );
}
