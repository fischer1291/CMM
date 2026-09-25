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
  BadgeMedal,
  glow,
  GlassCard,
  PageHeader,
  Screen,
  SectionHeader,
  Segmented,
  spacing,
} from '../../ui';

export type Person = { name: string; avatarUrl: string | null };

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
  onOpenAlbum: () => void;
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

/** Earned medals, newest tiers first, as a teaser for the album. */
function AlbumTeaser({ badges, onOpen }: { badges: Badge[]; onOpen: () => void }) {
  const earned = badges.filter((b) => b.earned);
  return (
    <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel="Sammelalbum öffnen">
      <GlassCard>
        {earned.length ? (
          <View style={styles.medals}>
            {earned.slice(0, 5).map((b) => (
              <BadgeMedal key={b.id} icon={b.icon ?? 'star'} earned tierName={b.tierName} size={44} />
            ))}
            {earned.length > 5 ? (
              <View style={styles.more}>
                <AppText variant="caption">+{earned.length - 5}</AppText>
              </View>
            ) : null}
          </View>
        ) : null}
        <View style={styles.albumRow}>
          <AppText variant="bodyStrong" style={{ flex: 1 }}>
            {earned.length ? 'Sammelalbum öffnen' : 'Dein erstes Abzeichen wartet im Album'}
          </AppText>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>
      </GlassCard>
    </Pressable>
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
  onOpenAlbum,
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
      <AlbumTeaser badges={stats.badges} onOpen={onOpenAlbum} />

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
  medals: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  more: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  albumRow: { flexDirection: 'row', alignItems: 'center' },
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

