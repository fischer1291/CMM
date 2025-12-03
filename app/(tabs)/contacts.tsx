import { useFocusEffect } from '@react-navigation/native';
import * as Contacts from 'expo-contacts';
import React, { useCallback, useEffect, useState } from 'react';
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
import { fetchWithTimeout } from '../../utils/apiUtils';

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
        setIsLoadingContacts(true);
        
        const { status } = await Contacts.requestPermissionsAsync();
        if (status !== 'granted') {
            setIsLoadingContacts(false);
            Alert.alert(
                'Kontakt-Berechtigung benötigt',
                'Um deine Kontakte anzuzeigen, benötigen wir Zugriff auf deine Kontakte. Bitte erlaube den Zugriff in den Einstellungen.',
                [{ text: 'OK' }]
            );
            return;
        }

        const { data } = await Contacts.getContactsAsync({ fields: [Contacts.Fields.PhoneNumbers] });
        const phoneNameMap: Record<string, string> = {};

        data.forEach((contact) => {
            (contact.phoneNumbers || []).forEach((p) => {
                const num = normalizePhone(p.number || '');
                if (num) phoneNameMap[num] = contact.name;
            });
        });

        const phones = Object.keys(phoneNameMap);

        try {
            const res = await fetchWithTimeout(
                'https://cmm-backend-gdqx.onrender.com/contacts/match',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phones }),
                },
                10000
            );
            const result = await res.json();
            if (!result.success) {
                setIsLoadingContacts(false);
                return;
            }

            // Create user profiles map for contact resolution
            const userProfilesMap = new Map();
            if (userPhone && userProfile?.name) {
                userProfilesMap.set(userPhone, userProfile);
            }

            // Fetch profile data ONLY for registered users (matched users)
            const matchedPhones = result.matched.map((m: any) => m.phone);
            if (matchedPhones.length > 0) {
                try {
                    const profilePromises = matchedPhones.map(async (phone: string) => {
                        try {
                            const response = await fetchWithTimeout(
                                `https://cmm-backend-gdqx.onrender.com/me?phone=${encodeURIComponent(phone)}`,
                                {},
                                10000
                            );
                            const data = await response.json();
                            if (data.success && data.user && data.user.name) {
                                return {
                                    phone,
                                    profile: {
                                        name: data.user.name,
                                        avatarUrl: data.user.avatarUrl || '',
                                        lastOnline: data.user.lastOnline || '',
                                        momentActiveUntil: data.user.momentActiveUntil || null,
                                    }
                                };
                            }
                        } catch (error) {
                            console.log(`Could not fetch profile for ${phone}:`, error);
                        }
                        return null;
                    });

                    const profileResults = await Promise.all(profilePromises);
                    profileResults.forEach((result) => {
                        if (result) {
                            userProfilesMap.set(result.phone, result.profile);
                        }
                    });
                } catch (profileError) {
                    console.log('Could not fetch profile data for contacts:', profileError);
                    // Continue without profile data - will fall back to device contacts
                }
            }

            // Create device contacts map
            const deviceContactsMap = new Map(Object.entries(phoneNameMap));

            // Include ALL contacts (registered and unregistered)
            const all = phones.map((p) => {
                const match = result.matched.find((m: any) => m.phone === p);
                
                // For UNREGISTERED users: Only use device contacts, no profile fetching
                if (!match) {
                    return {
                        phone: p,
                        name: phoneNameMap[p] || p, // Use device contact name directly
                        isAvailable: null,
                        lastOnline: null,
                        avatarUrl: null, // No custom avatar for unregistered users
                        contactSource: 'device_contact'
                    };
                }
                
                // For REGISTERED users: Use full contact resolution with profiles
                const contactInfo = resolveContact(p, {
                    userProfiles: userProfilesMap,
                    deviceContacts: deviceContactsMap,
                    fallbackToFormatted: true,
                });
                
                return {
                    phone: p,
                    name: contactInfo.name,
                    isAvailable: match.isAvailable,
                    lastOnline: match.lastOnline || null,
                    avatarUrl: contactInfo.avatarUrl || null,
                    contactSource: contactInfo.source
                };
            });

            setContacts(all);
        } catch {
            Alert.alert(
                'Verbindungsfehler',
                'Kontakte konnten nicht geladen werden. Bitte prüfe deine Internetverbindung und versuche es erneut.',
                [{ text: 'OK' }]
            );
        } finally {
            setIsLoadingContacts(false);
        }
    };
    

    useEffect(() => {
        if (!isLoading && userPhone) {
            fetchContacts();
        }
    }, [userPhone, isLoading, userProfile]);

    // Refresh contacts when tab comes into focus (e.g., after editing profile in settings)
    useFocusEffect(
        useCallback(() => {
            if (!isLoading && userPhone) {
                fetchContacts();
            }
        }, [userPhone, isLoading, userProfile])
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