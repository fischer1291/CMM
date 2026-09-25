import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CircleDetail, Ritual } from '../../services/circlesApi';
import { BadgeGrid } from '../album/AlbumView';
import { clock, WEEK_ORDER, WEEKDAYS_LONG, WEEKDAYS_SHORT } from '../../services/gamificationApi';
import {
  AppText,
  Avatar,
  Button,
  colors,
  GlassCard,
  glow,
  gradients,
  IconButton,
  PageHeader,
  radius,
  Screen,
  SectionHeader,
  spacing,
  TimeStepper,
  WarmthRing,
} from '../../ui';

export type Person = { name: string; avatarUrl: string | null };

type Props = {
  circle: CircleDetail | null;
  myPhone: string | null;
  person: (phone: string, fallbackName: string) => Person;
  busy: boolean;
  onBack: () => void;
  onMore: () => void;
  onRoom: () => void;
  onCall: (phone: string) => void;
  onInvite: () => void;
  onShareLink: () => void;
  onSendDrafts: () => void;
  onSaveRitual: (ritual: Ritual) => void;
};

const ritualLabel = (r: Ritual) => (r.enabled ? `${WEEKDAYS_LONG[r.day]}s ${clock(r.start)}` : 'Kein fester Termin');

function RitualSheet({ ritual, onSave, onClose }: { ritual: Ritual; onSave: (r: Ritual) => void; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<Ritual>({ ...ritual, enabled: true });
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Schließen" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
        <AppText variant="h2">Euer Ritual</AppText>
        <AppText variant="caption" color={colors.textSecondary}>
          Ein fester Termin jede Woche. Dann öffnet sich eure Runde, und alle bekommen Bescheid.
        </AppText>
        <View style={styles.days}>
          {WEEK_ORDER.map((d) => (
            <Pressable
              key={d}
              onPress={() => setDraft((r) => ({ ...r, day: d }))}
              accessibilityRole="radio"
              accessibilityState={{ selected: draft.day === d }}
              accessibilityLabel={WEEKDAYS_LONG[d]}
              style={[styles.day, draft.day === d && styles.dayOn]}
            >
              <AppText variant="bodyStrong" color={draft.day === d ? colors.bg : colors.textSecondary}>
                {WEEKDAYS_SHORT[d]}
              </AppText>
            </Pressable>
          ))}
        </View>
        <TimeStepper label="Um" value={draft.start} wrap onChange={(start) => setDraft((r) => ({ ...r, start }))} />
        <Button title={`${WEEKDAYS_LONG[draft.day]}s ${clock(draft.start)} speichern`} onPress={() => onSave(draft)} />
        {ritual.enabled ? <Button title="Ritual beenden" variant="ghost" onPress={() => onSave({ ...ritual, enabled: false })} /> : null}
      </View>
    </Modal>
  );
}

