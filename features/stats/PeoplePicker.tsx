import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Avatar, Button, colors, spacing } from '../../ui';

export type PickablePerson = { phone: string; name: string; avatarUrl: string | null };

/** Multi-select of contacts, e.g. who may see your stats. */
export function PeoplePicker({
  title,
  people,
  initial,
  onDone,
  onCancel,
}: {
  title: string;
  people: PickablePerson[];
  initial: string[];
  onDone: (phones: string[]) => void;
  onCancel: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState(new Set(initial));

  const toggle = (phone: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(phone)) next.delete(phone);
      else next.add(phone);
      return next;
    });

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onCancel}>
      <View style={[styles.root, { paddingBottom: insets.bottom + spacing.lg }]}>
        <AppText variant="h2" style={styles.title}>
          {title}
        </AppText>
        <FlatList
          data={people}
          keyExtractor={(p) => p.phone}
          ListEmptyComponent={
            <AppText variant="caption" color={colors.textSecondary} style={styles.empty}>
              Noch keine Kontakte mit der App.
            </AppText>
          }
          renderItem={({ item }) => {
            const checked = selected.has(item.phone);
            return (
              <Pressable
                onPress={() => toggle(item.phone)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
                style={styles.row}
              >
                <Avatar name={item.name} uri={item.avatarUrl} size={40} />
                <AppText variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
                  {item.name}
                </AppText>
                <Ionicons
                  name={checked ? 'checkmark-circle' : 'ellipse-outline'}
                  size={26}
                  color={checked ? colors.cyan : colors.textMuted}
                />
              </Pressable>
            );
          }}
        />
        <View style={styles.actions}>
          <Button title="Fertig" onPress={() => onDone([...selected])} />
          <Button title="Abbrechen" variant="ghost" onPress={onCancel} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgElevated, paddingTop: spacing.xl },
  title: { paddingHorizontal: spacing.xl, marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  empty: { paddingHorizontal: spacing.xl },
  actions: { gap: spacing.sm, paddingHorizontal: spacing.xl, paddingTop: spacing.md },
});
