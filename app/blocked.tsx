import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { useContacts } from '../contexts/ContactsContext';
import { BlockedPerson, fetchBlocked, unblockPerson } from '../services/socialApi';
import { AppText, Avatar, Button, colors, EmptyState, GlassCard, PageHeader, Screen, spacing } from '../ui';

/** People the user blocked, with a way to unblock them. */
export default function BlockedScreen() {
  const router = useRouter();
  const { refresh, find } = useContacts();
  const [blocked, setBlocked] = useState<BlockedPerson[] | null>(null);

  const load = useCallback(() => {
    fetchBlocked()
      .then(setBlocked)
      .catch(() => setBlocked([]));
  }, []);

  useEffect(load, [load]);

  const unblock = (person: BlockedPerson) => {
    const name = find(person.phone)?.name || person.name || person.phone;
    Alert.alert(`${name.split(' ')[0]} entsperren?`, 'Ihr seht euch dann wieder in der App.', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Entsperren',
        onPress: async () => {
          try {
            await unblockPerson(person.phone);
            setBlocked((list) => (list ?? []).filter((p) => p.phone !== person.phone));
            refresh();
          } catch {
            Alert.alert('Nicht entsperrt', 'Das hat leider nicht geklappt.');
          }
        },
      },
    ]);
  };

  return (
    <Screen scroll>
      <PageHeader title="Blockierte Personen" onBack={() => router.back()} />
      {!blocked ? (
        <ActivityIndicator color={colors.cyan} style={{ marginTop: spacing.xxl }} />
      ) : blocked.length === 0 ? (
        <EmptyState icon="shield-checkmark-outline" title="Niemand blockiert" text="Blockierte Personen siehst du hier." />
      ) : (
        <GlassCard padded={false}>
          {blocked.map((person, i) => {
            const name = find(person.phone)?.name || person.name || person.phone;
            return (
              <View key={person.phone} style={[styles.row, i > 0 && styles.divider]}>
                <Avatar name={name} uri={person.avatarUrl || null} size={40} />
                <AppText variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
                  {name}
                </AppText>
                <Button title="Entsperren" variant="secondary" onPress={() => unblock(person)} />
              </View>
            );
          })}
        </GlassCard>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
});
