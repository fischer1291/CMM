import { Alert } from 'react-native';
import { paywallHref, type PaywallSource } from '../../services/paywall';

type Router = { push: (href: any) => void };

/** The "Mehr zu Plus" button of a limit note; the paywall counts where it came from (plan 2.6a). */
const morePlus = (router: Router, from: PaywallSource) => ({ text: 'Mehr zu Plus', onPress: () => router.push(paywallHref(from)) });

/**
 * What Plus would allow, from the server's limit error (lib/plan.js
 * limitError): a number, "unlimited", or null when Plus allows no more than
 * the current plan (the person has Plus already, or the limits are equal).
 * Without the field (undefined: an older server) the app's default stands.
 */
export function plusAllows(error: any, fallback: number): number | 'unlimited' | null {
  const plus = error?.plus;
  if (plus === undefined) return fallback;
  if (plus === 'unlimited') return 'unlimited';
  return typeof plus === 'number' ? plus : null;
}

const OK = { text: 'OK', style: 'cancel' as const };

/**
 * A plan limit from the server, as a friendly note with the way to Plus.
 * Returns false if `error` isn't one (the caller shows its own message).
 * Expects the server's answer with `code` set to its `error` (planApi ok()).
 * `inCall`: during a 1:1 call nothing navigates (the call screen freezes in
 * the background); the note names the way to Plus instead.
 */
export function explainLimit(error: any, router: Router, inCall = false): boolean {
  const code = error?.code;
  if (code === 'plan_limit' && error?.limit === 'rituals') {
    const value = error?.value ?? 1;
    const plus = plusAllows(error, 3);
    if (plus === null) {
      Alert.alert('Alle Rituale vergeben', `Dieser Kreis hat schon ${value} ${value === 1 ? 'Ritual' : 'Rituale'}, mehr gehen nicht.`);
      return true;
    }
    Alert.alert(
      'Ein Ritual pro Kreis',
      `Gratis hat jeder Kreis ${value} Ritual. Mit Wanna yap+ der Person, die den Kreis gegründet hat, ${plus === 'unlimited' ? 'gibt es keine Grenze' : `sind es bis zu ${plus}`}.`,
      [OK, morePlus(router, 'limit_rituals')]
    );
    return true;
  }
  if (code === 'plan_limit' && error?.limit === 'momentsPerDay') {
    const value = error?.value ?? 30;
    const plus = plusAllows(error, 100);
    if (plus === null) {
      Alert.alert('Genug Moments für heute', `Heute hast du schon ${value} Moments geteilt. Morgen geht es weiter.`);
      return true;
    }
    Alert.alert(
      'Genug Moments für heute',
      `Gratis kannst du ${value} Moments am Tag teilen. Morgen geht es weiter, mit Wanna yap+ ${plus === 'unlimited' ? 'gibt es kein Tageslimit' : `sind es bis zu ${plus}`}.` +
        (inCall ? ' Mehr dazu findest du nach dem Anruf in deinem Profil unter Wanna yap+.' : ''),
      inCall ? [OK] : [OK, morePlus(router, 'limit_moments')]
    );
    return true;
  }
  if (code === 'plan_limit') {
    const value = error?.value ?? 3;
    const plus = plusAllows(error, 20);
    if (plus === null) {
      Alert.alert('Du hast schon alle deine Kreise', `Du hast ${value} Kreise gegründet, mehr gehen nicht. Beitreten geht immer.`);
      return true;
    }
    Alert.alert(
      'Du hast schon alle deine Kreise',
      `Gratis kannst du ${value} Kreise gründen. Beitreten geht immer. Mit Wanna yap+ ${plus === 'unlimited' ? 'gründest du so viele, wie du magst' : `gründest du bis zu ${plus}`}.`,
      [OK, morePlus(router, 'limit_circles')]
    );
    return true;
  }
  if (code === 'full') {
    Alert.alert('Der Kreis ist voll', 'Frag die Person, die den Kreis gegründet hat: Mit Wanna yap+ passen bis zu 50 Leute hinein.', [
      OK,
      morePlus(router, 'limit_members'),
    ]);
    return true;
  }
  if (code === 'room_full') {
    Alert.alert('Die Runde ist voll', 'Gerade sind so viele drin, wie in diesen Kreis passen. Versuch es gleich noch einmal.');
    return true;
  }
  return false;
}
