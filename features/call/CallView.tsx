import { BlurView } from "expo-blur";
import React from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText, Avatar, colors, IconButton, radius, spacing } from "../../ui";

export type CallPhase = "connecting" | "ringing" | "connected" | "ended";
export type NetworkQuality = "excellent" | "good" | "poor" | "bad" | "unknown";

type Props = {
  name: string;
  avatarUrl: string | null;
  phase: CallPhase;
  /** Shown under the name while there is no video, e.g. the end reason */
  statusText?: string | null;
  /** true once the other side's video is on screen */
  hasRemoteVideo: boolean;
  duration: string;
  quality: NetworkQuality;
  /** Remote video + local preview; rendered full screen under the controls */
  videoLayer?: React.ReactNode;
  micMuted: boolean;
  onToggleMute: () => void;
  onSwitchCamera: () => void;
  onCapture: () => void;
  onHangup: () => void;
};

const QUALITY_COLOR: Record<NetworkQuality, string> = {
  excellent: colors.success,
  good: colors.success,
  poor: colors.warning,
  bad: colors.danger,
  unknown: colors.textMuted,
};

const DEFAULT_STATUS: Record<CallPhase, string> = {
  connecting: "Verbinde …",
  ringing: "Klingelt …",
  connected: "Verbinde …",
  ended: "Anruf beendet",
};

/** Full-screen video call with glass header and controls. */
export function CallView({
  name,
  avatarUrl,
  phase,
  statusText,
  hasRemoteVideo,
  duration,
  quality,
  videoLayer,
  micMuted,
  onToggleMute,
  onSwitchCamera,
  onCapture,
  onHangup,
}: Props) {
  const insets = useSafeAreaInsets();
  const showBackdrop = phase !== "connected" || !hasRemoteVideo;
  const connected = phase === "connected";
  // While there is no video the name is shown large in the middle instead
  const showTopBar = connected && hasRemoteVideo;

  return (
    <View style={styles.root}>
      {videoLayer ? (
        <View style={StyleSheet.absoluteFill}>{videoLayer}</View>
      ) : null}

      {showBackdrop && (
        <View style={styles.backdrop} pointerEvents="none">
          <Avatar
            name={name}
            uri={avatarUrl}
            size={148}
            available={phase === "ringing" || connected ? true : undefined}
          />
          <AppText variant="h1" center style={{ marginTop: spacing.xl }}>
            {name}
          </AppText>
          <AppText variant="body" color={colors.textSecondary} center>
            {statusText ?? DEFAULT_STATUS[phase]}
          </AppText>
        </View>
      )}

      {showTopBar && (
        <View style={[styles.topBar, { top: insets.top + spacing.sm }]}>
          <BlurView
            intensity={40}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
          <View
            style={[
              styles.qualityDot,
              { backgroundColor: QUALITY_COLOR[quality] },
            ]}
          />
          <AppText
            variant="bodyStrong"
            numberOfLines={1}
            style={{ flexShrink: 1 }}
          >
            {name}
          </AppText>
          <AppText variant="bodyStrong" color={colors.textSecondary}>
            {duration}
          </AppText>
        </View>
      )}

      {phase !== "ended" && (
        <View
          style={[
            styles.controls,
            { paddingBottom: insets.bottom + spacing.lg },
          ]}
        >
          <BlurView
            intensity={40}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
          <IconButton
            icon={micMuted ? "mic-off" : "mic"}
            active={micMuted}
            accessibilityLabel={micMuted ? "Mikrofon an" : "Stummschalten"}
            onPress={onToggleMute}
          />
          <IconButton
            icon="camera-reverse"
            accessibilityLabel="Kamera wechseln"
            onPress={onSwitchCamera}
          />
          {showTopBar && (
            <IconButton
              icon="sparkles"
              accessibilityLabel="Moment festhalten"
              onPress={onCapture}
            />
          )}
          <IconButton
            icon="call"
            color={colors.danger}
            rotate={135}
            accessibilityLabel="Auflegen"
            onPress={onHangup}
          />
        </View>
      )}
    </View>
  );
}

/** Size and position of the local camera preview (kept inside the video layer). */
export const localPreviewStyle = (topInset: number) => ({
  position: "absolute" as const,
  top: topInset + 72,
  right: spacing.lg,
  width: 108,
  aspectRatio: 3 / 4,
  borderRadius: radius.md,
  overflow: "hidden" as const,
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: colors.borderStrong,
  backgroundColor: colors.bgElevated,
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  topBar: {
    position: "absolute",
    left: spacing.lg,
    right: 140,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    height: 48,
    borderRadius: radius.pill,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  qualityDot: { width: 8, height: 8, borderRadius: 4 },
  controls: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    paddingTop: spacing.lg,
    overflow: "hidden",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
