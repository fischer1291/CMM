import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { usePlan } from '../contexts/PlanContext';
import { APP_ICONS, currentIcon, iconsSupported, setIcon } from '../services/appIcon';
import { AppText, Button, colors, PageHeader, radius, Screen, spacing } from '../ui';

/** Choose the app icon (Wanna yap+). */
export default function AppIconScreen() {
  const router = useRouter();
  const { plan } = usePlan();
  const allowed = !!plan?.limits.appIcons;
  const supported = iconsSupported();
  const [current, setCurrent] = useState<string | null>(currentIcon());

  const choose = async (id: string | null) => {
    if (!allowed) return router.push('/plus');
    try {
      await setIcon(id);
      setCurrent(id);
    } catch {
      Alert.alert('Nicht geändert', 'Das App-Icon konnte nicht geändert werden.');
    }
  };

  return (
    <Screen scroll>
      <PageHeader title="App-Icon" onBack={() => router.back()} />
      <AppText variant="body" color={colors.textSecondary}>
        {allowed ? 'Such dir aus, wie Wanna yap? auf deinem Homescreen aussieht.' : 'Eigene App-Icons gibt es mit Wanna yap+.'}
      </AppText>
      {!supported ? (
        <AppText variant="caption" color={colors.textMuted} style={{ marginTop: spacing.md }}>
          Diese App-Version kann das Icon noch nicht wechseln. Das kommt mit dem nächsten Update.
        </AppText>
      ) : null}
      <View style={styles.grid}>
        {APP_ICONS.map((icon) => {
          const on = current === icon.id;
          return (
            <Pressable
              key={icon.name}
              onPress={() => choose(icon.id)}
              disabled={!supported}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`App-Icon ${icon.name}`}
              style={styles.cell}
            >
              <View style={[styles.frame, on && styles.frameOn]}>
                <Image source={icon.preview} style={styles.icon} contentFit="cover" />
                {!allowed && icon.id ? (
                  <View style={styles.lock}>
                    <Ionicons name="lock-closed" size={14} color={colors.text} />
                  </View>
                ) : null}
              </View>
              <AppText variant="caption" color={on ? colors.text : colors.textSecondary}>
                {icon.name}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      {!allowed ? <Button title="Mehr zu Plus" icon="sparkles" onPress={() => router.push('/plus')} style={{ marginTop: spacing.xl }} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, marginTop: spacing.xl },
  cell: { width: 90, alignItems: 'center', gap: spacing.sm },
  frame: { padding: 3, borderRadius: 24, borderWidth: 2, borderColor: 'transparent' },
  frameOn: { borderColor: colors.cyan },
  icon: { width: 76, height: 76, borderRadius: radius.lg },
  lock: { position: 'absolute', right: -2, bottom: -2, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.violet },
});
