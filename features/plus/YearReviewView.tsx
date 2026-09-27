import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { YearReview } from '../../services/planApi';
import { AppText, Avatar, Button, colors, spacing } from '../../ui';

const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const nf = new Intl.NumberFormat('de-DE');
const hours = (m: number) => (m >= 120 ? `${nf.format(Math.round(m / 60))} Stunden` : `${nf.format(m)} Minuten`);

type Person = { name: string; avatarUrl: string | null };
type Props = {
  review: YearReview | null;
  error: boolean;
  /** Names from the address book */
  person: (phone: string | undefined, fallback: string | null | undefined) => Person;
  onClose: () => void;
  onShare: () => void;
  onPlus: () => void;
  onRetry: () => void;
  /** Open on this page (dev previews) */
  startAt?: number;
};

const GRADIENTS: [string, string, string][] = [
  ['#1B1340', '#0B0B12', '#3D1030'],
  ['#0B2A3A', '#0B0B12', '#1B1340'],
  ['#3D1030', '#0B0B12', '#0B2A3A'],
  ['#1B1340', '#13131E', '#0B2A3A'],
  ['#2A1F4D', '#0B0B12', '#3D1030'],
  ['#0B2A3A', '#13131E', '#3D1030'],
];

function Page({ index, height, children }: { index: number; height: number; children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  return (
    <View style={{ width, height }}>
      <LinearGradient colors={GRADIENTS[index % GRADIENTS.length]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={styles.page}>{children}</View>
    </View>
  );
}

const Big = ({ children, color = colors.text }: { children: React.ReactNode; color?: string }) => (
  <AppText variant="display" center color={color} style={styles.big}>
    {children}
  </AppText>
);
const Label = ({ children }: { children: React.ReactNode }) => (
  <AppText variant="label" color={colors.cyan} center>
    {children}
  </AppText>
);
const Line = ({ children }: { children: React.ReactNode }) => (
  <AppText variant="title" center color={colors.textSecondary} style={{ maxWidth: 320 }}>
    {children}
  </AppText>
);

/** "Dein Jahr in Gesprächen" as swipeable pages. */
export function YearReviewView({ review, error, person, onClose, onShare, onPlus, onRetry, startAt = 0 }: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [page, setPage] = useState(startAt);
  const { width } = useWindowDimensions();

  if (!review) {
    return (
      <View style={[styles.root, styles.center]}>
        {error ? (
          <>
            <AppText variant="body" color={colors.textSecondary} center>
              Dein Rückblick konnte nicht geladen werden.
            </AppText>
            <Button title="Erneut versuchen" variant="secondary" onPress={onRetry} />
          </>
        ) : (
          <ActivityIndicator color={colors.cyan} />
        )}
        <Pressable onPress={onClose} style={[styles.close, { top: insets.top + spacing.sm }]} accessibilityLabel="Schließen">
          <Ionicons name="close" size={22} color={colors.text} />
        </Pressable>
      </View>
    );
  }

  const pages: React.ReactNode[] = [];
  pages.push(
    <>
      <Label>Dein {review.year === new Date().getFullYear() ? 'Jahr bisher' : `Jahr ${review.year}`}</Label>
      <Big>{hours(review.minutes)}</Big>
      <Line>
        echte Gesprächszeit in {nf.format(review.talks)} {review.talks === 1 ? 'Gespräch' : 'Gesprächen'} mit {nf.format(review.people)}{' '}
        {review.people === 1 ? 'Mensch' : 'Menschen'}.
      </Line>
    </>
  );

  if (!review.full) {
    pages.push(
      <>
        <View style={styles.teaser}>
          {['Deine Top 3', 'Dein längstes Gespräch', 'Euer schönster Moment'].map((t) => (
            <View key={t} style={styles.teaserRow}>
              <AppText variant="bodyStrong">{t}</AppText>
              <BlurView intensity={25} tint="dark" style={styles.teaserBlur} />
              <Ionicons name="lock-closed" size={16} color={colors.textSecondary} />
            </View>
          ))}
        </View>
        <Line>Die ganze Geschichte deines Jahres gibt es mit Wanna yap+.</Line>
        <Button title="Mehr zu Plus" icon="sparkles" onPress={onPlus} style={{ alignSelf: 'stretch', marginTop: spacing.lg }} />
      </>
    );
  } else {
    if (review.topPeople?.length) {
      pages.push(
        <>
          <Label>Deine Menschen</Label>
          <View style={{ gap: spacing.lg, alignSelf: 'stretch', marginTop: spacing.lg }}>
            {review.topPeople.map((p, i) => {
              const who = person(p.phone, p.name);
              return (
                <View key={p.phone} style={styles.personRow}>
                  <AppText variant="h1" color={colors.textMuted} style={{ width: 28 }}>
                    {i + 1}
                  </AppText>
                  <Avatar name={who.name} uri={who.avatarUrl} size={i === 0 ? 64 : 52} />
                  <View style={{ flex: 1 }}>
                    <AppText variant="title">{who.name}</AppText>
                    <AppText variant="caption" color={colors.textSecondary}>
                      {hours(p.minutes)} · {p.talks} {p.talks === 1 ? 'Gespräch' : 'Gespräche'}
                    </AppText>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      );
    }
    if (review.longest) {
      const who = person(review.longest.with?.phone, review.longest.with?.name);
      pages.push(
        <>
          <Label>Dein längstes Gespräch</Label>
          <Big color={colors.pink}>{hours(review.longest.minutes)}</Big>
          <Line>mit {who.name}, am {new Date(review.longest.at).toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })}.</Line>
          {review.busiestMonth ? (
            <Line>
              Am meisten geredet hast du im {MONTHS[review.busiestMonth.month - 1]}: {hours(review.busiestMonth.minutes)}.
            </Line>
          ) : null}
        </>
      );
    }
    pages.push(
      <>
        <Label>Eure Rituale</Label>
        <View style={styles.grid}>
          {[
            ['flame', review.bestWeekStreak ?? 0, 'Wochen in Folge'],
            ['mic', review.rounds ?? 0, 'Runden im Kreis'],
            ['flash', review.dailyJoins ?? 0, 'Yap Moments'],
            ['lock-open', review.unlockDays ?? 0, 'Tage freigeschaltet'],
            ['sparkles', review.moments ?? 0, 'Moments geteilt'],
            ['ribbon', review.badges ?? 0, 'Abzeichen'],
          ].map(([icon, n, text]) => (
            <View key={String(text)} style={styles.tile}>
              <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={20} color={colors.violet} />
              <AppText variant="h2">{nf.format(Number(n))}</AppText>
              <AppText variant="caption" color={colors.textSecondary} center>
                {text}
              </AppText>
            </View>
          ))}
        </View>
      </>
    );
    if (review.bestMoment) {
      const who = person(review.bestMoment.with?.phone, review.bestMoment.with?.name);
      pages.push(
        <>
          <Label>Euer schönster Moment</Label>
          <Image source={{ uri: review.bestMoment.screenshot }} style={styles.moment} contentFit="cover" />
          <Line>
            mit {who.name}
            {review.bestMoment.note ? `: „${review.bestMoment.note}“` : ''}
          </Line>
        </>
      );
    }
    if (review.firstTalk) {
      const who = person(review.firstTalk.with?.phone, review.firstTalk.with?.name);
      pages.push(
        <>
          <Label>Wie alles anfing</Label>
          <Line>Dein erstes Gespräch des Jahres führtest du am {new Date(review.firstTalk.at).toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })} mit</Line>
          <Avatar name={who.name} uri={who.avatarUrl} size={96} />
          <AppText variant="h2">{who.name}</AppText>
        </>
      );
    }
  }
  pages.push(
    <>
      <AppText variant="display" center>
        Danke fürs Reden 💜
      </AppText>
      <Line>Jede Minute davon war Zeit für jemanden, der dir wichtig ist.</Line>
      <Button title="Teilen" icon="share-outline" onPress={onShare} style={{ alignSelf: 'stretch', marginTop: spacing.xl }} />
    </>
  );

  return (
    <View style={styles.root}>
      <FlatList
        data={pages}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        initialScrollIndex={startAt}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item, index }) => (
          <Page index={index} height={height}>
            {item}
          </Page>
        )}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width))}
      />
      <View style={[styles.dots, { top: insets.top + spacing.md }]} pointerEvents="none">
        {pages.map((_, i) => (
          <View key={i} style={[styles.dot, i === page && styles.dotOn]} />
        ))}
      </View>
      <Pressable onPress={onClose} style={[styles.close, { top: insets.top + spacing.xl }]} accessibilityLabel="Schließen" accessibilityRole="button">
        <Ionicons name="close" size={22} color={colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center', gap: spacing.lg, padding: spacing.xl },
  page: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, paddingHorizontal: spacing.xl },
  big: { fontSize: 52, lineHeight: 58 },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'center', marginTop: spacing.lg },
  tile: { width: 100, alignItems: 'center', gap: 4, padding: spacing.md, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)' },
  moment: { width: 220, height: 320, borderRadius: 24 },
  teaser: { alignSelf: 'stretch', gap: spacing.md },
  teaserRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  teaserBlur: { position: 'absolute', right: 40, width: 90, height: 20, borderRadius: 10 },
  dots: { position: 'absolute', left: spacing.xl, right: spacing.xl, flexDirection: 'row', gap: 4 },
  dot: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)' },
  dotOn: { backgroundColor: colors.text },
  close: { position: 'absolute', right: spacing.lg, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(11,11,18,0.5)' },
});
