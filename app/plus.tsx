import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Linking } from 'react-native';
import { useAppConfig } from '../contexts/AppConfigContext';
import { usePlan } from '../contexts/PlanContext';
import { PlusView } from '../features/plus/PlusView';
import { reportError } from '../services/diagnostics';
import { countsAsView, offeringEmpty, parseFrom } from '../services/paywall';
import { reportFunnel, sendInterest } from '../services/planApi';
import { buy, configurePurchases, loadOffers, Offer, purchaseErrorCode, purchasesAvailable, restore } from '../services/purchases';
import { TERMS_URL } from '../content/legal';
import { WEB_URL } from '../content/links';

const BILLING_URL = 'https://apps.apple.com/account/billing';
const PLAN_TIMEOUT_MS = 10000;

export default function PlusScreen() {
  const router = useRouter();
  // Which push or screen led here (/plus?from=…, plan 2.3; sources in services/paywall.ts)
  const params = useLocalSearchParams<{ from?: string }>();
  const from = parseFrom(params.from);
  const { plan, refresh } = usePlan();
  const { flag } = useAppConfig();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(purchasesAvailable());
  const viewed = useRef(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [interest, setInterest] = useState<Set<string>>(new Set());
  const [interestSent, setInterestSent] = useState(false);

  useEffect(() => {
    if (plan?.interest) setInterestSent(true);
  }, [plan?.interest]);

  // One paywall_view per opening (plan 2.6a funnel, counted per source), once
  // the plan is known: a Plus member looking at their plan is no view
  useEffect(() => {
    if (viewed.current || !plan) return;
    viewed.current = true;
    if (countsAsView(from, plan.plan === 'plus')) reportFunnel('paywall_view', from);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per opening
  }, [plan]);

  // No plan after a while (offline, server away): a calm note with a retry instead of an endless spinner
  const [planStalled, setPlanStalled] = useState(false);
  const [planTry, setPlanTry] = useState(0);
  useEffect(() => {
    if (plan) {
      setPlanStalled(false);
      return;
    }
    const timer = setTimeout(() => setPlanStalled(true), PLAN_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [plan, planTry]);

  useEffect(() => {
    if (!purchasesAvailable() || !plan?.userId) return;
    let cancelled = false;
    (async () => {
      // Connected first, so an empty answer means the store, not a race with PlanContext
      const ready = await configurePurchases(plan.userId);
      let list: Offer[] | null = null;
      let code = 'empty';
      try {
        list = ready ? await loadOffers() : [];
      } catch (error) {
        code = purchaseErrorCode(error);
      }
      if (cancelled) return;
      setLoadingOffers(false);
      if (offeringEmpty(ready, list?.length ?? null)) {
        reportFunnel('offering_empty', from);
        reportError(new Error(`Purchase offerings failed: ${code}`));
      }
      if (!list?.length) return;
      setOffers(list);
      setSelected(list.find((o) => o.period === 'year')?.id ?? list[0]?.id ?? null);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- from is fixed per opening
  }, [plan?.userId]);

  const purchase = async () => {
    const offer = offers.find((o) => o.id === selected);
    if (!offer) return;
    setBusy(true);
    reportFunnel('purchase_start', from);
    try {
      const result = await buy(offer);
      if (result === 'success') {
        reportFunnel('purchase_success', from);
        Alert.alert('Willkommen bei Plus ✨', 'Danke, dass du Wanna yap? unterstützt.');
        // buy() synced with the backend; ask again shortly in case only the webhook gets through
        refresh();
        setTimeout(refresh, 2500);
      } else if (result === 'cancelled') {
        reportFunnel('purchase_cancel', from);
      } else if (result === 'pending') {
        Alert.alert('Wartet auf Bestätigung', 'Dein Kauf muss noch bestätigt werden, zum Beispiel von deiner Familie. Sobald das passiert ist, ist Plus da.');
      } else {
        // Bought, but RevenueCat gave no entitlement: a setup problem on our side
        reportFunnel('purchase_error', from);
        reportError(new Error('Purchase failed: no_entitlement'));
        Alert.alert('Gleich da', 'Dein Kauf ist angekommen, Plus wird noch freigeschaltet. Falls es in ein paar Minuten nicht da ist, tipp auf "Käufe wiederherstellen".');
        setTimeout(refresh, 2500);
      }
    } catch (error) {
      reportFunnel('purchase_error', from);
      reportError(new Error(`Purchase failed: ${purchaseErrorCode(error)}`));
      Alert.alert('Kauf nicht abgeschlossen', 'Bitte versuche es gleich noch einmal.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <PlusView
      plan={plan}
      offers={offers}
      loadingOffers={loadingOffers}
      storeConfigured={purchasesAvailable()}
      planStalled={planStalled}
      onRetryPlan={() => {
        setPlanStalled(false);
        setPlanTry((n) => n + 1);
        refresh();
      }}
      interestMode={flag('plus_interest')}
      selected={selected}
      onSelect={setSelected}
      busy={busy}
      onBuy={purchase}
      onRestore={async () => {
        setBusy(true);
        try {
          const ok = await restore();
          // Nothing found is no failure and no restore: not counted
          if (ok) reportFunnel('restore_success', from);
          Alert.alert(ok ? 'Wiederhergestellt' : 'Nichts gefunden', ok ? 'Dein Plus ist wieder aktiv.' : 'Zu deinem Apple-Konto gibt es kein aktives Plus.');
          if (ok) {
            refresh();
            setTimeout(refresh, 2500);
          }
        } catch (error) {
          reportFunnel('restore_error', from);
          reportError(new Error(`Restore failed: ${purchaseErrorCode(error)}`));
          Alert.alert('Hat nicht geklappt', 'Bitte versuche es erneut.');
        } finally {
          setBusy(false);
        }
      }}
      onManage={() => Linking.openURL('https://apps.apple.com/account/subscriptions')}
      onInvite={() => router.push('/(tabs)/contacts')}
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
      from={from}
      onFixBilling={() => Linking.openURL(BILLING_URL)}
      onAnswerSurvey={() => router.push('/support?topic=cancel')}
      onBack={() => router.back()}
      onOpenLegal={(which) => Linking.openURL(which === 'terms' ? TERMS_URL : `${WEB_URL}/datenschutz`)}
    />
  );
}
