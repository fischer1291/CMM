import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import type { Badge, Sharing, Stats, Visibility } from '../../services/gamificationApi';
import { talkTime } from '../../services/gamificationApi';
import {
  AppText,
  Avatar,
  Button,
  colors,
  glow,
  GlassCard,
  gradients,
  PageHeader,
  Screen,
  SectionHeader,
  Segmented,
  spacing,
} from '../../ui';

export type Person = { name: string; avatarUrl: string | null };

const BADGE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  first_talk: 'chatbubbles',
  deep_talk: 'water',
  hour: 'time',
  ten_talks: 'call',
  streak_4: 'flame',
  circle: 'people',
  ten_hours: 'hourglass',
  planner: 'calendar',
  storyteller: 'sparkles',
};

const VISIBILITY_OPTIONS: { value: Visibility; label: string }[] = [
  { value: 'private', label: 'Nur ich' },
  { value: 'contacts', label: 'Kontakte' },
  { value: 'selected', label: 'Auswahl' },
];

type Props = {
  stats: Stats | null;
  sharing: Sharing;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onBack: () => void;
  person: (phone: string) => Person;
  onChangeVisibility: (visibility: Visibility) => void;
  onPickPeople: () => void;
  savingSharing?: boolean;
};

/** "21.09." from "2026-09-21" */
const shortDate = (dateKey: string) => `${dateKey.slice(8, 10)}.${dateKey.slice(5, 7)}.`;

