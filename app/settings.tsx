import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert } from 'react-native';
import { useTheme } from '../theme';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';

export default function SettingsScreen() {
    const { colors, fonts } = useTheme();
    const router = useRouter();

    const logout = async () => {
        await SecureStore.deleteItemAsync('userPhone');
        router.replace('/');
    };

    const Item = ({
                      title,
                      subtitle,
                      icon,
                      onPress,
                  }: {
        title: string;
        subtitle: string;
        icon: string;
        onPress?: () => void;
    }) => (
        <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
            <View style={[styles.iconBox, { backgroundColor: colors.border }]}>
                <Text style={{ fontSize: 20 }}>{icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                <Text style={[styles.subtitle, { color: colors.gray }]}>{subtitle}</Text>
            </View>
            {onPress && <Text style={{ fontSize: 16, color: colors.gray }}>›</Text>}
        </TouchableOpacity>
    );

    return (
        <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Profile</Text>
                <View style={styles.row}>
                    <Image
                        source={{
                            uri:
                                'https://ui-avatars.com/api/?name=You&background=cccccc&color=ffffff&rounded=true&size=64',
                        }}
                        style={styles.avatar}
                    />
                    <View>
                        <Text style={[styles.title, { color: colors.text }]}>You</Text>
                        <Text style={[styles.subtitle, { color: colors.gray }]}>Edit profile</Text>
                    </View>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Preferences</Text>
                <Item title="Notifications" subtitle="Manage notifications" icon="🔔" />
                <Item title="Appearance" subtitle="Switch between light and dark mode" icon="🌙" />
            </View>

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Account</Text>
                <Item title="Privacy" subtitle="Manage privacy settings" icon="🛡️" />
                <Item title="Help" subtitle="Get help and support" icon="❓" />
                <Item title="Invite Friends" subtitle="Invite friends to join" icon="👥" />
            </View>

            <View style={styles.section}>
                <TouchableOpacity
                    onPress={() => {
                        Alert.alert('Abmelden', 'Möchtest du dich wirklich abmelden?', [
                            { text: 'Abbrechen', style: 'cancel' },
                            { text: 'Abmelden', style: 'destructive', onPress: logout },
                        ]);
                    }}
                    style={[styles.logoutButton, { backgroundColor: colors.border }]}
                >
                    <Text style={[styles.logoutText, { color: colors.text }]}>Log Out</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    section: {
        paddingHorizontal: 16,
        paddingTop: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 12,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        gap: 12,
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
    },
    subtitle: {
        fontSize: 14,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        marginRight: 12,
    },
    logoutButton: {
        borderRadius: 24,
        paddingVertical: 12,
        alignItems: 'center',
        marginTop: 16,
        marginBottom: 40,
    },
    logoutText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
});