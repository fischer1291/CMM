/**
 * "Ist das dein Konto?" (plan 2.9): app/(auth)/verify.tsx opens this when
 * the backend answered POST /verify/check with an accountCheck instead of a
 * token. The answer goes to POST /verify/account-check with the checkToken
 * (ten minutes, once); "mine" signs in to the old account, "not_mine"
 * starts a fresh one and the old one disappears from the number.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert } from 'react-native';
import { PRIVACY_UPDATED, TERMS_VERSION } from '../../content/legal';
import { useAuth } from '../../contexts/AuthContext';
import { AccountCheckView } from '../../features/auth/AccountCheckView';
import { finishSignIn, formatActiveMonth, verifyOutcome, type AccountCheckParams } from '../../features/auth/signInFlow';
import { pendingInviteCode } from '../../services/invites';
import { apiPostJson } from '../../utils/api';

type Answer = 'mine' | 'not_mine';

export default function AccountCheckScreen() {
  const { signIn } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<AccountCheckParams>();
  const [busy, setBusy] = useState<Answer | null>(null);

  const backToNumber = () => (router.canGoBack() ? router.back() : router.replace('/verify'));

  const answer = async (choice: Answer) => {
    if (!params.phone || !params.checkToken || busy) return;
    setBusy(choice);
    try {
      // The same consent and invite code as the SMS step: after "not_mine"
      // they belong to the fresh account
      const ageConfirmed = params.ageConfirmed === '1';
      const consent = ageConfirmed ? { ageConfirmed: true, termsVersion: TERMS_VERSION, privacyVersion: PRIVACY_UPDATED } : {};
      const inviteCode = await pendingInviteCode();
      const res = await apiPostJson(
        '/verify/account-check',
        { phone: params.phone, checkToken: params.checkToken, answer: choice, ...consent, ...(inviteCode ? { inviteCode } : {}) },
        15000
      );
      const data = await res.json().catch(() => null);
      if (res.status === 401 || data?.error === 'check_expired') {
        Alert.alert('Bitte noch einmal', 'Die Bestätigung ist abgelaufen. Fordere einfach einen neuen Code an, dann geht es weiter.', [
          { text: 'OK', onPress: backToNumber },
        ]);
        return;
      }
      const outcome = verifyOutcome(data, params.phone, ageConfirmed);
      if (outcome.kind !== 'signed_in') {
        Alert.alert('Das hat nicht geklappt', (outcome.kind === 'error' && outcome.message) || 'Bitte versuch es noch einmal.');
        return;
      }
      await finishSignIn(params.phone, outcome, signIn, !!inviteCode);
    } catch {
      Alert.alert('Keine Verbindung', 'Bitte prüfe deine Internetverbindung und versuche es erneut.');
    } finally {
      setBusy(null);
    }
  };

  const confirmNotMine = () =>
    Alert.alert(
      'Neu anfangen?',
      'Die Nummer gehörte vorher jemand anderem. Wir legen dir ein neues, leeres Konto an; das alte verschwindet von dieser Nummer.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Neu anfangen', style: 'destructive', onPress: () => answer('not_mine') },
      ]
    );

  return (
    <AccountCheckView
      name={params.name || ''}
      avatarUrl={params.avatarUrl || null}
      lastActive={formatActiveMonth(params.lastActiveMonth)}
      busy={busy}
      onMine={() => answer('mine')}
      onNotMine={confirmNotMine}
    />
  );
}
