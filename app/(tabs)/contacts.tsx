import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    SectionList,
    TouchableOpacity,
    StyleSheet,
    Linking,
    Image
} from 'react-native';
import * as Contacts from 'expo-contacts';
import { io } from 'socket.io-client';
import { useTheme } from '../../theme';

const baseUrl = 'https://cmm-backend-gdqx.onrender.com';
const socket = io(baseUrl, { transports: ['websocket'], secure: true });

function normalizePhone(num: string) {
    return num.replace(/\s+/g, '').replace(/[^+\d]/g, '').replace(/^00/, '+');
}

export default function ContactsScreen({ userPhone }: { userPhone: string }) {
    const [contacts, setContacts] = useState<any[]>([]);
    const [query, setQuery] = useState('');
    const { colors } = useTheme();

    const fetchContacts = async () => {
        const { status } = await Contacts.requestPermissionsAsync();
        if (status !== 'granted') return;

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
            const res = await fetch(`${baseUrl}/contacts/match`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phones }),
            });
            const result = await res.json();
            if (!result.success) return;

            const all = phones.map((p) => {
                const match = result.matched.find((m: any) => m.phone === p);
                return {
                    phone: p,
                    name: phoneNameMap[p] || p,
                    isAvailable: match ? match.isAvailable : null,
                    avatarUrl: null // Optional: später durch Kontakte-API erweitern
                };
            });

            setContacts(all);
        } catch (err) {
            console.log('Fehler beim Abgleich:', err);
        }
    };

    useEffect(() => {
        fetchContacts();

        socket.on('connect', () => {
            console.log('✅ WebSocket verbunden');
        });

        socket.on('statusUpdate', (payload: { phone: string; isAvailable: boolean }) => {
            setContacts((prev) =>
                prev.map((c) =>
                    c.phone === payload.phone ? { ...c, isAvailable: payload.isAvailable } : c
                )
            );
        });

        return () => {
            socket.off('statusUpdate');
            socket.disconnect();
        };
    }, []);

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

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                placeholder="🔍 Suche Kontakt..."
                placeholderTextColor={colors.gray}
                value={query}
                onChangeText={setQuery}
            />

            <SectionList
                sections={sections}
                keyExtractor={(item) => item.phone}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        onPress={() => item.isAvailable === true && handleCall(item.phone)}
                        disabled={item.isAvailable !== true}
                    >
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
                                        ? 'Available'
                                        : item.isAvailable === false
                                            ? 'Not Available'
                                            : 'Not Registered'}
                                </Text>
                            </View>
                        </View>
                    </TouchableOpacity>
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
});