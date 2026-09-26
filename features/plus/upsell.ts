import { Alert } from 'react-native';

type Router = { push: (href: any) => void };

/**
 * A plan limit from the server, as a friendly note with the way to Plus.
 * Returns false if `error` isn't one (the caller shows its own message).
 */
export function explainLimit(error: any, router: Router): boolean {
  const code = error?.code;
  const more = { text: 'Mehr zu Plus', onPress: () => router.push('/plus') };
  if (code === 'plan_limit') {
    Alert.alert(
      'Du hast schon alle deine Kreise',
      `Gratis kannst du ${error?.value ?? 3} Kreise gründen. Beitreten geht immer. Mit Wanna yap+ gründest du bis zu ${error?.plus ?? 20}.`,
      [{ text: 'OK', style: 'cancel' }, more]
    );
    return true;
  }
  if (code === 'full') {
    Alert.alert('Der Kreis ist voll', 'Frag die Person, die den Kreis gegründet hat: Mit Wanna yap+ passen bis zu 50 Leute hinein.');
    return true;
  }
  if (code === 'room_full') {
    Alert.alert('Die Runde ist voll', 'Gerade sind so viele drin, wie in diesen Kreis passen. Versuch es gleich noch einmal.');
    return true;
  }
  return false;
}
