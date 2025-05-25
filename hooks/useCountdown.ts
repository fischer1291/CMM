import { useEffect, useState } from 'react';

export function useCountdown(targetTime: string | null) {
  const [remaining, setRemaining] = useState<number>(0);

  useEffect(() => {
    if (!targetTime) return;

    const update = () => {
      const now = new Date().getTime();
      const target = new Date(targetTime).getTime();
      const diff = Math.max(0, Math.floor((target - now) / 1000)); // in Sekunden
      setRemaining(diff);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetTime]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const formatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return { remaining, formatted };
}