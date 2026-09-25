import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Album, AlbumBadge } from '../../services/badgesApi';
import { AppText, BadgeMedal, Button, colors, GlassCard, PageHeader, radius, Screen, SectionHeader, spacing } from '../../ui';

export const SHOWCASE_MAX = 3;

/** Small progress bar under a medal or in a card. */
export function ProgressBar({ value, width = 48 }: { value: number; width?: number | `${number}%` }) {
  return (
    <View style={[styles.track, { width }]}>
      <View style={[styles.fill, { width: `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%` }]} />
    </View>
  );
}

/** Earned tiers as dots: ●●○ */
function TierDots({ tier, tiers }: { tier: number; tiers: number }) {
  if (tiers < 2) return null;
  return (
    <View style={styles.dots}>
      {Array.from({ length: tiers }, (_, i) => (
        <View key={i} style={[styles.dot, i < tier && styles.dotOn]} />
      ))}
    </View>
  );
}

/** One badge in a grid: medal, title, tier dots or progress. */
export function BadgeTile({ badge, onPress, pinned }: { badge: AlbumBadge; onPress?: () => void; pinned?: boolean }) {
  const hidden = badge.secret && !badge.earned;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={`${badge.title}${badge.tierName ? ` ${badge.tierName}` : ''}${badge.earned ? ', erreicht' : ''}`}
      style={({ pressed }) => [styles.tile, pressed && { opacity: 0.7 }]}
    >
      <View>
        <BadgeMedal icon={badge.icon} earned={badge.earned} tierName={badge.tierName} secret={hidden} />
        {pinned ? (
          <View style={styles.pin}>
            <Ionicons name="star" size={10} color={colors.bg} />
          </View>
        ) : null}
      </View>
      <AppText variant="caption" center numberOfLines={2} color={badge.earned ? colors.text : colors.textSecondary}>
        {badge.title}
      </AppText>
      {badge.earned ? <TierDots tier={badge.tier} tiers={badge.tiers} /> : !hidden ? <ProgressBar value={badge.progress} /> : null}
    </Pressable>
  );
}

export function BadgeGrid({ badges, onPress, pinned = [] }: { badges: AlbumBadge[]; onPress?: (b: AlbumBadge) => void; pinned?: string[] }) {
  return (
    <View style={styles.grid}>
      {badges.map((b) => (
        <BadgeTile key={b.id} badge={b} onPress={onPress ? () => onPress(b) : undefined} pinned={pinned.includes(b.id)} />
      ))}
    </View>
  );
}

/** "Fast geschafft": the closest badge, gently. */
export function NextUpCard({ nextUp, onPress }: { nextUp: NonNullable<Album['nextUp']>; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
      <GlassCard>
        <View style={styles.nextRow}>
          <BadgeMedal icon={nextUp.icon} earned={false} size={44} />
          <View style={{ flex: 1, gap: 6 }}>
            <AppText variant="label" color={colors.textMuted}>
              Fast geschafft
            </AppText>
            <AppText variant="bodyStrong">{nextUp.hint}</AppText>
            <ProgressBar value={nextUp.progress} width="100%" />
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>
      </GlassCard>
    </Pressable>
  );
}

type Props = {
  album: Album | null;
  error: boolean;
  onRetry: () => void;
  onBack: () => void;
  onSelect: (badge: AlbumBadge) => void;
};

