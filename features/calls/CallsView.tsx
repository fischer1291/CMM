import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, SectionList, StyleSheet, View } from 'react-native';
import type { CallEntry } from '../../services/callsApi';
import { AppText, Avatar, Button, colors, EmptyState, PageHeader, radius, Screen, Segmented, spacing } from '../../ui';

export type CallPerson = { name: string; avatarUrl: string | null };

type Props = {
  calls: CallEntry[] | null;
  error: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onBack: () => void;
  /** Name/avatar from the address book, else what the server knows */
  person: (entry: CallEntry) => CallPerson;
  onOpen: (entry: CallEntry) => void;
  onCallBack: (entry: CallEntry) => void;
};

const time = (iso: string) => new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

function dayTitle(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 3600 * 1000);
  if (d.toDateString() === today.toDateString()) return 'Heute';
  if (d.toDateString() === yesterday.toDateString()) return 'Gestern';
  return d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
}

const duration = (s: number) => (s >= 3600 ? `${Math.floor(s / 3600)} Std. ${Math.round((s % 3600) / 60)} Min.` : s >= 60 ? `${Math.round(s / 60)} Min.` : `${s} Sek.`);

/** What happened, from my side. */
function describe(entry: CallEntry): { text: string; icon: keyof typeof Ionicons.glyphMap; color: string } {
  const kind = entry.video ? 'Videoanruf' : 'Anruf';
  if (entry.missed) return { text: `Verpasster ${kind}`, icon: 'call', color: colors.danger };
  if (entry.direction === 'incoming') {
    if (entry.status === 'declined') return { text: `${kind} abgelehnt`, icon: 'arrow-down', color: colors.textSecondary };
    return { text: `Eingehend · ${duration(entry.durationSec)}`, icon: 'arrow-down', color: colors.cyan };
  }
  if (entry.status === 'ended' || entry.status === 'accepted') {
    return { text: `Ausgehend · ${duration(entry.durationSec)}`, icon: 'arrow-up', color: colors.violet };
  }
  if (entry.status === 'cancelled') return { text: 'Abgebrochen', icon: 'arrow-up', color: colors.textSecondary };
  if (entry.status === 'busy') return { text: 'Besetzt', icon: 'arrow-up', color: colors.textSecondary };
  return { text: 'Nicht erreicht', icon: 'arrow-up', color: colors.textSecondary };
}

function CallRow({ entry, person, onOpen, onCallBack }: { entry: CallEntry; person: CallPerson; onOpen: () => void; onCallBack: () => void }) {
  const info = describe(entry);
  return (
    <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`${person.name}, ${info.text}, ${time(entry.createdAt)}`} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
      <Avatar name={person.name} uri={person.avatarUrl} size={46} />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="bodyStrong" numberOfLines={1} color={entry.missed ? colors.danger : colors.text}>
          {person.name}
        </AppText>
        <View style={styles.meta}>
          <Ionicons name={info.icon} size={13} color={info.color} style={entry.missed ? null : { transform: [{ rotate: '45deg' }] }} />
          <AppText variant="caption" color={colors.textSecondary} numberOfLines={1}>
            {info.text}
          </AppText>
        </View>
      </View>
      <AppText variant="caption" color={colors.textMuted}>
        {time(entry.createdAt)}
      </AppText>
      <Pressable onPress={onCallBack} hitSlop={8} accessibilityRole="button" accessibilityLabel={`${person.name} zurückrufen`} style={styles.callBack}>
        <Ionicons name={entry.video ? 'videocam' : 'call'} size={18} color={colors.cyan} />
      </Pressable>
    </Pressable>
  );
}

/** All calls of the last 30 days, missed ones in red; call back with one tap. */
export function CallsView({ calls, error, refreshing, onRefresh, onBack, person, onOpen, onCallBack }: Props) {
  const [filter, setFilter] = useState<'all' | 'missed'>('all');
  const sections = useMemo(() => {
    const list = (calls ?? []).filter((c) => filter === 'all' || c.missed);
    const groups = new Map<string, CallEntry[]>();
    for (const c of list) {
      const title = dayTitle(c.createdAt);
      groups.set(title, [...(groups.get(title) ?? []), c]);
    }
    return [...groups.entries()].map(([title, data]) => ({ title, data }));
  }, [calls, filter]);

  return (
    <Screen>
      <PageHeader title="Anrufe" onBack={onBack} />
      <Segmented
        options={[
          { value: 'all', label: 'Alle' },
          { value: 'missed', label: 'Verpasst' },
        ]}
        value={filter}
        onChange={setFilter}
        style={{ marginBottom: spacing.md }}
      />
      {!calls ? (
        <View style={styles.center}>
          {error ? (
            <>
              <AppText variant="body" color={colors.textSecondary} center>
                Deine Anrufe konnten nicht geladen werden.
              </AppText>
              <Button title="Erneut versuchen" variant="secondary" onPress={onRefresh} />
            </>
          ) : (
            <ActivityIndicator color={colors.cyan} />
          )}
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(c) => c.callId}
          renderSectionHeader={({ section }) => (
            <AppText variant="label" color={colors.textMuted} style={styles.section}>
              {section.title}
            </AppText>
          )}
          renderItem={({ item }) => <CallRow entry={item} person={person(item)} onOpen={() => onOpen(item)} onCallBack={() => onCallBack(item)} />}
          ListEmptyComponent={
            <EmptyState
              icon={filter === 'missed' ? 'checkmark-circle-outline' : 'call-outline'}
              title={filter === 'missed' ? 'Keine verpassten Anrufe' : 'Noch keine Anrufe'}
              text={filter === 'missed' ? 'Du hast niemanden verpasst.' : 'Hier siehst du deine Anrufe der letzten 30 Tage.'}
            />
          }
          stickySectionHeadersEnabled={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cyan} />}
          contentContainerStyle={{ paddingBottom: spacing.xxl }}
        />
      )}
      <AppText variant="caption" color={colors.textMuted} center style={styles.footer}>
        Anrufe werden 30 Tage gespeichert.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.lg },
  section: { marginTop: spacing.lg, marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  callBack: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,229,255,0.12)',
  },
  footer: { paddingVertical: spacing.sm },
});
