/**
 * Ask for an App Store rating at a good moment: right after a real
 * conversation (2+ minutes), once someone has had a few of them, and at most
 * every 120 days (iOS limits it to 3 times a year anyway and may not show it).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

const KEY = 'reviewPrompt';
const MIN_SECONDS = 120;
const MIN_TALKS = 3;
const PAUSE_DAYS = 120;
// Let the call screen close first
const DELAY_MS = 1500;

type State = { talks: number; askedAt: number | null };

async function load(): Promise<State> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { talks: 0, askedAt: null, ...JSON.parse(raw) } : { talks: 0, askedAt: null };
  } catch {
    return { talks: 0, askedAt: null };
  }
}

/** A call ended after `seconds` together: count it, maybe ask for a rating. */
export async function noteTalk(seconds: number, now = Date.now()): Promise<boolean> {
  if (seconds < MIN_SECONDS) return false;
  const state = await load();
  state.talks += 1;
  const due = state.talks >= MIN_TALKS && (!state.askedAt || now - state.askedAt > PAUSE_DAYS * 24 * 3600 * 1000);
  if (due) state.askedAt = now;
  await AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
  if (!due || !(await StoreReview.hasAction().catch(() => false))) return false;
  setTimeout(() => StoreReview.requestReview().catch(() => {}), DELAY_MS);
  return true;
}