/** The badge album: showcase, what's next, and every badge by category. */
export function AlbumView({ album, error, onRetry, onBack, onSelect }: Props) {
  if (!album) {
    return (
      <Screen>
        <PageHeader title="Sammelalbum" onBack={onBack} />
        <View style={styles.center}>
          {error ? (
            <>
              <AppText variant="body" color={colors.textSecondary} center>
                Dein Album konnte nicht geladen werden.
              </AppText>
              <Button title="Erneut versuchen" variant="secondary" onPress={onRetry} />
            </>
          ) : (
            <ActivityIndicator color={colors.cyan} size="large" />
          )}
        </View>
      </Screen>
    );
  }

  const earned = album.badges.filter((b) => b.earned).length;
  const tiersEarned = album.badges.reduce((sum, b) => sum + b.tier, 0);
  const tiersTotal = album.badges.reduce((sum, b) => sum + b.tiers, 0);
  const showcase = album.showcase.map((id) => album.badges.find((b) => b.id === id)).filter((b): b is AlbumBadge => !!b);

  return (
    <Screen scroll>
      <PageHeader title="Sammelalbum" onBack={onBack} />

      <GlassCard glow={colors.violet}>
        <View style={styles.heroRow}>
          <View style={{ flex: 1 }}>
            <AppText variant="display">
              {earned}
              <AppText variant="h2" color={colors.textMuted}>
                {' '}
                / {album.badges.length}
              </AppText>
            </AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              Abzeichen gesammelt · {tiersEarned} von {tiersTotal} Stufen
            </AppText>
          </View>
        </View>
        <ProgressBar value={tiersTotal ? tiersEarned / tiersTotal : 0} width="100%" />

        <AppText variant="label" color={colors.textMuted} style={{ marginTop: spacing.lg }}>
          Deine Vitrine
        </AppText>
        <View style={styles.showcase}>
          {Array.from({ length: SHOWCASE_MAX }, (_, i) => {
            const b = showcase[i];
            return b ? (
              <Pressable key={b.id} onPress={() => onSelect(b)} style={styles.slot} accessibilityRole="button" accessibilityLabel={b.title}>
                <BadgeMedal icon={b.icon} earned tierName={b.tierName} size={52} />
                <AppText variant="caption" numberOfLines={1} center>
                  {b.title}
                </AppText>
              </Pressable>
            ) : (
              <View key={`empty${i}`} style={styles.slot}>
                <View style={styles.emptySlot}>
                  <Ionicons name="add" size={20} color={colors.textMuted} />
                </View>
                <AppText variant="caption" color={colors.textMuted} center>
                  frei
                </AppText>
              </View>
            );
          })}
        </View>
        <AppText variant="caption" color={colors.textMuted}>
          Tippe auf ein Abzeichen, um es in deiner Vitrine zu zeigen. Sie sehen nur Menschen, mit denen du deine Statistik teilst.
        </AppText>
      </GlassCard>

      {album.nextUp ? (
        <View style={{ marginTop: spacing.md }}>
          <NextUpCard nextUp={album.nextUp} onPress={() => onSelect(album.badges.find((b) => b.id === album.nextUp!.id)!)} />
        </View>
      ) : null}

      {album.categories.map((cat) => {
        const list = album.badges.filter((b) => b.category === cat.id);
        if (!list.length) return null;
        const got = list.filter((b) => b.earned).length;
        return (
          <View key={cat.id}>
            <SectionHeader title={`${cat.title} · ${got}/${list.length}`} />
            <BadgeGrid badges={list} onPress={onSelect} pinned={album.showcase} />
          </View>
        );
      })}

      <AppText variant="caption" color={colors.textMuted} center style={styles.footer}>
        Keine Rangliste, kein Vergleich. Jedes Abzeichen steht für Zeit mit Menschen, die dir wichtig sind.
      </AppText>
    </Screen>
  );
}

/** Details of one badge; earned ones can go into the showcase. */
export function BadgeSheet({
  badge,
  pinned,
  canPin,
  busy,
  onTogglePin,
  onClose,
}: {
  badge: AlbumBadge;
  pinned: boolean;
  canPin: boolean;
  busy?: boolean;
  onTogglePin?: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const hidden = badge.secret && !badge.earned;
  const maxed = badge.earned && badge.tier === badge.tiers;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Schließen" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={{ alignItems: 'center', gap: spacing.md }}>
          <BadgeMedal icon={badge.icon} earned={badge.earned} tierName={badge.tierName} secret={hidden} size={96} />
          <AppText variant="h2" center>
            {badge.title}
            {badge.tierName ? ` · ${badge.tierName}` : ''}
          </AppText>
          <AppText variant="body" color={colors.textSecondary} center>
            {hidden
              ? 'Ein geheimes Abzeichen. Du entdeckst es, wenn es so weit ist.'
              : maxed
                ? `Geschafft: ${badge.description}`
                : badge.description}
          </AppText>
          {badge.tiers > 1 ? <TierDots tier={badge.tier} tiers={badge.tiers} /> : null}
          {!hidden && !maxed && badge.next != null ? (
            <View style={{ alignSelf: 'stretch', gap: spacing.xs }}>
              <ProgressBar value={badge.progress} width="100%" />
              <AppText variant="caption" color={colors.textMuted} center>
                {badge.current ?? 0} von {badge.next}
              </AppText>
            </View>
          ) : null}
        </View>
        {badge.earned && onTogglePin ? (
          <Button
            title={pinned ? 'Aus der Vitrine nehmen' : canPin ? 'In der Vitrine zeigen' : 'Vitrine ist voll (3)'}
            icon={pinned ? 'star' : 'star-outline'}
            variant={pinned ? 'secondary' : 'primary'}
            disabled={!pinned && !canPin}
            loading={busy}
            onPress={onTogglePin}
          />
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.lg },
  heroRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  showcase: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: spacing.md },
  slot: { width: 88, alignItems: 'center', gap: spacing.xs },
  emptySlot: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.lg },
  tile: { width: '33.33%', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xs },
  pin: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.cyan,
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: { height: 4, borderRadius: 2, backgroundColor: colors.surfaceStrong, overflow: 'hidden' },
  fill: { height: 4, backgroundColor: colors.violet },
  dots: { flexDirection: 'row', gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.surfaceStrong },
  dotOn: { backgroundColor: colors.cyan },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  footer: { marginTop: spacing.xxl, paddingHorizontal: spacing.lg },
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  sheet: {
    gap: spacing.xl,
    padding: spacing.xl,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.bgElevated,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
});
