import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TextInput, StyleSheet } from 'react-native';
import * as Contacts from 'expo-contacts';

const baseUrl = 'https://cmm-leroyfischer.replit.app';

export default function ContactsScreen() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [query, setQuery] = useState('');

  const normalizePhone = (num: string) => num.replace(/\s+/g, '').replace(/[^+\d]/g, '').replace(/^00/, '+');

  const fetchContacts = async () => {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') return;

    const { data } = await Contacts.getContactsAsync({ fields: [Contacts.Fields.PhoneNumbers] });
    const phoneNameMap: Record<string, string> = {};
    data.forEach(c => {
  (c.phoneNumbers || []).forEach(p => {
    if (p?.number) {
      const num = normalizePhone(p.number);
      if (num) phoneNameMap[num] = c.name;
    }
  });
});

    const phones = Object.keys(phoneNameMap);
    const res = await fetch(`${baseUrl}/contacts/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phones })
    });
    const result = await res.json();

    const all = phones.map(p => {
      const match = result.matched.find((m: any) => m.phone === p);
      return {
        phone: p,
        name: phoneNameMap[p] || p,
        isAvailable: match ? match.isAvailable : null
      };
    });
    setContacts(all);
  };

  useEffect(() => { fetchContacts(); }, []);

  const filtered = contacts.filter(c => c.name.toLowerCase().includes(query.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <View style={styles.container}>
      <TextInput style={styles.input} placeholder="🔍 Suche Kontakt..." value={query} onChangeText={setQuery} />
      <FlatList
        data={filtered}
        keyExtractor={item => item.phone}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View style={[styles.avatar,
              item.isAvailable === true && { backgroundColor: '#34c759' },
              item.isAvailable === false && { backgroundColor: '#ff3b30' },
              item.isAvailable === null && { backgroundColor: '#ccc' }]}
            >
              <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={{ color: item.isAvailable === true ? '#34c759' : item.isAvailable === false ? '#ff3b30' : '#aaa' }}>
                {item.isAvailable === true ? 'Erreichbar' : item.isAvailable === false ? 'Nicht erreichbar' : 'Nicht registriert'}
              </Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 16 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  avatar: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  name: { fontSize: 16, fontWeight: '500' }
});