import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { CircleInvite, CircleSummary } from '../../services/circlesApi';
import { AppText, Button, colors, GlassCard, radius, SectionHeader, spacing } from '../../ui';
import { CircleCard } from './CircleCard';

type Props = {
  circles: CircleSummary[] | null;
  invites: CircleInvite[];
  myPhone: string | null;
  onOpen: (id: string) => void;
  onNew: (suggestion?: { name: string; emoji: string }) => void;
  onAnswerInvite: (circleId: string, accept: boolean) => void;
  onSeeAll: () => void;
};

/** "Deine Kreise" on the status screen: invites, the circles, or how to start one. */
export function CirclesStrip({ circles, invites, myPhone, onOpen, onNew, onAnswerInvite, onSeeAll }: Props) {
  if (!circles) return null;
  return (
    <View>
      <SectionHeader
        title="Deine Kreise"
        right={
          circles.length ? (
            <Pressable onPress={onSeeAll} hitSlop={8} accessibilityRole="button">
              <AppText variant="caption" color={colors.cyan}>
                Alle
              </AppText>
            </Pressable>
          ) : null
        }
      />

      {invites.map((inv) => (
        <GlassCard key={inv.circleId} glow={colors.violet} style={styles.invite}>
          <AppText variant="bodyStrong">
            {inv.invitedByName.split(' ')[0] || 'Jemand'} lädt dich in {inv.emoji} {inv.name} ein
          </AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            {inv.memberCount === 1 ? '1 Mitglied' : `${inv.memberCount} Mitglieder`}. Im Kreis seht ihr, wann ihr Zeit füreinander habt.
          </AppText>
          <View style={styles.inviteActions}>
            <Button title="Nein danke" variant="ghost" onPress={() => onAnswerInvite(inv.circleId, false)} style={{ flex: 1 }} />
            <Button title="Beitreten" onPress={() => onAnswerInvite(inv.circleId, true)} style={{ flex: 1 }} />
          </View>
        </GlassCard>
      ))}

      {circles.length === 0 ? (
        <GlassCard>
          <AppText variant="bodyStrong">Starte deinen ersten Kreis</AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            Ein Kreis ist ein gemeinsamer Ort für deine Familie oder deine engsten Freunde: Ihr seht, wann ihr Zeit habt, startet Runden und
            habt ein gemeinsames Album.
          </AppText>
          <View style={styles.suggestions}>
            <Button title="🏡 Familie" variant="secondary" onPress={() => onNew({ name: 'Familie', emoji: '🏡' })} style={{ flex: 1 }} />
            <Button title="💛 Freunde" variant="secondary" onPress={() => onNew({ name: 'Enge Freunde', emoji: '💛' })} style={{ flex: 1 }} />
          </View>
        </GlassCard>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.row}>
          {circles.map((c) => (
            <CircleCard key={c.id} circle={c} myPhone={myPhone} onPress={() => onOpen(c.id)} />
          ))}
          <Pressable onPress={() => onNew()} accessibilityRole="button" accessibilityLabel="Neuer Kreis" style={styles.add}>
            <Ionicons name="add" size={28} color={colors.cyan} />
            <AppText variant="caption" color={colors.textSecondary}>
              Neuer Kreis
            </AppText>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  invite: { marginBottom: spacing.md },
  inviteActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  suggestions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  scroll: { marginHorizontal: -spacing.xl, overflow: 'visible' },
  row: { gap: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.xs },
  add: {
    width: 110,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
});
