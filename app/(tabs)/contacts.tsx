import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Linking,
    SectionList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useNewCall } from '../../contexts/NewCallContext';
import { useTheme } from '../../theme';
import { normalizePhone, resolveContact, generateAvatarUrl } from '../../utils/contactResolver';
import { ContactsPermissionError, matchContacts } from '../../services/contactsService';

export default function ContactsScreen() {
    const { userPhone, isLoading, userProfile } = useAuth();
    const { startVideoCall } = useNewCall();
    const [contacts, setContacts] = useState<any[]>([]);
    const [query, setQuery] = useState('');
    const [isLoadingContacts, setIsLoadingContacts] = useState(false);
    const { colors } = useTheme();

    const handleStartVideoCall = (calleePhone: string) => {
        if (!userPhone || !startVideoCall) return;
        startVideoCall(calleePhone, userPhone);
    };

    const fetchContacts = async () => {
        if (!userPhone) return;
        setIsLoadingContacts(true);

        try {
            const { deviceNames, matched } = await matchContacts(userPhone, { askPermission: true });

            // Profile name/avatar of registered users, address book names otherwise
            const userProfilesMap = new Map(
                matched.map((m) => [
                    m.phone,
                    { name: m.name, avatarUrl: m.avatarUrl, lastOnline: m.lastOnline || '', momentActiveUntil: null },
                ])
            );
            const matchedByPhone = new Map(matched.map((m) => [m.phone, m]));

            const all = [...deviceNames.keys()].map((p) => {
                const match = matchedByPhone.get(p);
                if (!match) {
                    return {
                        phone: p,
                        name: deviceNames.get(p) || p,
                        isAvailable: null,
                        lastOnline: null,
                        avatarUrl: null,
                        contactSource: 'device_contact',
                    };
                }

                const contactInfo = resolveContact(p, {
                    userProfiles: userProfilesMap,
                    deviceContacts: deviceNames,
                    fallbackToFormatted: true,
                });
                return {
                    phone: p,
                    name: contactInfo.name,
                    isAvailable: match.isAvailable,
                    lastOnline: match.lastOnline,
                    avatarUrl: contactInfo.avatarUrl || null,
                    contactSource: contactInfo.source,
                };
            });

            setContacts(all);
        } catch (error) {
            if (error instanceof ContactsPermissionError) {
                Alert.alert(
                    'Kontakt-Berechtigung benötigt',
                    'Um zu sehen, wer von deinen Kontakten erreichbar ist, braucht die App Zugriff auf deine Kontakte. Du kannst ihn in den Einstellungen erlauben.',
                    [{ text: 'OK' }]
                );
            } else {
                Alert.alert(
                    'Verbindungsfehler',
                    'Kontakte konnten nicht geladen werden. Bitte prüfe deine Internetverbindung und versuche es erneut.',
                    [{ text: 'OK' }]
                );
            }
        } finally {
            setIsLoadingContacts(false);
        }
    };

    // Refresh contacts when tab comes into focus (e.g., after editing profile in settings)
    useFocusEffect(
        useCallback(() => {
            if (!isLoading && userPhone) {
                fetchContacts();
            }
        }, [userPhone, isLoading])
    );
    
    const filtered = contacts.filter((c) =>
        c.name.toLowerCase().includes(query.toLowerCase())
    );

    const available = filtered.filter((c) => c.isAvailable === true);
    const unavailable = filtered.filter((c) => c.isAvailable === false);
    const unregistered = filtered.filter((c) => c.isAvailable === null);

    const sections = [
        { title: '✅ Erreichbar', data: available, empty: 'Niemand ist aktuell erreichbar.' },
        { title: '❌ Nicht erreichbar', data: unavailable, empty: 'Niemand ist registriert aber offline.' },
        { title: '⚪️ Nicht registriert', data: unregistered, empty: 'Alle deine Kontakte sind registriert 🎉' },
    ];


    if (isLoading) {
        return <Text>Lade...</Text>;
    }
    if (!userPhone) {
        return <Text>Fehler: Kein Benutzer eingeloggt.</Text>;
    }
    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                placeholder="🔍 Suche Kontakt..."
                placeholderTextColor={colors.gray}
                value={query}
                onChangeText={setQuery}
            />

            {isLoadingContacts ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.text }]}>Kontakte werden geladen...</Text>
                </View>
            ) : (
                <SectionList
                sections={sections}
                keyExtractor={(item) => item.phone}
                renderItem={({ item }) => (
                    <View style={[styles.card, { backgroundColor: colors.card }]}>
                        <Image
                            source={{ 
                                uri: item.isAvailable === null 
                                    ? generateAvatarUrl(item.name) 
                                    : generateAvatarUrl(item.name, item.avatarUrl)
                            }}
                            style={[styles.avatar, { backgroundColor: colors.muted }]}
                        />
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
                            <Text
                                style={{
                                    color:
                                        item.isAvailable === true
                                            ? colors.success
                                            : item.isAvailable === false
                                                ? colors.error
                                                : colors.gray,
                                    fontSize: 14,
                                }}
                            >
                                {item.isAvailable === true
                                    ? '🟢 Erreichbar'
                                    : item.isAvailable === false
                                        ? item.lastOnline
                                            ? `Zuletzt erreichbar: ${new Date(item.lastOnline).toLocaleString('de-DE', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}`
                                            : '❌ Nicht erreichbar'
                                        : 'Nicht registriert – jetzt einladen'}
                            </Text>

                            {item.isAvailable === true && (
                                <TouchableOpacity 
                                    onPress={() => handleStartVideoCall(item.phone)}
                                    style={{
                                        backgroundColor: colors.primary,
                                        paddingHorizontal: 16,
                                        paddingVertical: 8,
                                        borderRadius: 20,
                                        marginTop: 8,
                                        alignSelf: 'flex-start'
                                    }}
                                >
                                    <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '600' }}>
                                        📲 Videoanruf starten
                                    </Text>
                                </TouchableOpacity>
                            )}

                            {item.isAvailable === null && (
                                <TouchableOpacity 
                                    onPress={() => 
                                        Linking.openURL(`sms:${item.phone}?body=Hey! Lade dir die Call Me Maybe App runter. Bin da erreichbar!`).catch(() =>
                                            Alert.alert(
                                                'SMS-Fehler',
                                                'SMS konnte nicht geöffnet werden. Überprüfe, ob SMS auf deinem Gerät verfügbar ist.',
                                                [{ text: 'OK' }]
                                            )
                                        )
                                    }
                                    style={{
                                        backgroundColor: colors.border,
                                        paddingHorizontal: 16,
                                        paddingVertical: 8,
                                        borderRadius: 20,
                                        marginTop: 8,
                                        alignSelf: 'flex-start'
                                    }}
                                >
                                    <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>
                                        📩 Einladung senden
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                )}
                renderSectionHeader={({ section: { title, data, empty } }) => (
                    <View style={{ marginTop: 24 }}>
                        <Text style={[styles.sectionHeader, { color: colors.text }]}>{title}</Text>
                        {data.length === 0 && (
                            <Text style={[styles.emptyMessage, { color: colors.gray }]}>{empty}</Text>
                        )}
                    </View>
                )}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        paddingTop: 60,
    },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
        fontSize: 16,
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    emptyMessage: {
        fontSize: 14,
        fontStyle: 'italic',
        marginBottom: 12,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        marginBottom: 10,
        borderRadius: 12,
        gap: 12,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 20,
    },
    loadingText: {
        fontSize: 16,
    },
});