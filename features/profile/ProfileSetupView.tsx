import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { AppText, Avatar, Button, colors, glow, Screen, spacing, TextField } from '../../ui';

type Props = {
  name: string;
  onNameChange: (value: string) => void;
  avatarUri: string | null;
  onPickAvatar: () => void;
  onSave: () => void;
  onSkip: () => void;
  saving: boolean;
};

/** Name and photo for new users. */
export function ProfileSetupView({ name, onNameChange, avatarUri, onPickAvatar, onSave, onSkip, saving }: Props) {
  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.head}>
          <AppText variant="label" color={colors.cyan}>
            Fast geschafft
          </AppText>
          <AppText variant="h1">Wer bist du?</AppText>
          <AppText variant="body" color={colors.textSecondary}>
            So sehen dich deine Kontakte, wenn du erreichbar bist.
          </AppText>
        </View>

        <Pressable onPress={onPickAvatar} style={styles.avatar} accessibilityRole="button" accessibilityLabel="Profilbild wählen">
          <Avatar name={name || '?'} uri={avatarUri} size={132} available={!!avatarUri || !!name.trim()} />
          <View style={[styles.badge, glow(colors.violet, 0.6)]}>
            <Ionicons name="camera" size={18} color={colors.text} />
          </View>
        </Pressable>

        <TextField
          label="Dein Name"
          value={name}
          onChangeText={onNameChange}
          placeholder="Vorname"
          autoCapitalize="words"
          textContentType="givenName"
          maxLength={50}
          returnKeyType="done"
          onSubmitEditing={onSave}
        />

        <View style={styles.footer}>
          <Button title="Fertig" onPress={onSave} loading={saving} disabled={!name.trim()} />
          <Button title="Später" variant="ghost" onPress={onSkip} disabled={saving} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { marginTop: spacing.xxl, gap: spacing.sm },
  avatar: { alignSelf: 'center', marginVertical: spacing.xxl },
  badge: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.violet,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.bg,
  },
  footer: { marginTop: 'auto', gap: spacing.sm },
});
