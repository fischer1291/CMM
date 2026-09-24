/** "gerade eben", "vor 5 Min.", "vor 3 Std.", "gestern", "am 12.09." */
export function formatLastSeen(iso: string | null | undefined, now = new Date()): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  const seconds = Math.max(0, (now.getTime() - date.getTime()) / 1000);
  if (Number.isNaN(seconds)) return null;
  if (seconds < 60) return 'gerade eben';
  if (seconds < 3600) return `vor ${Math.floor(seconds / 60)} Min.`;

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  if (date >= startOfToday) return `vor ${Math.floor(seconds / 3600)} Std.`;

  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  if (date >= startOfYesterday) return 'gestern';

  return `am ${date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}`;
}
