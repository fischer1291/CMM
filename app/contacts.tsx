import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, SectionList, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import * as Contacts from 'expo-contacts';
import { Ionicons } from '@expo/vector-icons';
import { io } from 'socket.io-client';

const baseUrl = 'https://cmm-backend-gdqx.onrender.com';
const socket = io(baseUrl, { transports: ['websocket'], secure: true });

function normalizePhone(num: string) {
    return num.replace(/\s+/g, '').replace(/[^+\d]/g, '').replace(/^00/, '+');
}

export default function ContactsScreen({ userPhone }: { userPhone: string }) {
    const [contacts, setContacts] = useState<any[]>([]);
    const [query, setQuery] = useState('');

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

        socket.on('statusUpdate', (payload: { phone: string, isAvailable: boolean }) => {
            setContacts(prev =>
                prev.map(c => c.phone === payload.phone ? { ...c, isAvailable: payload.isAvailable } : c)
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
        <View style={styles.container}>
            <TextInput
                style={styles.input}
                placeholder="🔍 Suche Kontakt..."
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
                        <View style={styles.contactItem}>
                            <View style={[
                                styles.avatar,
                                item.isAvailable === true && { backgroundColor: '#34c759' },
                                item.isAvailable === false && { backgroundColor: '#ff3b30' },
                                item.isAvailable === null && { backgroundColor: '#ccc' }
                            ]}>
                                <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                            </View>
                            <View>
                                <Text style={styles.contactName}>{item.name}</Text>
                                <Text style={{
                                    color: item.isAvailable === true
                                        ? '#34c759'
                                        : item.isAvailable === false
                                            ? '#ff3b30'
                                            : '#aaa'
                                }}>
                                    {item.isAvailable === true
                                        ? 'Erreichbar'
                                        : item.isAvailable === false
                                            ? 'Nicht erreichbar'
                                            : 'Nicht registriert'}
                                </Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                )}
                renderSectionHeader={({ section: { title, data, empty } }) => (
                    <View>
                        <Text style={styles.sectionHeader}>{title}</Text>
                        {data.length === 0 && <Text style={styles.emptyMessage}>{empty}</Text>}
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
        backgroundColor: '#fff',
    },
    sectionHeader: {
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 20,
        marginBottom: 10,
        color: '#333',
    },
    emptyMessage: {
        color: '#999',
        fontStyle: 'italic',
        marginBottom: 10,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 10,
        marginBottom: 16,
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    avatar: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#ccc',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    contactName: {
        fontSize: 16,
        fontWeight: '500',
    },
});