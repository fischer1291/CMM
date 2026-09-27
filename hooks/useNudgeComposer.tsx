import React, { useState } from 'react';
import { NudgeSheet } from '../components/NudgeSheet';
import { usePlan } from '../contexts/PlanContext';

/**
 * Nudging with Wanna yap+ opens a sheet for an own line; without it, the
 * nudge goes out right away (one tap, as always).
 */
export function useNudgeComposer(send: (phone: string, name: string, message?: string | null) => Promise<boolean>) {
  const { plan } = usePlan();
  const [target, setTarget] = useState<{ phone: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const start = (phone: string, name: string) => {
    if (plan?.limits.nudgeMessage) setTarget({ phone, name });
    else send(phone, name);
  };

  const sheet = target ? (
    <NudgeSheet
      name={target.name}
      busy={busy}
      onClose={() => setTarget(null)}
      onSend={async (message) => {
        setBusy(true);
        await send(target.phone, target.name, message);
        setBusy(false);
        setTarget(null);
      }}
    />
  ) : null;

  return { start, sheet };
}
