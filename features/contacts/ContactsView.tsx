import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Pressable, RefreshControl, SectionList, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Contact } from '../../contexts/ContactsContext';
import {
  AppText,
  Avatar,
  Button,
  colors,
  EmptyState,
  fonts,
  IconButton,
  radius,
  spacing,
  TAB_BAR_SPACE,
} from '../../ui';
import { formatLastSeen } from '../../utils/time';

type Props = {
  contacts: Contact[];
  query: string;
  onQueryChange: (q: string) => void;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  permissionDenied: boolean;
  onRequestPermission: () => void;
  onCall: (phone: string) => void;
  onInvite: (contact: Contact) => void;
};

function subtitleOf(contact: Contact): { text: string; color: string } {
  if (!contact.registered) return { text: 'Noch nicht dabei', color: colors.textMuted };
  if (contact.isAvailable) return { text: 'Jetzt erreichbar', color: colors.cyan };
  const seen = formatLastSeen(contact.lastOnline);
  return { text: seen ? `Zuletzt erreichbar ${seen}` : 'Gerade offline', color: colors.textSecondary };
}

function ContactRow({ contact, onCall, onInvite }: { contact: Contact; onCall: Props['onCall']; onInvite: Props['onInvite'] }) {
  const subtitle = subtitleOf(contact);
  return (
    <View style={styles.row}>
      <Avatar
        name={contact.name}
        uri={contact.avatarUrl}
        size={52}
        available={contact.registered ? contact.isAvailable : undefined}
      />
      <View style={styles.rowText}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {contact.name}
        </AppText>
        <AppText variant="caption" color={subtitle.color} numberOfLines={1}>
          {subtitle.text}
        </AppText>
      </View>
      {contact.registered && contact.isAvailable ? (
        <IconButton icon="videocam" size={44} color={colors.violet} accessibilityLabel={`${contact.name} anrufen`} onPress={() => onCall(contact.phone)} />
      ) : !contact.registered ? (
        <Pressable onPress={() => onInvite(contact)} accessibilityRole="button" style={styles.invite}>
          <AppText variant="caption" color={colors.text}>
            Einladen
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Address book split into available / offline / not yet on the app. */
export function ContactsView({
  contacts,
  query,
  onQueryChange,
  loading,
  refreshing,
  onRefresh,
  permissionDenied,
  onRequestPermission,
  onCall,
  onInvite,
}: Props) {
  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const visible = q ? contacts.filter((c) => c.name.toLowerCase().includes(q)) : contacts;
    return [
      { key: 'available', title: 'Jetzt erreichbar', data: visible.filter((c) => c.registered && c.isAvailable) },
      { key: 'offline', title: 'Offline', data: visible.filter((c) => c.registered && !c.isAvailable) },
      { key: 'invite', title: 'Noch nicht dabei', data: visible.filter((c) => !c.registered) },
    ].filter((s) => s.data.length > 0);
  }, [contacts, query]);

  const availableCount = contacts.filter((c) => c.registered && c.isAvailable).length;

  const header = (
    <View>
      <AppText variant="h1" style={{ marginTop: spacing.lg }}>
        Kontakte
      </AppText>
      <AppText variant="caption" color={colors.textSecondary}>
        {availableCount === 0
          ? 'Gerade ist niemand erreichbar'
          : availableCount === 1
            ? '1 Person ist gerade erreichbar'
            : `${availableCount} Personen sind gerade erreichbar`}
      </AppText>
      <View style={styles.search}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={onQueryChange}
          placeholder="Suchen"
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          autoCorrect={false}
          clearButtonMode="while-editing"
          accessibilityLabel="Kontakte durchsuchen"
        />
      </View>
    </View>
  );

  let empty: React.ReactNode = null;
  if (permissionDenied) {
    empty = (
      <View>
        <EmptyState
          icon="lock-closed-outline"
          title="Kontakte freigeben"
          text="Damit du siehst, wer von deinen Freunden erreichbar ist. Nummern von Leuten ohne App verlassen dein Handy nicht."
        />
        <Button title="Zugriff erlauben" onPress={onRequestPermission} />
      </View>
    );
  } else if (!loading) {
    empty = query ? (
      <EmptyState icon="search-outline" title="Niemand gefunden" text={`Kein Kontakt passt zu „${query}“.`} />
    ) : (
      <EmptyState icon="people-outline" title="Noch keine Kontakte" text="Dein Adressbuch ist leer." />
    );
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.root} edges={['top']}>
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.phone}
          ListHeaderComponent={header}
          ListEmptyComponent={empty ? <View>{empty}</View> : null}
          renderSectionHeader={({ section }) => (
            <AppText variant="label" color={colors.textMuted} style={styles.sectionTitle}>
              {section.title}
            </AppText>
          )}
          renderItem={({ item }) => <ContactRow contact={item} onCall={onCall} onInvite={onInvite} />}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cyan} />}
          keyboardDismissMode="on-drag"
          initialNumToRender={20}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  list: { paddingHorizontal: spacing.xl, paddingBottom: TAB_BAR_SPACE },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, color: colors.text, fontFamily: fonts.regular, fontSize: 16 },
  sectionTitle: { marginTop: spacing.xl, marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  rowText: { flex: 1, gap: 2 },
  invite: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
});
