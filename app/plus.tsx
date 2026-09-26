import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Linking } from 'react-native';
import { usePlan } from '../contexts/PlanContext';
import { PlusView } from '../features/plus/PlusView';
import { sendInterest } from '../services/planApi';
import { buy, loadOffers, Offer, purchasesAvailable, restore } from '../services/purchases';
import { WEB_URL } from '../content/links';

// Apple's standard license agreement until our own terms are online
const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

export default function PlusScreen() {
  const router = useRouter();
  const { plan, refresh } = usePlan();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [interest, setInterest] = useState<Set<string>>(new Set());
  const [interestSent, setInterestSent] = useState(false);

  useEffect(() => {
    if (plan?.interest) setInterestSent(true);
  }, [plan?.interest]);

  useEffect(() => {
    if (!purchasesAvailable() || !plan?.userId) return;
    loadOffers()
      .then((list) => {
        setOffers(list);
        setSelected(list.find((o) => o.period === 'year')?.id ?? list[0]?.id ?? null);
      })
      .catch(() => {});
  }, [plan?.userId]);

  const purchase = async () => {
    const offer = offers.find((o) => o.id === selected);
    if (!offer) return;
    setBusy(true);
    try {
      if (await buy(offer)) {
        Alert.alert('Willkommen bei Plus ✨', 'Danke, dass du Wanna yap? unterstützt.');
        // The webhook needs a moment; ask again shortly
        setTimeout(refresh, 2500);
      }
    } catch {
      Alert.alert('Kauf nicht abgeschlossen', 'Bitte versuche es gleich noch einmal.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <PlusView
      plan={plan}
      offers={offers}
      selected={selected}
      onSelect={setSelected}
      busy={busy}
      onBuy={purchase}
      onRestore={async () => {
        setBusy(true);
        try {
          const ok = await restore();
          Alert.alert(ok ? 'Wiederhergestellt' : 'Nichts gefunden', ok ? 'Dein Plus ist wieder aktiv.' : 'Zu deinem Apple-Konto gibt es kein aktives Plus.');
          if (ok) setTimeout(refresh, 2500);
        } catch {
          Alert.alert('Hat nicht geklappt', 'Bitte versuche es erneut.');
        } finally {
          setBusy(false);
        }
      }}
      onManage={() => Linking.openURL('https://apps.apple.com/account/subscriptions')}
      interest={interest}
      onToggleInterest={(id) =>
        setInterest((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        })
      }
      onSendInterest={async () => {
        setBusy(true);
        try {
          await sendInterest([...interest]);
          setInterestSent(true);
          refresh();
        } catch {
          Alert.alert('Nicht gesendet', 'Bitte versuche es erneut.');
        } finally {
          setBusy(false);
        }
      }}
      interestSent={interestSent}
      onBack={() => router.back()}
      onOpenLegal={(which) => Linking.openURL(which === 'terms' ? TERMS_URL : `${WEB_URL}/datenschutz`)}
    />
  );
}
