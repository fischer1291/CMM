import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import type { SupportCategory, SupportTicket } from '../../services/supportApi';
import { AppText, Button, colors, GlassCard, PageHeader, radius, Screen, SectionHeader, spacing } from '../../ui';

export const CATEGORIES: { value: SupportCategory; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'bug', label: 'Etwas klappt nicht', icon: 'bug-outline' },
  { value: 'idea', label: 'Idee', icon: 'bulb-outline' },
  { value: 'account', label: 'Mein Konto', icon: 'person-outline' },
  { value: 'other', label: 'Sonstiges', icon: 'chatbubble-ellipses-outline' },
];
const STATUS = {
  open: { label: 'Wartet auf Antwort', icon: 'time-outline', color: colors.textSecondary },
  answered: { label: 'Beantwortet', icon: 'chatbubble-outline', color: colors.violet },
  closed: { label: 'Erledigt', icon: 'checkmark-circle', color: colors.success },
} as const;

function StatusPill({ ticket }: { ticket: SupportTicket }) {
  const s = ticket.unread ? { label: 'Neue Antwort', icon: 'sparkles', color: colors.violet } : STATUS[ticket.status];
  return (
    <View style={[styles.pill, { borderColor: `${s.color}66`, backgroundColor: `${s.color}1A` }]}>
      <Ionicons name={s.icon as keyof typeof Ionicons.glyphMap} size={12} color={s.color} />
      <AppText variant="caption" color={s.color}>
        {s.label}
      </AppText>
    </View>
  );
}
const when = (at: string) => new Date(at).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function Field({ value, onChange, placeholder }: { value: string; onChange: (t: string) => void; placeholder: string }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      multiline
      maxLength={2000}
      style={styles.input}
      textAlignVertical="top"
    />
  );
}

type Props = {
  tickets: SupportTicket[] | null;
  sending: boolean;
  onBack: () => void;
  onSend: (category: SupportCategory, message: string) => Promise<boolean>;
  onOpen: (ticket: SupportTicket) => void;
  version: string;
};

