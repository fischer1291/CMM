import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Avatar, Button, colors, EmptyState, radius, Screen, spacing, TAB_BAR_SPACE } from '../../ui';
import { Moment, momentAge, REACTIONS } from './model';

export type MomentPerson = { name: string; avatarUrl: string | null };

type Props = {
  moments: Moment[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onReact: (momentId: string, emoji: string) => void;
  /** Display name/avatar for a phone number */
  person: (phone: string, fallbackName: string) => MomentPerson;
  onGoToContacts: () => void;
  /** "…" on someone else's moment: report / block */
  onMore?: (moment: Moment) => void;
  /** Own phone, to hide "…" on own moments */
  myPhone?: string | null;
  /** Moments waiting for my consent */
  requestCount: number;
  /** My moments waiting for the other person */
  waitingCount: number;
  /** Friends' moments I'll see after my first conversation today */
  locked: boolean;
  lockedCount: number;
  onOpenRequests: () => void;
  onOpenMemories: () => void;
};

/** Pills above the feed: memories, requests, waiting, locked */
function TopBar({ requestCount, waitingCount, locked, lockedCount, onOpenRequests, onOpenMemories }: Pick<Props, 'requestCount' | 'waitingCount' | 'locked' | 'lockedCount' | 'onOpenRequests' | 'onOpenMemories'>) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.topBar, { top: insets.top + spacing.sm }]}
      contentContainerStyle={styles.topBarContent}
    >
      <Pressable onPress={onOpenMemories} accessibilityRole="button" style={styles.pill}>
        <Ionicons name="images-outline" size={14} color={colors.text} />
        <AppText variant="caption">Erinnerungen</AppText>
      </Pressable>
      {requestCount > 0 && (
        <Pressable onPress={onOpenRequests} accessibilityRole="button" style={[styles.pill, styles.pillHot]}>
          <AppText variant="caption" color={colors.text}>
            ✨ {requestCount === 1 ? '1 Anfrage' : `${requestCount} Anfragen`}
          </AppText>
        </Pressable>
      )}
      {waitingCount > 0 && (
        <View style={styles.pill} accessibilityLabel={`${waitingCount} wartet auf Freigabe`}>
          <AppText variant="caption" color={colors.textSecondary}>
            ⏳ {waitingCount} wartet
          </AppText>
        </View>
      )}
      {locked && lockedCount > 0 && (
        <View style={styles.pill} accessibilityLabel={`${lockedCount} weitere nach deinem ersten Gespräch`}>
          <AppText variant="caption" color={colors.textSecondary}>
            🔒 +{lockedCount}
          </AppText>
        </View>
      )}
    </ScrollView>
  );
}

