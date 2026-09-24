import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Button, colors, fonts, glow, radius, spacing } from '../../ui';

const MOODS = ['😊', '🤣', '🥰', '😎', '🥳', '🤔', '😌', '😴', '😔', '🤪'];
const MAX_NOTE = 200;

export type MomentDraft = {
  screenshot: string;
  note: string;
  mood: string;
  userPhone: string;
  userName: string;
  targetPhone: string;
  targetName: string;
  callDuration: string;
  reactions: [];
  totalReactions: 0;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onPost: (draft: MomentDraft) => void;
  screenshotUri: string | null;
  userPhone: string;
  userName: string;
  targetPhone: string;
  targetName: string;
  callDuration: string;
};

/** Share a screenshot from the call with a mood and a short note. */
export function MomentComposer({
  visible,
  onClose,
  onPost,
  screenshotUri,
  userPhone,
  userName,
  targetPhone,
  targetName,
  callDuration,
}: Props) {
  const insets = useSafeAreaInsets();
  const [mood, setMood] = useState(MOODS[0]);
  const [note, setNote] = useState('');

  const close = () => {
    setMood(MOODS[0]);
    setNote('');
    onClose();
  };

  const post = () => {
    if (!screenshotUri) return;
    onPost({
      screenshot: screenshotUri,
      note: note.trim(),
      mood,
      userPhone,
      userName,
      targetPhone,
      targetName,
      callDuration,
      reactions: [],
      totalReactions: 0,
    });
    setMood(MOODS[0]);
    setNote('');
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={close}>
      <View style={styles.root}>
        {screenshotUri ? <Image source={{ uri: screenshotUri }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
        <LinearGradient colors={['rgba(11,11,18,0.85)', 'transparent']} style={[styles.shade, { top: 0 }]} />

        <View style={[styles.top, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Schließen" hitSlop={10} style={styles.close}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <AppText variant="title">Moment teilen</AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              mit {targetName} · {callDuration}
            </AppText>
          </View>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.bottom}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
            <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
            <AppText variant="label" color={colors.textMuted}>
              Stimmung
            </AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.moods}>
              {MOODS.map((m) => (
                <Pressable
                  key={m}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setMood(m);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: mood === m }}
                  style={[styles.mood, mood === m && [styles.moodActive, glow(colors.cyan, 0.5)]]}
                >
                  <AppText style={styles.moodEmoji}>{m}</AppText>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.noteBox}>
              <TextInput
                value={note}
                onChangeText={(t) => setNote(t.slice(0, MAX_NOTE))}
                placeholder="Was war schön an diesem Gespräch?"
                placeholderTextColor={colors.textMuted}
                selectionColor={colors.cyan}
                multiline
                style={styles.note}
                accessibilityLabel="Notiz"
              />
              <AppText variant="caption" color={colors.textMuted} style={styles.counter}>
                {note.length}/{MAX_NOTE}
              </AppText>
            </View>

            <AppText variant="caption" color={colors.textSecondary}>
              {targetName} bekommt den Moment zuerst zu sehen. Erst wenn ihr beide einverstanden seid, sehen ihn eure Kontakte 24 Stunden lang.
            </AppText>
            <Button title="Teilen" icon="sparkles" onPress={post} disabled={!screenshotUri} />
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  shade: { position: 'absolute', left: 0, right: 0, height: 180 },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg },
  close: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(11,11,18,0.6)',
  },
  bottom: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    gap: spacing.md,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: 'hidden',
    // Tint over the blur: the screenshot behind can be bright
    backgroundColor: 'rgba(11,11,18,0.72)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  moods: { gap: spacing.sm, paddingVertical: spacing.xs },
  mood: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  moodActive: { borderColor: colors.cyan, backgroundColor: 'rgba(0,229,255,0.14)' },
  moodEmoji: { fontSize: 26, lineHeight: 32 },
  noteBox: {
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  note: { minHeight: 64, maxHeight: 120, color: colors.text, fontFamily: fonts.regular, fontSize: 16 },
  counter: { alignSelf: 'flex-end' },
});
