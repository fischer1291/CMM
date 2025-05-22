import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, Alert, FlatList, StyleSheet } from 'react-native';
import * as Contacts from 'expo-contacts';
import * as SecureStore from 'expo-secure-store';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

const baseUrl = 'https://cmm-leroyfischer.replit.app'; // 💡 Stelle sicher: https:// + richtige URL

const Tab = createBottomTabNavigator();

function StatusScreen({ userPhone, onLogout }) {
  const [isAvailable, setIsAvailable] = useState(true);

  useEffect(() => {
    fetch(`${baseUrl}/status/get?phone=${userPhone}`)
      .then(res => res.json())
      .then(data => {
        if (data?.isAvailable !== undefined) setIsAvailable(data.isAvailable);
      });
  }, []);

  const toggleStatus = async () => {
    const newStatus = !isAvailable;
    setIsAvailable(newStatus);
    await fetch(`${baseUrl}/status/set`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: userPhone, isAvailable: newStatus })
    });
  };

  return (
    <View style={styles.screenContainer}>
      <Text style={styles.title}>Status</Text>
      <Text style={styles.statusText}>
        {isAvailable ? '✅ erreichbar' : '❌ nicht erreichbar'}
      </Text>
      <Button title={isAvailable ? 'Nicht erreichbar' : 'Erreichbar'} onPress={toggleStatus} />
      <View style={{ marginTop: 20 }}>
        <Button title="Abmelden" color="red" onPress={onLogout} />
      </View>
    </View>
  );
}

function ContactsScreen({ userPhone }) {
  const [contacts, setContacts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [query, setQuery] = useState('');

  const normalizePhone = (num) => num.replace(/\s+/g, '').replace(/[^+\d]/g, '').replace(/^00/, '+');

  const getDeviceContacts = async () => {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') return;

    const { data } = await Contacts.getContactsAsync({ fields: [Contacts.Fields.PhoneNumbers] });
    const phoneNameMap = {};
    data.forEach(c => {
      (c.phoneNumbers || []).forEach(p => {
        const num = normalizePhone(p.number);
        if (num) phoneNameMap[num] = c.name;
      });
    });
    const phones = Object.keys(phoneNameMap);
    const res = await fetch(`${baseUrl}/contacts/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phones })
    });
    const result = await res.json();
    if (result.success) {
      const all = phones.map(p => {
        const match = result.matched.find(m => m.phone === p);
        return {
          phone: p,
          name: phoneNameMap[p] || p,
          isAvailable: match ? match.isAvailable : null
        };
      });
      setContacts(all);
      setFiltered(all);
    }
  };

  useEffect(() => { getDeviceContacts(); }, []);

  useEffect(() => {
    const f = contacts.filter(c => c.name.toLowerCase().includes(query.toLowerCase()));
    setFiltered(f);
  }, [query]);

  return (
    <View style={styles.screenContainer}>
      <TextInput
        style={styles.input}
        placeholder="Suche Kontakt"
        value={query}
        onChangeText={setQuery}
      />
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.phone}
        renderItem={({ item }) => (
          <View style={styles.contactItem}>
            <View style={[styles.avatar, item.isAvailable === null && { backgroundColor: '#ccc' }]}>
              <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View>
              <Text style={styles.contactName}>{item.name}</Text>
              <Text style={{ color: item.isAvailable === true ? 'green' : item.isAvailable === false ? 'red' : 'gray' }}>
                {item.isAvailable === true ? 'Erreichbar' : item.isAvailable === false ? 'Nicht erreichbar' : 'Nicht registriert'}
              </Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

function MainApp({ userPhone, onLogout }) {
  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      tabBarIcon: ({ color, size }) => {
        let iconName = 'ellipse';
        if (route.name === 'Status') iconName = 'person-circle';
        if (route.name === 'Kontakte') iconName = 'people';
        if (route.name === 'Einstellungen') iconName = 'settings';
        return <Ionicons name={iconName} size={size} color={color} />;
      },
      headerShown: false
    })}>
      <Tab.Screen name="Status">
        {() => <StatusScreen userPhone={userPhone} onLogout={onLogout} />}
      </Tab.Screen>
      <Tab.Screen name="Kontakte">
        {() => <ContactsScreen userPhone={userPhone} />}
      </Tab.Screen>
      <Tab.Screen name="Einstellungen">
        {() => <View style={styles.screenContainer}><Text>Coming soon...</Text></View>}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function App() {
  const [userPhone, setUserPhone] = useState(null);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');

  useEffect(() => {
    SecureStore.getItemAsync('userPhone').then(saved => {
      if (saved) setUserPhone(saved);
    });
  }, []);

  const startVerification = async () => {
    const res = await fetch(`${baseUrl}/verify/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });
    const data = await res.json();
    if (data.success) Alert.alert('Code gesendet');
    else Alert.alert('Fehler', data.error);
  };

  const checkCode = async () => {
    const res = await fetch(`${baseUrl}/verify/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code })
    });
    const data = await res.json();
    if (data.success) {
      await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      await SecureStore.setItemAsync('userPhone', phone);
      setUserPhone(phone);
    } else {
      Alert.alert('Fehler', data.error);
    }
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('userPhone');
    setUserPhone(null);
  };

  if (!userPhone) {
  return (
    <View style={styles.loginContainer}>
      <Text style={styles.loginTitle}>📱 Registrierung</Text>

      <Text style={styles.label}>Deine Nummer</Text>
      <TextInput
        style={styles.input}
        placeholder="+49..."
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />
      <Button title="Code senden" onPress={startVerification} />

      {phone.length > 0 && (
        <>
          <Text style={styles.label}>Bestätigungscode</Text>
          <TextInput
            style={styles.input}
            placeholder="Code"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
          />
          <Button title="Code prüfen" onPress={checkCode} />
        </>
      )}
    </View>
  );
}

  return (
      <MainApp userPhone={userPhone} onLogout={logout} />
  );
}

const styles = StyleSheet.create({
  screenContainer: { flex: 1, padding: 20, paddingTop: 50 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 10, marginBottom: 10 },
loginContainer: {
  flex: 1,
  padding: 20,
  paddingTop: 80,
  backgroundColor: '#f9f9f9',
},
loginTitle: {
  fontSize: 26,
  fontWeight: 'bold',
  marginBottom: 30,
  textAlign: 'center',
},
label: {
  marginTop: 20,
  fontWeight: '600',
  fontSize: 16,
},
  statusText: { fontSize: 18, marginBottom: 10 },
  contactItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  avatarText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  contactName: { fontSize: 16, fontWeight: '500' }
});