function MomentPage({
  moment,
  height,
  onReact,
  person,
  onMore,
  mine,
  topOffset,
}: {
  moment: Moment;
  height: number;
  onReact: Props['onReact'];
  person: Props['person'];
  onMore?: Props['onMore'];
  mine: boolean;
  /** Room for the pills above */
  topOffset: number;
}) {
  const insets = useSafeAreaInsets();
  const [picking, setPicking] = useState(false);
  const author = person(moment.userPhone, moment.userName);
  const partner = person(moment.targetPhone, moment.targetName);
  const top = [...moment.reactions].sort((a, b) => b.count - a.count);
  const primary = top[0] ?? { emoji: '❤️', count: 0, userReacted: false };

  const react = (emoji: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setPicking(false);
    onReact(moment.id, emoji);
  };

  return (
    <View style={{ height }}>
      <Image source={{ uri: moment.screenshot }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
      <LinearGradient colors={['rgba(11,11,18,0.92)', 'rgba(11,11,18,0.5)', 'transparent']} style={[styles.shade, { top: 0, height: 220 }]} />
      <LinearGradient colors={['transparent', 'rgba(11,11,18,0.92)']} style={[styles.shade, { bottom: 0, height: 260 }]} />

      <View style={[styles.header, { top: insets.top + spacing.sm + topOffset }]}>
        <Avatar name={author.name} uri={author.avatarUrl} size={40} />
        <View style={{ flex: 1 }}>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {author.name} <AppText color={colors.textSecondary}>mit</AppText> {partner.name}
          </AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            vor {momentAge(moment.timestamp)} · {moment.callDuration} gesprochen
          </AppText>
        </View>
        {onMore && !mine ? (
          <Pressable
            onPress={() => onMore(moment)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Melden oder blockieren"
            style={styles.more}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.text} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.side}>
        {picking && (
          <View style={styles.picker}>
            <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
            {REACTIONS.map((emoji) => (
              <Pressable key={emoji} onPress={() => react(emoji)} hitSlop={6} accessibilityLabel={`Mit ${emoji} reagieren`}>
                <AppText style={styles.pickerEmoji}>{emoji}</AppText>
              </Pressable>
            ))}
          </View>
        )}
        <Pressable
          onPress={() => react(primary.emoji)}
          onLongPress={() => setPicking((p) => !p)}
          delayLongPress={350}
          accessibilityRole="button"
          accessibilityLabel={`${primary.emoji} Reaktion, lange drücken für mehr`}
          style={[styles.reactButton, primary.userReacted && styles.reactButtonActive]}
        >
          <AppText style={styles.reactEmoji}>{primary.emoji}</AppText>
          <AppText variant="caption">{moment.totalReactions}</AppText>
        </Pressable>
        <Pressable onPress={() => setPicking((p) => !p)} accessibilityRole="button" accessibilityLabel="Alle Reaktionen" style={styles.moreButton}>
          <AppText variant="bodyStrong">+</AppText>
        </Pressable>
      </View>

      <View style={[styles.footer, { paddingBottom: TAB_BAR_SPACE - spacing.md }]}>
        <View style={styles.mood}>
          <AppText variant="caption">{moment.mood}</AppText>
        </View>
        {moment.note ? (
          <AppText variant="title" style={{ marginTop: spacing.sm }}>
            {moment.note}
          </AppText>
        ) : null}
        {top.length > 0 && (
          <View style={styles.reactionRow}>
            {top.slice(0, 4).map((r) => (
              <Pressable
                key={r.emoji}
                onPress={() => react(r.emoji)}
                style={[styles.reactionChip, r.userReacted && styles.reactionChipActive]}
                accessibilityLabel={`${r.emoji} ${r.count}`}
              >
                <AppText variant="caption">
                  {r.emoji} {r.count}
                </AppText>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

/** Full-screen, vertically paged feed of shared CallMoments. */
export function MomentsView(props: Props) {
  const { moments, loading, refreshing, onRefresh, onReact, person, onGoToContacts, onMore, myPhone, locked, lockedCount } = props;
  const { height } = useWindowDimensions();
  const topBar = <TopBar {...props} />;

  if (loading && moments.length === 0) {
    return (
      <Screen contentStyle={styles.center}>
        <ActivityIndicator color={colors.cyan} size="large" />
      </Screen>
    );
  }

  if (moments.length === 0) {
    const waitingForYou = locked && lockedCount > 0;
    return (
      <View style={styles.root}>
        <Screen contentStyle={styles.center}>
          {waitingForYou ? (
            <EmptyState
              icon="lock-closed-outline"
              title={lockedCount === 1 ? '1 Moment wartet auf dich' : `${lockedCount} Moments warten auf dich`}
              text="Deine Leute haben heute Momente geteilt. Führ zuerst selbst ein echtes Gespräch, dann siehst du sie."
            />
          ) : (
            <EmptyState
              icon="sparkles-outline"
              title="Noch keine Moments"
              text="Halte während eines Anrufs mit ✨ einen Moment fest. Wenn dein Gegenüber zustimmt, sehen ihn eure Kontakte 24 Stunden lang."
            />
          )}
          <Button
            title={waitingForYou ? 'Wer hat gerade Zeit?' : 'Jemanden anrufen'}
            icon="videocam"
            onPress={onGoToContacts}
            style={{ alignSelf: 'stretch' }}
          />
        </Screen>
        {topBar}
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <FlatList
        data={moments}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => (
          <MomentPage
            moment={item}
            height={height}
            onReact={onReact}
            person={person}
            onMore={onMore}
            mine={!!myPhone && item.userPhone.replace(/^\+?/, '+') === myPhone}
            topOffset={44}
          />
        )}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        decelerationRate="fast"
        getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cyan} />}
      />
      {topBar}
    </View>
  );
}

// Controls sit on arbitrary photos: dark glass keeps them readable
const DARK_GLASS = 'rgba(11,11,18,0.62)';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  mood: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: DARK_GLASS,
    borderWidth: 1,
    borderColor: colors.pink,
  },
  center: { justifyContent: 'center' },
  shade: { position: 'absolute', left: 0, right: 0 },
  header: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  // One line; scrolls sideways if the pills don't fit
  topBar: { position: 'absolute', left: 0, right: 0, flexGrow: 0 },
  topBarContent: { gap: spacing.sm, paddingHorizontal: spacing.lg },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    backgroundColor: DARK_GLASS,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  pillHot: { backgroundColor: 'rgba(255,46,147,0.55)', borderColor: colors.pink },
  more: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DARK_GLASS,
  },
  side: { position: 'absolute', right: spacing.lg, bottom: 280, alignItems: 'center', gap: spacing.md },
  reactButton: {
    width: 60,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    alignItems: 'center',
    backgroundColor: DARK_GLASS,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  reactButtonActive: { borderColor: colors.pink, borderWidth: 1.5 },
  reactEmoji: { fontSize: 28, lineHeight: 34 },
  moreButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DARK_GLASS,
  },
  picker: {
    position: 'absolute',
    right: 72,
    bottom: 40,
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  pickerEmoji: { fontSize: 28, lineHeight: 34 },
  footer: { position: 'absolute', left: spacing.xl, right: 96, bottom: 0 },
  reactionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, flexWrap: 'wrap' },
  reactionChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: DARK_GLASS,
  },
  reactionChipActive: { backgroundColor: 'rgba(255,46,147,0.55)' },
});
