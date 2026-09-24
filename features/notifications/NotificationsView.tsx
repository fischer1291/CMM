import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import type { PermissionState } from '../../services/PushTokenService';
import type { NotificationPrefs, RecentPush } from '../../services/notificationPrefs';
import { AppText, Button, colors, GlassCard, PageHeader, Screen, SectionHeader, spacing, TimeStepper, Toggle } from '../../ui';

type Props = {
  permission: PermissionState | null;
  prefs: NotificationPrefs | null;
  onBack: () => void;
  onAllow: () => void;
  onOpenSettings: () => void;
  onChange: (prefs: Partial<NotificationPrefs>) => void;
  recent: RecentPush[];
  /** Display name for a phone number */
  nameOf: (phone: string | null) => string;
};

const TYPE_TEXT: Record<string, (name: string) => string> = {
  contact_available: (name) => `${name} ist erreichbar`,
  nudge: (name) => `${name} hat dich angestupst`,
  moment_shared: (name) => `${name} hat einen Moment geteilt`,
  missed_call: (name) => `Verpasster Anruf von ${name}`,
};

const RESULT_TEXT: Record<string, { text: string; color: string }> = {
  sent: { text: 'Gesendet', color: colors.success },
  in_app: { text: 'In der App angezeigt', color: colors.cyan },
  throttled: { text: 'Kurz davor schon gemeldet', color: colors.textMuted },
  quiet_hours: { text: 'Ruhezeit', color: colors.textMuted },
  opted_out: { text: 'Von dir ausgeschaltet', color: colors.textMuted },
  daily_cap: { text: 'Tageslimit erreicht', color: colors.warning },
  no_token: { text: 'Mitteilungen nicht erlaubt', color: colors.warning },
};

const timeOf = (iso: string) => {
  const d = new Date(iso);
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return d.toDateString() === new Date().toDateString() ? time : `${d.getDate()}.${d.getMonth() + 1}. ${time}`;
};

function PermissionCard({ permission, onAllow, onOpenSettings }: Pick<Props, 'permission' | 'onAllow' | 'onOpenSettings'>) {
  if (permission === 'granted') {
    return (
      <GlassCard>
        <View style={styles.row}>
          <Ionicons name="notifications" size={22} color={colors.cyan} />
          <AppText variant="bodyStrong" style={{ flex: 1 }}>
            Mitteilungen sind an
          </AppText>
          <Ionicons name="checkmark-circle" size={22} color={colors.success} />
        </View>
      </GlassCard>
    );
  }
  const denied = permission === 'denied';
  return (
    <GlassCard glow={colors.pink}>
      <AppText variant="bodyStrong">{denied ? 'Mitteilungen sind ausgeschaltet' : 'Mitteilungen erlauben?'}</AppText>
      <AppText variant="caption" color={colors.textSecondary} style={{ marginTop: spacing.xs }}>
        {denied
          ? 'Du verpasst Anrufe und erfährst nicht, wann deine Leute Zeit haben. Du kannst das in den Einstellungen ändern.'
          : 'Damit du Anrufe nicht verpasst und erfährst, wann deine Leute Zeit haben. Du bestimmst unten, was dich erreicht.'}
      </AppText>
      <Button
        title={denied ? 'Einstellungen öffnen' : 'Erlauben'}
        icon={denied ? 'settings-outline' : 'notifications-outline'}
        onPress={denied ? onOpenSettings : onAllow}
        style={{ marginTop: spacing.lg }}
      />
    </GlassCard>
  );
}

/** What reaches the user, and when not. */
export function NotificationsView({ permission, prefs, onBack, onAllow, onOpenSettings, onChange, recent, nameOf }: Props) {
  return (
    <Screen scroll>
      <PageHeader title="Mitteilungen" onBack={onBack} />
      <PermissionCard permission={permission} onAllow={onAllow} onOpenSettings={onOpenSettings} />

      {!prefs ? (
        <ActivityIndicator color={colors.cyan} style={{ marginTop: spacing.xxl }} />
      ) : (
        <>
          <SectionHeader title="Was dich erreicht" />
          <GlassCard>
            <View style={styles.toggles}>
              <Toggle
                label="Wer gerade erreichbar ist"
                description="Höchstens alle 3 Stunden pro Person"
                value={prefs.available}
                onChange={(available) => onChange({ available })}
              />
              <Toggle
                label="Anstupser"
                description="Wenn jemand gern mit dir sprechen würde"
                value={prefs.nudges}
                onChange={(nudges) => onChange({ nudges })}
              />
              <Toggle
                label="Moments"
                description="Wenn jemand einen Moment aus eurem Gespräch teilt"
                value={prefs.moments}
                onChange={(moments) => onChange({ moments })}
              />
            </View>
          </GlassCard>
          <AppText variant="caption" color={colors.textMuted} style={styles.note}>
            Anrufe und verpasste Anrufe bekommst du immer.
          </AppText>

          <SectionHeader title="Ruhezeit" />
          <GlassCard>
            <Toggle
              label="Nachts Ruhe"
              description="Keine Mitteilungen in dieser Zeit. Verpasste Anrufe kommen lautlos."
              value={prefs.quietHours.enabled}
              onChange={(enabled) => onChange({ quietHours: { ...prefs.quietHours, enabled } })}
            />
            {prefs.quietHours.enabled && (
              <View style={styles.times}>
                <TimeStepper
                  label="Ab"
                  value={prefs.quietHours.start}
                  wrap
                  onChange={(start) => onChange({ quietHours: { ...prefs.quietHours, start } })}
                />
                <TimeStepper
                  label="Bis"
                  value={prefs.quietHours.end}
                  wrap
                  onChange={(end) => onChange({ quietHours: { ...prefs.quietHours, end } })}
                />
              </View>
            )}
          </GlassCard>

          {recent.length > 0 && (
            <>
              <SectionHeader title="Zuletzt" />
              <GlassCard padded={false}>
                {recent.map((item, i) => {
                  const result = RESULT_TEXT[item.result] ?? { text: item.result, color: colors.textMuted };
                  const text = TYPE_TEXT[item.type]?.(nameOf(item.about)) ?? item.type;
                  return (
                    <View key={`${item.at}-${i}`} style={[styles.recentRow, i > 0 && styles.divider]}>
                      <View style={{ flex: 1 }}>
                        <AppText variant="body" numberOfLines={1}>
                          {text}
                        </AppText>
                        <AppText variant="caption" color={result.color}>
                          {result.text}
                        </AppText>
                      </View>
                      <AppText variant="caption" color={colors.textMuted}>
                        {timeOf(item.at)}
                      </AppText>
                    </View>
                  );
                })}
              </GlassCard>
            </>
          )}

          <AppText variant="caption" color={colors.textMuted} center style={styles.footer}>
            Versprochen: höchstens 10 Mitteilungen am Tag, keine Werbung.
          </AppText>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  toggles: { gap: spacing.xl },
  note: { marginTop: spacing.sm, paddingHorizontal: spacing.xs },
  times: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  footer: { marginTop: spacing.xxl, paddingHorizontal: spacing.lg },
});
