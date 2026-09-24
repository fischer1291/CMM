import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';
import { ActionSheetIOS, Alert, Platform } from 'react-native';
import { useContacts } from '../contexts/ContactsContext';
import { blockPerson, REPORT_REASONS, reportPerson, ReportReason } from '../services/socialApi';

type Target = { phone: string; name: string; momentId?: string };

/** Options sheet: the index of the chosen option, or null. */
function choose(title: string, options: string[], destructive?: number): Promise<number | null> {
  return new Promise((resolve) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { title, options: [...options, 'Abbrechen'], cancelButtonIndex: options.length, destructiveButtonIndex: destructive },
        (i) => resolve(i === options.length ? null : i)
      );
    } else {
      Alert.alert(title, undefined, [
        ...options.map((text, i) => ({ text, onPress: () => resolve(i) })),
        { text: 'Abbrechen', style: 'cancel' as const, onPress: () => resolve(null) },
      ]);
    }
  });
}

const confirm = (title: string, message: string, action: string) =>
  new Promise<boolean>((resolve) =>
    Alert.alert(title, message, [
      { text: 'Abbrechen', style: 'cancel', onPress: () => resolve(false) },
      { text: action, style: 'destructive', onPress: () => resolve(true) },
    ])
  );

/**
 * "Melden" and "Blockieren" for a person (optionally about one moment).
 * `onBlocked` runs after blocking, e.g. to leave their screen.
 */
export function useSafetyMenu() {
  const { hide } = useContacts();

  const block = useCallback(
    async ({ phone, name }: Target, onBlocked?: () => void) => {
      const first = name.split(' ')[0];
      const ok = await confirm(
        `${first} blockieren?`,
        `Ihr seht euch dann nicht mehr in der App: keine Anrufe, kein Status, keine Moments. ${first} erfährt davon nichts. Du kannst das im Profil rückgängig machen.`,
        'Blockieren'
      );
      if (!ok) return;
      try {
        await blockPerson(phone);
        hide(phone);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        onBlocked?.();
      } catch {
        Alert.alert('Nicht blockiert', 'Das hat leider nicht geklappt. Bitte versuche es erneut.');
      }
    },
    [hide]
  );

  const report = useCallback(
    async (target: Target, onBlocked?: () => void) => {
      const first = target.name.split(' ')[0];
      const reasonIndex = await choose(
        target.momentId ? 'Was stimmt mit diesem Moment nicht?' : `Was ist mit ${first}?`,
        REPORT_REASONS.map((r) => r.label)
      );
      if (reasonIndex === null) return;
      const reason: ReportReason = REPORT_REASONS[reasonIndex].value;
      const alsoBlock = await new Promise<boolean>((resolve) =>
        Alert.alert(`${first} auch blockieren?`, 'Dann seht ihr euch in der App nicht mehr.', [
          { text: 'Nur melden', onPress: () => resolve(false) },
          { text: 'Melden und blockieren', style: 'destructive', onPress: () => resolve(true) },
        ])
      );
      try {
        await reportPerson({ phone: target.phone, reason, momentId: target.momentId, block: alsoBlock });
        if (alsoBlock) {
          hide(target.phone);
          onBlocked?.();
        }
        Alert.alert('Danke für deine Meldung', 'Wir sehen uns das an. Niemand erfährt, dass die Meldung von dir kommt.');
      } catch {
        Alert.alert('Nicht gemeldet', 'Das hat leider nicht geklappt. Bitte versuche es erneut.');
      }
    },
    [hide]
  );

  /** The "…" menu */
  const open = useCallback(
    async (target: Target, onBlocked?: () => void) => {
      const first = target.name.split(' ')[0];
      const choice = await choose(first, [target.momentId ? 'Moment melden' : `${first} melden`, `${first} blockieren`], 1);
      if (choice === 0) await report(target, onBlocked);
      if (choice === 1) await block(target, onBlocked);
    },
    [block, report]
  );

  return { open, block, report };
}
