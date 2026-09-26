import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import type { Limits, Plan } from '../../services/planApi';
import { PLUS_FEATURES } from '../../services/planApi';
import type { Offer } from '../../services/purchases';
import { AppText, Button, colors, GlassCard, glow, PageHeader, radius, Screen, SectionHeader, spacing } from '../../ui';
import { LogoMark } from '../../ui/components/LogoMark';

type Props = {
  plan: Plan | null;
  /** Store offers; empty while purchases aren't live yet */
  offers: Offer[];
  selected: string | null;
  onSelect: (id: string) => void;
  busy: boolean;
  onBuy: () => void;
  onRestore: () => void;
  onManage: () => void;
  /** "Interesse zeigen" mode (no store yet) */
  interest: Set<string>;
  onToggleInterest: (id: string) => void;
  onSendInterest: () => void;
  interestSent: boolean;
  onBack: () => void;
  onOpenLegal: (which: 'terms' | 'privacy') => void;
};

const unlimited = (v: number | null, unit: string) => (v == null ? 'unbegrenzt' : `${v} ${unit}`);

function Compare({ free, plus }: { free: Limits; plus: Limits }) {
  const rows: [string, string, string][] = [
    ['Eigene Kreise', String(free.circles), String(plus.circles)],
    ['Personen pro Kreis', String(free.circleMembers), String(plus.circleMembers)],
    ['Personen pro Runde', String(free.roomParticipants), String(plus.roomParticipants)],
    ['Rundenlänge', unlimited(free.roomMinutes, 'Min.'), unlimited(plus.roomMinutes, 'Min.')],
    ['Erinnerungen', free.memoriesDays ? `${free.memoriesDays} Tage` : 'alle', plus.memoriesDays ? `${plus.memoriesDays} Tage` : 'alle'],
    ['Video', free.hdVideo ? 'HD' : 'Standard', plus.hdVideo ? 'HD' : 'Standard'],
    ['Anrufe, Moments, Yap Moment', 'unbegrenzt', 'unbegrenzt'],
  ];
  return (
    <GlassCard padded={false}>
      <View style={[styles.cmpRow, styles.cmpHead]}>
        <AppText variant="label" color={colors.textMuted} style={{ flex: 1.4 }}>
          {' '}
        </AppText>
        <AppText variant="label" color={colors.textMuted} style={styles.cmpCell}>
          Gratis
        </AppText>
        <AppText variant="label" color={colors.violet} style={styles.cmpCell}>
          Plus
        </AppText>
      </View>
      {rows.map(([label, a, b]) => (
        <View key={label} style={styles.cmpRow}>
          <AppText variant="caption" style={{ flex: 1.4 }}>
            {label}
          </AppText>
          <AppText variant="caption" color={colors.textSecondary} style={styles.cmpCell}>
            {a}
          </AppText>
          <AppText variant="bodyStrong" style={[styles.cmpCell, { fontSize: 13 }]}>
            {b}
          </AppText>
        </View>
      ))}
    </GlassCard>
  );
}

