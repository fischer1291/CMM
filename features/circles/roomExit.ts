/**
 * Closing the round screen only while it is in front. The 5-minute note
 * opens the paywall above a running round (plan 2.6a); if the round ends
 * meanwhile, router.back() would pop the paywall and leave a dead round
 * screen behind. Instead the close waits until the round is in front again.
 */
export type RoomExit = {
  /** The round screen came to the front: a close that waited happens now */
  focus: () => void;
  /** Something (the paywall, Apple's purchase sheet) is on top */
  blur: () => void;
  /** Close the round screen now, or as soon as it is in front again */
  close: () => void;
  isFocused: () => boolean;
};

export function roomExit(back: () => void): RoomExit {
  let focused = true;
  let pending = false;
  return {
    focus: () => {
      focused = true;
      if (pending) {
        pending = false;
        back();
      }
    },
    blur: () => {
      focused = false;
    },
    close: () => {
      if (focused) back();
      else pending = true;
    },
    isFocused: () => focused,
  };
}
