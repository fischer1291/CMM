import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useCountdown } from '../../hooks/useCountdown';
import { AppText, Avatar, Button, colors, glow, gradients, radius, spacing } from '../../ui';

export type DailyParticipant = { phone: string; name: string; avatarUrl: string | null };

type Props = {
  endsAt: string;
  joined: boolean;
  participants: DailyParticipant[];
  onJoin: () => void;
  onCall: (phone: string) => void;
  onSurprise: () => void;
};

/** The daily Call Me Moment while it runs: join, see who's in, call someone. */
export function DailyMomentCard({ endsAt, joined, participants, onJoin, onCall, onSurprise }: Props) {
  const { formatted } = useCountdown(endsAt);
  return (
    <View style={[styles.wrap, glow(colors.pink, 0.5)]}>
      <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.border}>
        <View style={styles.card}>
          <View style={styles.head}>
            <AppText variant="label" color={colors.pink}>
              ⚡ Call Me Moment
            </AppText>
            <AppText variant="bodyStrong" style={styles.timer} accessibilityLabel={`Noch ${formatted}`}>
              {formatted}
            </AppText>
          </View>

          {!joined ? (
            <>
              <AppText variant="h2">Deine Leute haben jetzt 10 Minuten.</AppText>
              <AppText variant="caption" color={colors.textSecondary}>
                Alle bekommen den Moment gleichzeitig. Wer dabei ist, ist erreichbar, bis er endet.
              </AppText>
              <Button title="Dabei sein" icon="flash" onPress={onJoin} />
            </>
          ) : participants.length === 0 ? (
            <>
              <AppText variant="h2">Du bist dabei ✨</AppText>
              <AppText variant="caption" color={colors.textSecondary}>
                Sobald jemand aus deinen Kontakten dazukommt, siehst du es hier.
              </AppText>
            </>
          ) : (
            <>
              <AppText variant="h2">
                {participants.length === 1 ? '1 Person ist dabei' : `${participants.length} sind dabei`}
              </AppText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.people}>
                {participants.map((p) => (
                  <Pressable
                    key={p.phone}
                    onPress={() => onCall(p.phone)}
                    accessibilityRole="button"
                    accessibilityLabel={`${p.name} anrufen`}
                    style={styles.person}
                  >
                    <Avatar name={p.name} uri={p.avatarUrl} size={52} available />
                    <AppText variant="caption" numberOfLines={1} style={styles.personName}>
                      {p.name.split(' ')[0]}
                    </AppText>
                  </Pressable>
                ))}
              </ScrollView>
              <Button title="Überrasch mich 🎲" variant="secondary" onPress={onSurprise} />
            </>
          )}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.lg, borderRadius: radius.lg },
  border: { borderRadius: radius.lg, padding: 1.5 },
  card: { borderRadius: radius.lg - 1.5, backgroundColor: colors.bgElevated, padding: spacing.lg, gap: spacing.md },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timer: { fontVariant: ['tabular-nums'], color: colors.text },
  people: { gap: spacing.md, paddingVertical: spacing.xs },
  person: { alignItems: 'center', width: 60 },
  personName: { marginTop: spacing.xs, maxWidth: 60 },
});
