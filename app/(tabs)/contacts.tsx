import { useRouter } from 'expo-router';
import * as Contacts from 'expo-contacts';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Linking,
    Platform,
    SectionList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useCall } from '../../contexts/CallContext';
import { useTheme } from '../../theme';
import IncomingCallModal from '../components/IncomingCallModal';

function normalizePhone(num: string) {
    return num.replace(/\s+/g, '').replace(/[^+\d]/g, '').replace(/^00/, '+');
}

export default function ContactsScreen() {
    const { userPhone, isLoading } = useAuth();
    const { incomingCall, callerPhoneNumber, acceptCall, declineCall, startVideoCall, onStatusUpdate } = useCall();
    const router = useRouter();
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
            const res = await fetch('https://cmm-backend-gdqx.onrender.com/contacts/match', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phones }),
            });
            const result = await res.json();
            if (!result.success) {
                setIsLoadingContacts(false);
                return;
            }

            const all = phones.map((p) => {
                const match = result.matched.find((m: any) => m.phone === p);
                return {
                    phone: p,
                    name: phoneNameMap[p] || p,
                    isAvailable: match ? match.isAvailable : null,
                    lastOnline: match?.lastOnline || null,
                    avatarUrl: null
                };
            });

            setContacts(all);
        } catch (err) {
            Alert.alert(
                'Verbindungsfehler',
                'Kontakte konnten nicht geladen werden. Bitte prüfe deine Internetverbindung und versuche es erneut.',
                [{ text: 'OK' }]
            );
        } finally {
            setIsLoadingContacts(false);
        }
    };
    
    const handleAcceptCall = () => {
        acceptCall();
    };

    const handleDeclineCall = () => {
        declineCall();
    };

    useEffect(() => {
        if (!isLoading && userPhone) {
            fetchContacts();
        }

        // Set up status update listener
        if (onStatusUpdate) {
            const cleanup = onStatusUpdate((phone: string, isAvailable: boolean) => {
                setContacts((prev) =>
                    prev.map((c) =>
                        c.phone === phone
                            ? { ...c, isAvailable, lastOnline: new Date().toISOString() }
                            : c
                    )
                );
            });

            return cleanup;
        }
    }, [userPhone, isLoading, onStatusUpdate]);
    
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

    const handleCall = (phone: string) => {
        Linking.openURL(`tel:${phone}`);
    };

    const handleFaceTimeCall = (phone: string) => {
        if (Platform.OS === 'ios') {
            Linking.openURL(`facetime://${phone}`).catch(() => 
                Alert.alert(
                    'FaceTime-Fehler',
                    'FaceTime konnte nicht geöffnet werden. Stelle sicher, dass FaceTime installiert und aktiviert ist.',
                    [{ text: 'OK' }]
                )
            );
        } else {
            Alert.alert(
                'Nicht verfügbar',
                'FaceTime ist nur auf iOS-Geräten verfügbar.',
                [{ text: 'OK' }]
            );
        }
    };

    const handleWhatsAppChat = (phone: string) => {
        const cleanedPhone = phone.replace('+', '');
        Linking.openURL(`https://wa.me/${cleanedPhone}?text=Hast du Lust auf einen Videoanruf?`).catch(() =>
            Alert.alert(
                'WhatsApp-Fehler',
                'WhatsApp konnte nicht geöffnet werden. Stelle sicher, dass WhatsApp installiert ist und die Nummer gültig ist.',
                [{ text: 'OK' }]
            )
        );
    };

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
                                uri:
                                    item.avatarUrl ||
                                    `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=cccccc&color=ffffff&rounded=true&size=64`,
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
                                <View style={{ flexDirection: 'row', marginTop: 8, gap: 12 }}>
                                    <TouchableOpacity onPress={() => handleCall(item.phone)}>
                                        <Text style={{ fontSize: 22 }}>📞</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => handleFaceTimeCall(item.phone)}>
                                        <Text style={{ fontSize: 22 }}>📹</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => handleWhatsAppChat(item.phone)}>
                                        <Text style={{ fontSize: 22 }}>💬</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => handleStartVideoCall(item.phone)}>
                                        <Text style={{ fontSize: 22 }}>📲</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {item.isAvailable === null && (
                                <TouchableOpacity onPress={() => 
                                    Linking.openURL(`sms:${item.phone}?body=Hey! Lade dir die Call Me Maybe App runter. Bin da erreichbar!`).catch(() =>
                                        Alert.alert(
                                            'SMS-Fehler',
                                            'SMS konnte nicht geöffnet werden. Überprüfe, ob SMS auf deinem Gerät verfügbar ist.',
                                            [{ text: 'OK' }]
                                        )
                                    )
                                }>
                                    <Text style={{ color: colors.primary, fontSize: 14, marginTop: 4 }}>
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
            <IncomingCallModal
                visible={incomingCall}
                callerPhone={callerPhoneNumber || ''}
                onAccept={() => acceptCall()}
                onDecline={handleDeclineCall}
            />
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