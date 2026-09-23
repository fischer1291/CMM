/**
 * Web stub for react-native-agora (native-only). Video calls are not
 * supported on web; this only exists so the web bundle can build.
 */
import type { IRtcEngine as NativeRtcEngine } from 'react-native-agora';

export type IRtcEngine = NativeRtcEngine;

export const ChannelProfileType = { ChannelProfileCommunication: 0 } as const;
export const ClientRoleType = { ClientRoleBroadcaster: 1 } as const;

export function createAgoraRtcEngine(): IRtcEngine {
  throw new Error('Videoanrufe werden im Web nicht unterstützt.');
}

export function RtcSurfaceView(_props: { canvas: { uid: number }; style?: unknown }) {
  return null;
}
