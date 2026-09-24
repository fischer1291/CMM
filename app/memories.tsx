import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useContacts } from '../contexts/ContactsContext';
import { Moment, toMoment } from '../features/moments/model';
import { AppText, colors, EmptyState, PageHeader, Screen, spacing } from '../ui';
import { apiFetch } from '../utils/api';

const dateOf = (iso: string) =>
  new Date(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });

/** All shared moments you're part of, also after their 24 hours in the feed. */
export default function MemoriesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { userPhone } = useAuth();
  const { find } = useContacts();
  const [memories, setMemories] = useState<Moment[] | null>(null);
  const [open, setOpen] = useState<Moment | null>(null);

  useEffect(() => {
    apiFetch('/moment/memories', {}, 15000)
      .then((res) => res.json())
      .then((data) => setMemories((data.memories ?? []).map(toMoment)))
      .catch(() => setMemories([]));
  }, []);

  const size = (width - spacing.xl * 2 - spacing.sm * 2) / 3;
  const withWhom = (m: Moment) => {
    const other = m.userPhone.replace(/^\+?/, '+') === userPhone ? m.targetPhone : m.userPhone;
    const phone = other.startsWith('+') ? other : `+${other}`;
    return find(phone)?.name || (other === m.targetPhone ? m.targetName : m.userName);
  };

  return (
    <Screen>
      <PageHeader title="Erinnerungen" onBack={() => router.back()} />
      {!memories ? (
        <ActivityIndicator color={colors.cyan} style={{ marginTop: spacing.xxl }} />
      ) : memories.length === 0 ? (
        <EmptyState icon="images-outline" title="Noch keine Erinnerungen" text="Geteilte Momente aus deinen Gesprächen landen hier, nur für euch beide." />
      ) : (
        <FlatList
          data={memories}
          keyExtractor={(m) => m.id}
          numColumns={3}
          columnWrapperStyle={{ gap: spacing.sm }}
          contentContainerStyle={{ gap: spacing.sm, paddingBottom: insets.bottom + spacing.xl }}
          renderItem={({ item }) => (
            <Pressable onPress={() => setOpen(item)} accessibilityRole="button" accessibilityLabel={`Moment mit ${withWhom(item)}`}>
              <Image source={{ uri: item.screenshot }} style={{ width: size, height: size * 1.4, borderRadius: 14 }} contentFit="cover" />
            </Pressable>
          )}
        />
      )}

      {open && (
        <Modal visible animationType="fade" presentationStyle="fullScreen" onRequestClose={() => setOpen(null)}>
          <View style={styles.viewer}>
            <Image source={{ uri: open.screenshot }} style={StyleSheet.absoluteFill} contentFit="cover" />
            <LinearGradient colors={['transparent', 'rgba(11,11,18,0.92)']} style={styles.shade} />
            <Pressable
              onPress={() => setOpen(null)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Schließen"
              style={[styles.close, { top: insets.top + spacing.sm }]}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
            <View style={[styles.info, { paddingBottom: insets.bottom + spacing.xl }]}>
              <AppText variant="caption" color={colors.textSecondary}>
                {dateOf(open.timestamp)} · mit {withWhom(open)} · {open.callDuration}
              </AppText>
              {open.note ? <AppText variant="title">{open.note}</AppText> : null}
              <AppText variant="h2">{open.mood}</AppText>
            </View>
          </View>
        </Modal>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  viewer: { flex: 1, backgroundColor: colors.bg },
  shade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 300 },
  close: {
    position: 'absolute',
    left: spacing.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(11,11,18,0.6)',
  },
  info: { position: 'absolute', left: spacing.xl, right: spacing.xl, bottom: 0, gap: spacing.sm },
});