function WeekChart({ weeks }: { weeks: Stats['weeks'] }) {
  const max = Math.max(...weeks.map((w) => w.seconds), 15 * 60);
  return (
    <View style={styles.chart} accessibilityLabel="Gesprächszeit der letzten acht Wochen">
      {weeks.map((w, i) => {
        const current = i === weeks.length - 1;
        const height = Math.max(4, (w.seconds / max) * 110);
        return (
          <View key={w.week} style={styles.chartColumn}>
            <View style={styles.chartTrack}>
              {current ? (
                <LinearGradient colors={[colors.cyan, colors.pink]} style={[styles.bar, { height }, glow(colors.cyan, 0.5)]} />
              ) : (
                <View style={[styles.bar, { height, backgroundColor: w.seconds ? colors.violet : colors.surfaceStrong }]} />
              )}
            </View>
            <AppText variant="caption" color={current ? colors.text : colors.textMuted} style={styles.chartLabel}>
              {current ? 'Jetzt' : shortDate(w.week)}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

function BadgeTile({ badge }: { badge: Badge }) {
  return (
    <View style={styles.badge} accessibilityLabel={`${badge.title}: ${badge.description}${badge.earned ? ', erreicht' : ''}`}>
      <View style={[styles.badgeIcon, badge.earned ? [styles.badgeIconEarned, glow(colors.pink, 0.45)] : null]}>
        {badge.earned ? (
          <LinearGradient colors={gradients.brand} style={[StyleSheet.absoluteFill, styles.round]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
        ) : null}
        <Ionicons name={BADGE_ICONS[badge.id] ?? 'star'} size={24} color={badge.earned ? colors.text : colors.textMuted} />
      </View>
      <AppText variant="caption" center numberOfLines={2} color={badge.earned ? colors.text : colors.textSecondary}>
        {badge.title}
      </AppText>
      {!badge.earned && (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(badge.progress * 100)}%` }]} />
        </View>
      )}
    </View>
  );
}

export function BadgeGrid({ badges }: { badges: Badge[] }) {
  return (
    <View style={styles.badges}>
      {badges.map((badge) => (
        <BadgeTile key={badge.id} badge={badge} />
      ))}
    </View>
  );
}

/** Personal talk time: private by default, shared only if the user wants to. */
export function StatsView({
  stats,
  sharing,
  loading,
  error,
  onRetry,
  onBack,
  person,
  onChangeVisibility,
  onPickPeople,
  savingSharing,
}: Props) {
  if (!stats) {
    return (
      <Screen>
        <PageHeader title="Deine Gesprächszeit" onBack={onBack} />
        <View style={styles.center}>
          {loading ? (
            <ActivityIndicator color={colors.cyan} size="large" />
          ) : error ? (
            <>
              <AppText variant="body" color={colors.textSecondary} center>
                Deine Statistik konnte nicht geladen werden.
              </AppText>
              <Button title="Erneut versuchen" variant="secondary" onPress={onRetry} />
            </>
          ) : null}
        </View>
      </Screen>
    );
  }

  const { totals, streak } = stats;
  const earned = stats.badges.filter((b) => b.earned).length;

  return (
    <Screen scroll>
      <PageHeader title="Deine Gesprächszeit" onBack={onBack} />

      <GlassCard glow={colors.cyan}>
        <AppText variant="label" color={colors.textMuted}>
          Diese Woche
        </AppText>
        <AppText variant="display" style={styles.hero}>
          {talkTime(totals.weekSeconds)}
        </AppText>
        <AppText variant="caption" color={colors.textSecondary}>
          {totals.weekSeconds > 0
            ? 'Zeit, die du dir für echte Gespräche genommen hast.'
            : 'Noch kein Gespräch diese Woche. Vielleicht passt es ja heute?'}
        </AppText>
        <WeekChart weeks={stats.weeks} />
      </GlassCard>

      <View style={styles.tiles}>
        <GlassCard style={styles.tile}>
          <AppText variant="h2" color={colors.pink}>
            {streak.current}
          </AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            {streak.current === 1 ? 'Woche in Folge' : 'Wochen in Folge'}
          </AppText>
        </GlassCard>
        <GlassCard style={styles.tile}>
          <AppText variant="h2" color={colors.cyan}>
            {Math.round(totals.monthSeconds / 60)}
          </AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            Min. diesen Monat
          </AppText>
        </GlassCard>
        <GlassCard style={styles.tile}>
          <AppText variant="h2" color={colors.violet}>
            {totals.talks}
          </AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            {totals.talks === 1 ? 'Gespräch' : 'Gespräche'}
          </AppText>
        </GlassCard>
      </View>

      <SectionHeader
        title="Deine Menschen"
        right={
          <View style={styles.privateHint}>
            <Ionicons name="lock-closed" size={12} color={colors.textMuted} />
            <AppText variant="caption" color={colors.textMuted}>
              nur für dich
            </AppText>
          </View>
        }
      />
      {stats.people.length > 0 ? (
        <GlassCard padded={false}>
          {stats.people.map((p, i) => {
            const who = person(p.phone);
            return (
              <View key={p.phone} style={[styles.personRow, i > 0 && styles.divider]}>
                <Avatar name={who.name} uri={who.avatarUrl} size={40} />
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyStrong" numberOfLines={1}>
                    {who.name}
                  </AppText>
                  <AppText variant="caption" color={colors.textSecondary}>
                    {p.talks === 1 ? '1 Gespräch' : `${p.talks} Gespräche`}
                  </AppText>
                </View>
                <AppText variant="bodyStrong" color={colors.cyan}>
                  {talkTime(p.seconds)}
                </AppText>
              </View>
            );
          })}
        </GlassCard>
      ) : (
        <GlassCard>
          <AppText variant="caption" color={colors.textSecondary}>
            Hier siehst du, mit wem du dir Zeit genommen hast, sobald du dein erstes Gespräch geführt hast.
          </AppText>
        </GlassCard>
      )}

      <SectionHeader title={`Abzeichen · ${earned}/${stats.badges.length}`} />
      <BadgeGrid badges={stats.badges} />

      <SectionHeader title="Wer darf das sehen?" />
      <GlassCard>
        <Segmented options={VISIBILITY_OPTIONS} value={sharing.visibility} onChange={onChangeVisibility} />
        <AppText variant="caption" color={colors.textSecondary} style={{ marginTop: spacing.md }}>
          {sharing.visibility === 'private'
            ? 'Deine Statistik ist privat. Niemand sonst sieht sie.'
            : 'Geteilt werden nur Gesprächszeit, Serie und Abzeichen, nie, mit wem du sprichst.'}
        </AppText>
        {sharing.visibility === 'selected' && (
          <Pressable onPress={onPickPeople} accessibilityRole="button" style={styles.pick}>
            <AppText variant="bodyStrong">
              {sharing.sharedWith.length === 0
                ? 'Personen auswählen'
                : sharing.sharedWith.length === 1
                  ? '1 Person ausgewählt'
                  : `${sharing.sharedWith.length} Personen ausgewählt`}
            </AppText>
            {savingSharing ? (
              <ActivityIndicator color={colors.cyan} />
            ) : (
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            )}
          </Pressable>
        )}
      </GlassCard>

      <AppText variant="caption" color={colors.textMuted} center style={styles.footer}>
        Keine Rangliste, kein Vergleich. Nur deine Zeit mit Menschen, die dir wichtig sind.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.lg },
  hero: { marginTop: spacing.xs, marginBottom: spacing.xs },
  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: spacing.xl },
  chartColumn: { flex: 1, alignItems: 'center' },
  chartTrack: { height: 110, justifyContent: 'flex-end' },
  bar: { width: 18, borderRadius: 9 },
  chartLabel: { marginTop: spacing.sm, fontSize: 10 },
  tiles: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  tile: { flex: 1 },
  privateHint: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  badges: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.lg },
  badge: { width: '33.33%', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xs },
  badgeIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeIconEarned: { borderColor: 'transparent', overflow: 'visible' },
  round: { borderRadius: 30 },
  progressTrack: { width: 48, height: 4, borderRadius: 2, backgroundColor: colors.surfaceStrong, overflow: 'hidden' },
  progressFill: { height: 4, backgroundColor: colors.violet },
  pick: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  footer: { marginTop: spacing.xxl, paddingHorizontal: spacing.lg },
});

