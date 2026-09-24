export const REACTIONS = ['❤️', '😂', '😮', '😢', '😍', '👏'] as const;

export type Reaction = { emoji: string; count: number; userReacted: boolean };

export type Moment = {
  id: string;
  userPhone: string;
  userName: string;
  targetPhone: string;
  targetName: string;
  screenshot: string;
  note?: string;
  mood: string;
  callDuration: string;
  timestamp: string;
  reactions: Reaction[];
  totalReactions: number;
};

/** Optimistic local toggle of the user's reaction, mirroring the backend. */
export function toggleReaction(moment: Moment, emoji: string): Moment {
  const existing = moment.reactions.find((r) => r.emoji === emoji);
  const reactions = existing
    ? moment.reactions.map((r) =>
        r.emoji === emoji
          ? { ...r, count: r.userReacted ? r.count - 1 : r.count + 1, userReacted: !r.userReacted }
          : r
      )
    : [...moment.reactions, { emoji, count: 1, userReacted: true }];
  const visible = reactions.filter((r) => r.count > 0);
  return { ...moment, reactions: visible, totalReactions: visible.reduce((sum, r) => sum + r.count, 0) };
}

/** "3 Min.", "5 Std.", "2 Tg." since the moment was shared */
export function momentAge(iso: string, now = new Date()): string {
  const minutes = Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 60000));
  if (minutes < 60) return `${minutes} Min.`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} Std.`;
  return `${Math.floor(hours / 24)} Tg.`;
}
