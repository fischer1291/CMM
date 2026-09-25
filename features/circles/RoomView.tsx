import { BlurView } from 'expo-blur';
import React from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Avatar, colors, IconButton, radius, spacing } from '../../ui';

export type RoomTile = {
  key: string;
  name: string;
  avatarUrl: string | null;
  /** The video, if the camera is on (RtcSurfaceView) */
  video: React.ReactNode | null;
  speaking: boolean;
  isMe: boolean;
};

type Props = {
  title: string;
  duration: string;
  tiles: RoomTile[];
  connecting: boolean;
  micMuted: boolean;
  cameraOn: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onSwitchCamera: () => void;
  onLeave: () => void;
};

/** A circle's group call: everyone as a tile, the one speaking highlighted. */
export function RoomView({ title, duration, tiles, connecting, micMuted, cameraOn, onToggleMute, onToggleCamera, onSwitchCamera, onLeave }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const columns = tiles.length <= 2 ? 1 : tiles.length <= 6 ? 2 : 3;
  const rows = Math.ceil(tiles.length / columns);
  const gap = spacing.sm;
  const areaHeight = height - insets.top - insets.bottom - 64 - 110;
  const tileWidth = (width - spacing.md * 2 - gap * (columns - 1)) / columns;
  const tileHeight = Math.max(160, Math.min((areaHeight - gap * (rows - 1)) / rows, tileWidth * 1.6));

  return (
    <View style={styles.root}>
      <View style={[styles.top, { paddingTop: insets.top + spacing.sm }]}>
        <AppText variant="title" numberOfLines={1} style={{ flex: 1 }}>
          {title}
        </AppText>
        <AppText variant="bodyStrong" color={colors.textSecondary}>
          {connecting ? 'Verbinde …' : `${tiles.length} · ${duration}`}
        </AppText>
      </View>

      <ScrollView contentContainerStyle={[styles.grid, { gap, padding: spacing.md }]}>
        {tiles.map((t) => (
          <View
            key={t.key}
            style={[styles.tile, { width: tileWidth, height: tileHeight }, t.speaking && styles.speaking]}
            accessibilityLabel={`${t.name}${t.speaking ? ', spricht' : ''}`}
          >
            {t.video ?? (
              <View style={styles.noVideo}>
                <Avatar name={t.name} uri={t.avatarUrl} size={Math.min(96, tileWidth * 0.45)} />
              </View>
            )}
            <View style={styles.label}>
              <AppText variant="caption" numberOfLines={1}>
                {t.isMe ? 'Du' : t.name.split(' ')[0]}
              </AppText>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.controls, { paddingBottom: insets.bottom + spacing.lg }]}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        <IconButton icon={micMuted ? 'mic-off' : 'mic'} active={micMuted} accessibilityLabel={micMuted ? 'Mikrofon an' : 'Stummschalten'} onPress={onToggleMute} />
        <IconButton icon={cameraOn ? 'videocam' : 'videocam-off'} active={!cameraOn} accessibilityLabel={cameraOn ? 'Kamera aus' : 'Kamera an'} onPress={onToggleCamera} />
        {cameraOn && <IconButton icon="camera-reverse" accessibilityLabel="Kamera wechseln" onPress={onSwitchCamera} />}
        <IconButton icon="exit-outline" color={colors.danger} accessibilityLabel="Runde verlassen" onPress={onLeave} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  tile: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.bgElevated,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  speaking: { borderColor: colors.cyan },
  noVideo: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  label: {
    position: 'absolute',
    left: spacing.sm,
    bottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(11,11,18,0.62)',
    maxWidth: '85%',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingTop: spacing.lg,
    overflow: 'hidden',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
});
