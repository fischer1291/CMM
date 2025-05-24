import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useTheme } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';

const baseUrl = 'https://cmm-backend-gdqx.onrender.com';

export default function VerifyScreen() {
    const { colors } = useTheme();
    const router = useRouter();
    const { setUserPhone } = useAuth();

    const [phone, setPhone] = useState('');
    const [code, setCode] = useState('');
    const [codeRequested, setCodeRequested] = useState(false);

    const startVerification = async () => {
        if (!phone.startsWith('+')) {
            Alert.alert('Ungültige Nummer', 'Bitte gib eine Nummer im Format +49... ein.');
            return;
        }
        try {
            const res = await fetch(`${baseUrl}/verify/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone }),
            });
            const data = await res.json();
            if (data.success) {
                setCodeRequested(true);
                Alert.alert('Code gesendet');
            } else {
                Alert.alert('Fehler', data.error || 'Unbekannter Fehler');
            }
        } catch (e) {
            console.error('❌ Fehler bei startVerification:', e);
            Alert.alert('Fehler', 'Verbindung fehlgeschlagen. Bitte versuche es später erneut.');
        }
    };

    const checkCode = async () => {
        try {
            const res = await fetch(`${baseUrl}/verify/check`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, code }),
            });
            const data = await res.json();

            if (data.success) {
                // Registrierung durchführen
                await fetch(`${baseUrl}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone }),
                });

                // Speichern und AuthContext updaten
                await SecureStore.setItemAsync('userPhone', phone);
                setUserPhone(phone); // sorgt für Routing zurück in den Tabs-Bereich

                // Optional: manuelles Routing
                router.replace('/(tabs)/index');
            } else {
                Alert.alert('Fehler', data.error || 'Code ungültig');
            }
        } catch (e) {
            console.error('❌ Fehler bei checkCode:', e);
            Alert.alert('Fehler', 'Verbindung fehlgeschlagen. Bitte versuche es später erneut.');
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Text style={[styles.title, { color: colors.text }]}>Verifizierung</Text>

            {!codeRequested ? (
                <>
                    <Text style={[styles.label, { color: colors.text }]}>Deine Nummer</Text>
                    <TextInput
                        style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                        placeholder="+49..."
                        placeholderTextColor={colors.gray}
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                        autoComplete="tel"
                    />
                    <Button title="Code senden" onPress={startVerification} />
                </>
            ) : (
                <>
                    <Text style={[styles.label, { color: colors.text }]}>Bestätigungscode</Text>
                    <TextInput
                        style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                        placeholder="123456"
                        placeholderTextColor={colors.gray}
                        value={code}
                        onChangeText={setCode}
                        keyboardType="number-pad"
                    />
                    <Button title="Bestätigen" onPress={checkCode} />
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, justifyContent: 'center' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    label: { marginTop: 20, fontWeight: '600', fontSize: 16 },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        marginBottom: 10,
        fontSize: 16,
    },
});