/** Write to us, and see the answers. */
export function SupportView({ tickets, sending, onBack, onSend, onOpen, version }: Props) {
  const [category, setCategory] = useState<SupportCategory>('bug');
  const [message, setMessage] = useState('');

  return (
    <Screen scroll>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'position' : undefined}>
        <PageHeader title="Hilfe & Feedback" onBack={onBack} />
        <AppText variant="body" color={colors.textSecondary}>
          Etwas klappt nicht, oder du hast eine Idee? Schreib uns. Wir antworten hier, und du bekommst eine Benachrichtigung.
        </AppText>

        <View style={styles.chips}>
          {CATEGORIES.map((c) => {
            const on = c.value === category;
            return (
              <Pressable key={c.value} onPress={() => setCategory(c.value)} accessibilityRole="radio" accessibilityState={{ selected: on }} style={[styles.chip, on && styles.chipOn]}>
                <Ionicons name={c.icon} size={16} color={on ? colors.bg : colors.textSecondary} />
                <AppText variant="caption" color={on ? colors.bg : colors.textSecondary}>
                  {c.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
        <Field
          value={message}
          onChange={setMessage}
          placeholder={category === 'bug' ? 'Was ist passiert? Was hast du gerade gemacht?' : 'Erzähl uns davon …'}
        />
        <Button
          title="Senden"
          icon="send"
          loading={sending}
          disabled={message.trim().length < 3}
          onPress={async () => {
            if (await onSend(category, message.trim())) setMessage('');
          }}
          style={{ marginTop: spacing.md }}
        />
        <AppText variant="caption" color={colors.textMuted} center style={{ marginTop: spacing.sm }}>
          Mitgeschickt werden nur App-Version ({version}) und Gerätetyp.
        </AppText>

        <SectionHeader title="Deine Anfragen" />
        {!tickets ? (
          <ActivityIndicator color={colors.cyan} />
        ) : tickets.length === 0 ? (
          <GlassCard>
            <AppText variant="caption" color={colors.textSecondary}>
              Noch keine Anfragen.
            </AppText>
          </GlassCard>
        ) : (
          <View style={{ gap: spacing.md }}>
            {tickets.map((t) => {
              const last = t.messages[t.messages.length - 1];
              return (
                <Pressable key={t.id} onPress={() => onOpen(t)} accessibilityRole="button">
                  <GlassCard glow={t.unread ? colors.violet : undefined} style={t.status === 'closed' && !t.unread ? styles.closed : undefined}>
                    <View style={styles.row}>
                      <View style={{ flex: 1, gap: 6 }}>
                        <AppText variant="bodyStrong" numberOfLines={1}>
                          {t.messages[0]?.text}
                        </AppText>
                        <View style={styles.row}>
                          <StatusPill ticket={t} />
                          <AppText variant="caption" color={colors.textMuted}>
                            {when(last?.at ?? t.updatedAt)}
                          </AppText>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                    </View>
                  </GlassCard>
                </Pressable>
              );
            })}
          </View>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}

/** One conversation with support. */
export function TicketView({ ticket, sending, onBack, onReply }: { ticket: SupportTicket; sending: boolean; onBack: () => void; onReply: (text: string) => Promise<boolean> }) {
  const [text, setText] = useState('');
  return (
    <Screen scroll>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'position' : undefined}>
        <PageHeader title={CATEGORIES.find((c) => c.value === ticket.category)?.label ?? 'Anfrage'} onBack={onBack} />
        <View style={{ marginBottom: spacing.lg, alignItems: 'flex-start' }}>
          <StatusPill ticket={{ ...ticket, unread: false }} />
        </View>
        <View style={{ gap: spacing.sm }}>
          {ticket.messages.map((m, i) => (
            <View key={i} style={[styles.bubble, m.from === 'support' ? styles.support : styles.mine]}>
              {m.from === 'support' ? (
                <AppText variant="label" color={colors.violet}>
                  Wanna yap? Support
                </AppText>
              ) : null}
              <AppText variant="body">{m.text}</AppText>
              <AppText variant="caption" color={colors.textMuted}>
                {when(m.at)}
              </AppText>
            </View>
          ))}
        </View>
        {ticket.status === 'closed' ? (
          <View style={styles.closedNote}>
            <Ionicons name="checkmark-circle" size={22} color={colors.success} />
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong">Anfrage erledigt</AppText>
              <AppText variant="caption" color={colors.textSecondary}>
                {ticket.closedAt ? `Abgeschlossen am ${when(ticket.closedAt)}. ` : ''}Ist doch noch etwas offen? Schreib einfach, dann öffnen wir sie wieder.
              </AppText>
            </View>
          </View>
        ) : null}
        <View style={{ marginTop: spacing.xl }}>
          <Field value={text} onChange={setText} placeholder={ticket.status === 'closed' ? 'Doch noch etwas? Schreib einfach.' : 'Antworten …'} />
          <Button
            title={ticket.status === 'closed' ? 'Wieder öffnen & senden' : 'Antworten'}
            icon="send"
            loading={sending}
            disabled={!text.trim()}
            onPress={async () => {
              if (await onReply(text.trim())) setText('');
            }}
            style={{ marginTop: spacing.md }}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xl, marginBottom: spacing.md },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  chipOn: { backgroundColor: colors.cyan, borderColor: colors.cyan },
  input: {
    minHeight: 130,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    color: colors.text,
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 16,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill, borderWidth: 1 },
  closed: { opacity: 0.6 },
  closedNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(61,245,167,0.35)',
    backgroundColor: 'rgba(61,245,167,0.08)',
  },
  bubble: { maxWidth: '85%', padding: spacing.md, borderRadius: radius.md, gap: 4 },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.surfaceStrong },
  support: { alignSelf: 'flex-start', backgroundColor: 'rgba(139,92,255,0.16)', borderWidth: 1, borderColor: 'rgba(139,92,255,0.35)' },
});
