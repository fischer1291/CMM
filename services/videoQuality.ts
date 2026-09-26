/**
 * Video quality by plan: Wanna yap+ sends HD (720p), everyone else a sharp
 * standard picture (360p) that works on weak connections too.
 */
type Engine = { setVideoEncoderConfiguration: (config: any) => unknown };

export function applyVideoQuality(engine: Engine | null | undefined, hd: boolean) {
  if (!engine) return;
  try {
    engine.setVideoEncoderConfiguration(
      hd
        ? { dimensions: { width: 1280, height: 720 }, frameRate: 24, bitrate: 0 }
        : { dimensions: { width: 640, height: 360 }, frameRate: 15, bitrate: 0 }
    );
  } catch {
    // The SDK default is fine too
  }
}
