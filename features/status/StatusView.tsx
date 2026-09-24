import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  AppText,
  Avatar,
  colors,
  GlassCard,
  Screen,
  SectionHeader,
  spacing,
  StatusOrb,
  TAB_BAR_SPACE,
} from '../../ui';

export type AvailableContact = { phone: string; name: string; avatarUrl: string | null };

type Props = {
  name: string;
  avatarUrl: string | null;
  available: boolean;
  onToggleAvailable: () => void;
  toggling?: boolean;
  /** Running Call Me Moment: share left (0..1) and "mm:ss" */
  momentProgress?: number | null;
  momentRemaining?: string | null;
  availableContacts: AvailableContact[];
  onCallContact: (phone: string) => void;
  stats: { conversations: number; minutes: number };
  onOpenProfile?: () => void;
};

function Stat({ value, label, accent }: { value: string; label: string; accent: string }) {
  return (
    <GlassCard style={styles.stat}>
      <AppText variant="h1" color={accent}>
        {value}
      </AppText>
      <AppText variant="caption" color={colors.textSecondary}>
        {label}
      </AppText>
    </GlassCard>
  );
}

/** Home screen: own availability, who else is available, and this week's talk time. */
export function StatusView({
  name,
  avatarUrl,
  available,
  onToggleAvailable,
  toggling,
  momentProgress,
  momentRemaining,
  availableContacts,
  onCallContact,
  stats,
  onOpenProfile,
}: Props) {
  const firstName = name.split(' ')[0] || 'du';

  return (
    <Screen scroll contentStyle={{ paddingBottom: TAB_BAR_SPACE }}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <AppText variant="label" color={colors.textMuted}>
            {available ? 'Online' : 'Offline'}
          </AppText>
          <AppText variant="h1">Hey {firstName}</AppText>
        </View>
        <Pressable onPress={onOpenProfile} accessibilityRole="button" accessibilityLabel="Profil">
          <Avatar name={name || '?'} uri={avatarUrl} size={48} />
        </Pressable>
      </View>

      <View style={styles.orb}>
        <StatusOrb
          available={available}
          onToggle={onToggleAvailable}
          disabled={toggling}
          progress={momentProgress}
          caption={momentRemaining ? `${momentRemaining} übrig` : null}
        />
        <AppText variant="body" color={colors.textSecondary} center style={styles.hint}>
          {available
            ? 'Deine Kontakte sehen, dass du gerade Zeit für einen Anruf hast.'
            : 'Tippe, wenn du Zeit für ein echtes Gespräch hast.'}
        </AppText>
      </View>

      <SectionHeader title="Jetzt erreichbar" />
      {availableContacts.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          // Let the avatars' glow spill over instead of being clipped
          style={styles.peopleScroll}
          contentContainerStyle={styles.people}
        >
          {availableContacts.map((c) => (
            <Pressable
              key={c.phone}
              onPress={() => onCallContact(c.phone)}
              accessibilityRole="button"
              accessibilityLabel={`${c.name} anrufen`}
              style={styles.person}
            >
              <Avatar name={c.name} uri={c.avatarUrl} size={64} available />
              <AppText variant="caption" numberOfLines={1} style={styles.personName}>
                {c.name.split(' ')[0]}
              </AppText>
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <GlassCard>
          <AppText variant="bodyStrong">Gerade ist niemand erreichbar</AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            Sobald jemand aus deinen Kontakten Zeit hat, taucht er hier auf.
          </AppText>
        </GlassCard>
      )}

      <SectionHeader title="Diese Woche" />
      <View style={styles.stats}>
        <Stat value={String(stats.conversations)} label={stats.conversations === 1 ? 'Gespräch' : 'Gespräche'} accent={colors.cyan} />
        <Stat value={String(stats.minutes)} label="Minuten gesprochen" accent={colors.pink} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg },
  orb: { alignItems: 'center', marginTop: spacing.xxl },
  hint: { marginTop: spacing.lg, maxWidth: 300 },
  peopleScroll: { overflow: 'visible', marginHorizontal: -spacing.xl },
  people: { gap: spacing.lg, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  person: { alignItems: 'center', width: 72 },
  personName: { marginTop: spacing.sm, maxWidth: 72 },
  stats: { flexDirection: 'row', gap: spacing.md },
  stat: { flex: 1 },
});
