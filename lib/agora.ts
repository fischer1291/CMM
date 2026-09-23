/**
 * Agora re-export. The web build resolves agora.web.ts instead,
 * because react-native-agora is native-only and cannot be bundled for web.
 */
export {
  ChannelProfileType,
  ClientRoleType,
  createAgoraRtcEngine,
  RtcSurfaceView,
} from 'react-native-agora';
export type { IRtcEngine } from 'react-native-agora';
