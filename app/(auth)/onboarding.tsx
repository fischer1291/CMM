import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../theme';

export default function OnboardingScreen() {
    const router = useRouter();
    const { colors } = useTheme();

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Text style={[styles.title, { color: colors.text }]}>Willkommen bei Call Me Maybe</Text>
            <Text style={[styles.subtitle, { color: colors.gray }]}>
                Starte jetzt und finde heraus, wer erreichbar ist für authentische Begegnungen.
            </Text>

            <Button title="Jetzt registrieren" onPress={() => router.replace('/(auth)/verify')} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
    subtitle: { fontSize: 16, marginBottom: 32, textAlign: 'center' },
});