/** Wanna yap+: what it adds, and either the store or "Interesse zeigen". */
export function PlusView(props: Props) {
  const { plan, offers, selected, onSelect, busy, onBuy, onRestore, onManage, interest, onToggleInterest, onSendInterest, interestSent, onBack, onOpenLegal } = props;
  const isPlus = plan?.plan === 'plus';
  const storeLive = offers.length > 0;
  const yearly = offers.find((o) => o.period === 'year');
  const monthly = offers.find((o) => o.period === 'month');

  return (
    <Screen scroll>
      <PageHeader title="" onBack={onBack} />
      <View style={[styles.hero, glow(colors.violet, 0.5)]}>
        <LinearGradient colors={['#2A1F4D', '#13131E', '#3D1030']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <LogoMark size={64} />
        <AppText variant="display" center style={{ marginTop: spacing.md }}>
          Wanna yap<AppText variant="display" color={colors.pink}>+</AppText>
        </AppText>
        <AppText variant="body" color={colors.textSecondary} center style={{ maxWidth: 300 }}>
          Mehr Raum für deine Leute. Werbefrei und ohne Tracking, heute und in Zukunft.
        </AppText>
        {isPlus ? (
          <View style={styles.active}>
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            <AppText variant="bodyStrong">
              Du hast Plus{plan?.plus?.until ? ` bis ${new Date(plan.plus.until).toLocaleDateString('de-DE')}` : ''} ✨
            </AppText>
          </View>
        ) : null}
      </View>

      <SectionHeader title="Das bekommst du" />
      <View style={{ gap: spacing.sm }}>
        {PLUS_FEATURES.map((f) => {
          const picked = interest.has(f.id);
          const selectable = !storeLive && !isPlus && !interestSent;
          return (
            <Pressable
              key={f.id}
              disabled={!selectable}
              onPress={() => onToggleInterest(f.id)}
              accessibilityRole={selectable ? 'checkbox' : undefined}
              accessibilityState={selectable ? { checked: picked } : undefined}
              style={[styles.feature, picked && styles.featureOn]}
            >
              <View style={styles.featureIcon}>
                <Ionicons name={f.icon as keyof typeof Ionicons.glyphMap} size={20} color={colors.violet} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyStrong">{f.title}</AppText>
                <AppText variant="caption" color={colors.textSecondary}>
                  {f.text}
                </AppText>
              </View>
              {selectable ? <Ionicons name={picked ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={picked ? colors.cyan : colors.textMuted} /> : null}
            </Pressable>
          );
        })}
      </View>

      {plan ? (
        <>
          <SectionHeader title="Gratis und Plus" />
          <Compare free={plan.all.free} plus={plan.all.plus} />
        </>
      ) : null}

      <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
        {isPlus ? (
          plan?.plus?.source === 'store' ? <Button title="Abo verwalten" variant="secondary" onPress={onManage} /> : null
        ) : storeLive ? (
          <>
            {[yearly, monthly].filter(Boolean).map((o) => {
              const offer = o as Offer;
              const on = selected === offer.id;
              return (
                <Pressable key={offer.id} onPress={() => onSelect(offer.id)} accessibilityRole="radio" accessibilityState={{ selected: on }} style={[styles.offer, on && styles.offerOn]}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyStrong">{offer.period === 'year' ? 'Jährlich' : 'Monatlich'}</AppText>
                    {offer.period === 'year' ? (
                      <AppText variant="caption" color={colors.cyan}>
                        Am beliebtesten
                      </AppText>
                    ) : null}
                  </View>
                  <AppText variant="title">
                    {offer.price}
                    <AppText variant="caption" color={colors.textSecondary}>
                      {offer.period === 'year' ? ' / Jahr' : ' / Monat'}
                    </AppText>
                  </AppText>
                </Pressable>
              );
            })}
            <Button title="Plus starten" icon="sparkles" onPress={onBuy} loading={busy} disabled={!selected} />
            <Pressable onPress={onRestore} accessibilityRole="button" style={{ alignSelf: 'center', padding: spacing.sm }}>
              <AppText variant="caption" color={colors.textSecondary}>
                Käufe wiederherstellen
              </AppText>
            </Pressable>
            <AppText variant="caption" color={colors.textMuted} center>
              Das Abo verlängert sich automatisch, bis du es kündigst. Kündigen kannst du jederzeit in den Einstellungen deines Apple-Kontos, spätestens 24 Stunden vor Ablauf.
            </AppText>
            <View style={styles.legal}>
              <Pressable onPress={() => onOpenLegal('terms')}>
                <AppText variant="caption" color={colors.textSecondary}>
                  Nutzungsbedingungen
                </AppText>
              </Pressable>
              <Pressable onPress={() => onOpenLegal('privacy')}>
                <AppText variant="caption" color={colors.textSecondary}>
                  Datenschutz
                </AppText>
              </Pressable>
            </View>
          </>
        ) : interestSent ? (
          <GlassCard glow={colors.cyan}>
            <AppText variant="bodyStrong">Danke dir! 💜</AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              Wir sagen dir Bescheid, sobald Wanna yap+ startet.
            </AppText>
          </GlassCard>
        ) : (
          <>
            <AppText variant="caption" color={colors.textSecondary} center>
              Wanna yap+ kommt bald. Tipp an, was dich am meisten interessiert, dann bauen wir das zuerst.
            </AppText>
            <Button title="Interesse zeigen" icon="heart" onPress={onSendInterest} loading={busy} />
          </>
        )}
        {!plan ? <ActivityIndicator color={colors.cyan} /> : null}
      </View>
      <AppText variant="caption" color={colors.textMuted} center style={{ marginTop: spacing.xl }}>
        Anrufen, erreichbar sein, Kreise, Moments und der Yap Moment bleiben immer kostenlos.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.sm, padding: spacing.xl, borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(139,92,255,0.4)' },
  active: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill, backgroundColor: 'rgba(61,245,167,0.12)' },
  feature: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  featureOn: { borderColor: colors.cyan, backgroundColor: 'rgba(0,229,255,0.08)' },
  featureIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(139,92,255,0.15)' },
  cmpRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  cmpHead: { borderTopWidth: 0 },
  cmpCell: { flex: 1, textAlign: 'right' },
  offer: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  offerOn: { borderColor: colors.violet, backgroundColor: 'rgba(139,92,255,0.12)' },
  legal: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xl },
});