/** One circle: warmth, room, members, invites, ritual, album. */
export function CircleView({ circle, myPhone, person, busy, onBack, onMore, onRoom, onCall, onInvite, onShareLink, onSendDrafts, onSaveRitual }: Props) {
  const [editingRitual, setEditingRitual] = useState(false);

  if (!circle) {
    return (
      <Screen>
        <PageHeader title="" onBack={onBack} />
        <ActivityIndicator color={colors.cyan} style={{ marginTop: spacing.xxl }} />
      </Screen>
    );
  }

  const others = circle.members.filter((m) => m.phone !== myPhone);
  const available = others.filter((m) => m.isAvailable);
  const inRoom = circle.room?.participants ?? [];
  const { warmth } = circle;
  const drafts = circle.invites.filter((i) => i.status === 'draft').length;
  const pending = circle.invites.filter((i) => i.status === 'pending');

  return (
    <Screen scroll>
      <PageHeader
        title=""
        onBack={onBack}
        right={<IconButton icon="ellipsis-horizontal" size={40} onPress={onMore} accessibilityLabel="Kreis-Optionen" />}
      />

      <View style={styles.hero}>
        <WarmthRing
          emoji={circle.emoji}
          value={warmth.memberCount > 1 ? warmth.talkedCount / warmth.memberCount : 0}
          size={112}
          full={warmth.goalReached}
        />
        <AppText variant="h1" center style={{ marginTop: spacing.lg }}>
          {circle.name}
        </AppText>
        <AppText variant="caption" color={colors.textSecondary} center>
          {circle.members.length === 1 ? 'Nur du bisher' : `${circle.members.length} Mitglieder`}
          {warmth.minutes ? ` · ${warmth.minutes} Min. diese Woche` : ''}
        </AppText>
      </View>

      {/* Room: the heart of a circle */}
      <View style={[styles.roomWrap, glow(inRoom.length ? colors.pink : colors.cyan, 0.4)]}>
        <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.roomBorder}>
          <View style={styles.roomCard}>
            {inRoom.length ? (
              <>
                <AppText variant="label" color={colors.pink}>
                  🎙️ Runde läuft
                </AppText>
                <View style={styles.avatarRow}>
                  {inRoom.slice(0, 6).map((phone) => {
                    const p = person(phone, circle.members.find((m) => m.phone === phone)?.name || '');
                    return <Avatar key={phone} name={p.name} uri={p.avatarUrl} size={40} available />;
                  })}
                </View>
                <Button title={inRoom.includes(myPhone ?? '') ? 'Zurück in die Runde' : 'Reinspringen'} icon="enter-outline" onPress={onRoom} loading={busy} />
              </>
            ) : (
              <>
                <AppText variant="label" color={colors.cyan}>
                  Offene Runde
                </AppText>
                <AppText variant="bodyStrong">
                  {available.length >= 2
                    ? `${available.length} haben gerade Zeit: perfekt für eine Runde`
                    : 'Starte eine Runde, alle im Kreis können reinspringen'}
                </AppText>
                <Button title="Runde starten" icon="mic" onPress={onRoom} loading={busy} disabled={circle.members.length < 2} />
              </>
            )}
          </View>
        </LinearGradient>
      </View>

      <SectionHeader title="Wochenziel" />
      <GlassCard glow={warmth.goalReached ? colors.pink : undefined}>
        <AppText variant="bodyStrong">
          {warmth.goalReached
            ? 'Geschafft! Alle haben diese Woche miteinander gesprochen ✨'
            : `${warmth.talkedCount} von ${warmth.memberCount} haben diese Woche mit jemandem aus dem Kreis gesprochen`}
        </AppText>
        <View style={styles.track}>
          <LinearGradient
            colors={gradients.brand}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.fill, { width: `${warmth.memberCount ? Math.round((warmth.talkedCount / warmth.memberCount) * 100) : 0}%` }]}
          />
        </View>
        <AppText variant="caption" color={colors.textMuted}>
          Gemeinsam, nicht gegeneinander: Jedes Gespräch im Kreis zählt für alle.
        </AppText>
      </GlassCard>

      <SectionHeader
        title="Mitglieder"
        right={
          <Pressable onPress={onInvite} hitSlop={8} style={styles.inline}>
            <Ionicons name="person-add-outline" size={14} color={colors.cyan} />
            <AppText variant="caption" color={colors.cyan}>
              Einladen
            </AppText>
          </Pressable>
        }
      />
      <GlassCard padded={false}>
        {circle.members.map((m, i) => {
          const me = m.phone === myPhone;
          const p = person(m.phone, m.name);
          return (
            <View key={m.phone} style={[styles.memberRow, i > 0 && styles.divider]}>
              <Avatar name={p.name} uri={p.avatarUrl} size={44} available={me ? undefined : m.isAvailable} />
              <View style={{ flex: 1 }}>
                <AppText variant="bodyStrong" numberOfLines={1}>
                  {me ? 'Du' : p.name}
                </AppText>
                <AppText variant="caption" color={m.isAvailable ? colors.cyan : colors.textSecondary}>
                  {inRoom.includes(m.phone) ? 'In der Runde' : m.isAvailable ? 'Hat gerade Zeit' : 'Gerade nicht erreichbar'}
                  {m.phone === circle.createdBy ? ' · gegründet' : ''}
                </AppText>
              </View>
              {!me && m.isAvailable ? (
                <IconButton icon="videocam" size={40} color={colors.violet} accessibilityLabel={`${p.name} anrufen`} onPress={() => onCall(m.phone)} />
              ) : null}
            </View>
          );
        })}
        {pending.length > 0 && (
          <View style={[styles.memberRow, styles.divider]}>
            <Ionicons name="hourglass-outline" size={20} color={colors.textMuted} />
            <AppText variant="caption" color={colors.textSecondary} style={{ flex: 1 }}>
              Eingeladen: {pending.map((i) => (i.pendingSignup ? 'jemand ohne App' : i.name || (i.phone ? person(i.phone, '').name : ''))).filter(Boolean).join(', ')}
            </AppText>
          </View>
        )}
      </GlassCard>
      {drafts > 0 && (
        <GlassCard glow={colors.violet} style={{ marginTop: spacing.md }}>
          <AppText variant="bodyStrong">
            {drafts === 1 ? '1 Person aus deiner alten Liste' : `${drafts} Personen aus deiner alten Liste`} noch nicht eingeladen
          </AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            Kreise sind jetzt gemeinsame Orte. Lade sie ein, dann seht ihr euch gegenseitig im Kreis.
          </AppText>
          <Button title="Einladungen senden" icon="send" onPress={onSendDrafts} style={{ marginTop: spacing.md }} />
        </GlassCard>
      )}
      <Button title="Einladungslink teilen" icon="link" variant="secondary" onPress={onShareLink} style={{ marginTop: spacing.md }} />

      <SectionHeader title="Ritual" />
      <Pressable onPress={() => setEditingRitual(true)} accessibilityRole="button">
        <GlassCard>
          <View style={styles.inline}>
            <Ionicons name="repeat" size={20} color={circle.ritual.enabled ? colors.pink : colors.textMuted} />
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong">{ritualLabel(circle.ritual)}</AppText>
              <AppText variant="caption" color={colors.textSecondary}>
                {circle.ritual.enabled ? 'Dann öffnet sich eure Runde, und alle bekommen Bescheid.' : 'Z. B. jeden Sonntag 18 Uhr eure Runde'}
              </AppText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </View>
        </GlassCard>
      </Pressable>

      {circle.badges && circle.badges.length > 0 ? (
        <>
          <SectionHeader title={`Kreis-Abzeichen · ${circle.badges.filter((b) => b.earned).length}/${circle.badges.length}`} />
          <GlassCard>
            <BadgeGrid badges={circle.badges} />
          </GlassCard>
        </>
      ) : null}

      {circle.moments.length > 0 && (
        <>
          <SectionHeader title="Euer Album" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            {circle.moments.map((m) => (
              <Image key={m.id} source={{ uri: m.screenshot }} style={styles.albumImage} contentFit="cover" />
            ))}
          </ScrollView>
        </>
      )}

      {editingRitual && (
        <RitualSheet
          ritual={circle.ritual}
          onClose={() => setEditingRitual(false)}
          onSave={(r) => {
            setEditingRitual(false);
            onSaveRitual(r);
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginBottom: spacing.xl },
  roomWrap: { borderRadius: radius.lg },
  roomBorder: { borderRadius: radius.lg, padding: 1.5 },
  roomCard: { borderRadius: radius.lg - 1.5, backgroundColor: colors.bgElevated, padding: spacing.lg, gap: spacing.md },
  avatarRow: { flexDirection: 'row', gap: spacing.sm },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceStrong, overflow: 'hidden', marginVertical: spacing.md },
  fill: { height: 8, borderRadius: 4 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  albumImage: { width: 96, height: 136, borderRadius: radius.md },
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  sheet: {
    gap: spacing.lg,
    padding: spacing.xl,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.bgElevated,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  days: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  dayOn: { backgroundColor: colors.pink },
});
