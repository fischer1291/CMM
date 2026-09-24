/**
 * Development-only remote control for the component gallery, so screenshots
 * can be taken in the simulator without touch input. A local HTTP server on
 * the Mac serves { open, section, scrollY } at CONTROL_URL. In the simulator
 * "localhost" is the Mac; on a real device the request simply fails.
 */
export const CONTROL_URL = 'http://localhost:8099/state.json';

export type PreviewState = { open?: boolean; section?: string; scrollY?: number };

export async function fetchPreviewState(timeoutMs = 700): Promise<PreviewState | null> {
  if (!__DEV__) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(CONTROL_URL, { signal: controller.signal });
    return (await res.json()) as PreviewState;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
