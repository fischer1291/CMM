import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { Contact } from '../../contexts/ContactsContext';
import { useCountdown } from '../../hooks/useCountdown';
import { AppText, Avatar, Button, colors, GlassCard, spacing } from '../../ui';
import { firstTalkText, nextMomentLabel } from './firstTalk';

type Props = {
  contact: Contact;
  /** Today's Yap Moment while it is still ahead (GET /daily nextAt) */
  nextAt: string | null;
  /** The Yap Moment runs right now (its own card is above) */
  momentRunning: boolean;
  /** Already nudged and waiting for the pause to pass */
  nudged: boolean;
  onCall: () => void;
  onNudge: () => void;
  onMeetAtMoment: () => void;
};

/**
 * "Dein erstes Gespräch" (plan 2.13, rules in ./firstTalk.ts): someone is
 * here, nobody has talked yet. A nudge or the next Yap Moment, no pressure.
 */
export function FirstTalkCard({ contact, nextAt, momentRunning, nudged, onCall, onNudge, onMeetAtMoment }: Props) {
  // Ticks every second so the minutes in the label stay current
  useCountdown(nextAt);
  const first = contact.name.split(' ')[0] || contact.name;
  return (
    <GlassCard glow={colors.violet} style={{ marginTop: spacing.xl }}>
      <View style={styles.row}>
        <Avatar name={contact.name} uri={contact.avatarUrl} size={48} available={contact.isAvailable} />
        <View style={styles.texts}>
          <AppText variant="bodyStrong">Dein erstes Gespräch</AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            {firstTalkText(contact)}
          </AppText>
        </View>
      </View>
      <View style={styles.actions}>
        {contact.isAvailable ? (
          <Button title={`${first} anrufen`} icon="videocam" onPress={onCall} />
        ) : (
          <Button title={nudged ? 'Angestupst ✓' : 'Anstupsen'} icon="hand-left" onPress={onNudge} disabled={nudged} />
        )}
        {momentRunning ? (
          <AppText variant="caption" color={colors.textSecondary} center>
            Der Yap Moment läuft gerade. Oben siehst du, wer dabei ist.
          </AppText>
        ) : (
          <>
            <Button title="Beim Yap Moment treffen" icon="flash" variant="secondary" onPress={onMeetAtMoment} />
            <AppText variant="caption" color={colors.textMuted} center>
              {nextMomentLabel(nextAt)}
            </AppText>
          </>
        )}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  texts: { flex: 1, gap: 2 },
  actions: { gap: spacing.sm, marginTop: spacing.md },
});
