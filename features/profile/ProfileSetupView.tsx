import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText, Avatar, Button, colors, glow, radius, Screen, spacing, TextField } from '../../ui';
import { ANDROID_OPTIONS, type AcquisitionChoice, SOURCE_OPTIONS } from './acquisitionStep';

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

/** One tappable pill of a single-choice group */
function ChoicePill({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={[styles.pill, selected && styles.pillActive]}
    >
      <AppText variant="bodyStrong" color={selected ? colors.bg : colors.textSecondary}>
        {label}
      </AppText>
    </Pressable>
  );
}

type AcquisitionProps = {
  choice: AcquisitionChoice;
  onChange: (choice: AcquisitionChoice) => void;
  /** Sends the answer; enabled once a source is chosen */
  onContinue: () => void;
  /** Sends nothing */
  onSkip: () => void;
  canContinue: boolean;
};

/**
 * Optional second step after "Fertig" (plan 2.10): where people heard of us
 * and how many of their closest friends use Android. Both answers are
 * voluntary; "Überspringen" sends nothing.
 */
export function AcquisitionStepView({ choice, onChange, onContinue, onSkip, canContinue }: AcquisitionProps) {
  return (
    <Screen edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <AppText variant="label" color={colors.cyan}>
            Eine kurze Frage
          </AppText>
          <AppText variant="h1">Woher kennst du Wanna yap?</AppText>
          <AppText variant="body" color={colors.textSecondary}>
            Hilft uns zu verstehen, wo wir mehr Leute erreichen. Du kannst das auch überspringen.
          </AppText>
        </View>

        <View style={styles.pills} accessibilityRole="radiogroup">
          {SOURCE_OPTIONS.map((option) => (
            <ChoicePill
              key={option.value}
              label={option.label}
              selected={choice.source === option.value}
              onPress={() => onChange({ ...choice, source: option.value })}
            />
          ))}
        </View>

        <AppText variant="title" style={styles.question}>
          Wie viele deiner fünf engsten Freunde haben ein Android-Handy?
        </AppText>
        <View style={styles.pills} accessibilityRole="radiogroup">
          {ANDROID_OPTIONS.map((option) => (
            <ChoicePill
              key={String(option.value)}
              label={option.label}
              selected={choice.android === option.value}
              onPress={() => onChange({ ...choice, android: option.value })}
            />
          ))}
        </View>

        <View style={styles.stepFooter}>
          <Button title="Weiter" onPress={onContinue} disabled={!canContinue} />
          <Button title="Überspringen" variant="ghost" onPress={onSkip} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg },
  pill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  pillActive: { backgroundColor: colors.cyan, borderColor: colors.cyan },
  question: { marginTop: spacing.xxl },
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
  stepFooter: { marginTop: 'auto', paddingTop: spacing.xxl, gap: spacing.sm },
});
