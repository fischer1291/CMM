import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    Alert,
    Modal,
    TextInput,
} from 'react-native';
import { useTheme } from '../../theme';
import * as SecureStore from 'expo-secure-store';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const baseUrl = 'https://cmm-backend-gdqx.onrender.com';

export default function SettingsScreen() {
    const { colors } = useTheme();
    const { setUserPhone } = useAuth();

    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [displayName, setDisplayName] = useState<string>('You');
    const [modalVisible, setModalVisible] = useState(false);
    const [newName, setNewName] = useState('');
    const [phone, setPhone] = useState<string | null>(null);

    useEffect(() => {
        loadProfile();
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadProfile();
        }, [])
    );

    const loadProfile = async () => {
        const storedPhone = await SecureStore.getItemAsync('userPhone');
        if (!storedPhone) return;

        setPhone(storedPhone);

        try {
            const res = await fetch(`${baseUrl}/me?phone=${storedPhone}`);
            const data = await res.json();
            if (data.success) {
                if (data.user.name) setDisplayName(data.user.name);
                if (data.user.avatarUrl) setAvatarUrl(data.user.avatarUrl);
            }
        } catch (e) {
            console.error('❌ Fehler beim Laden des Profils:', e);
        }
    };

    const logout = async () => {
        await SecureStore.deleteItemAsync('userPhone');
        setUserPhone(null);
        console.log("Test");
        router.replace('/(auth)/onboarding'); // <- zwingt Router in korrekten Zustand
    };

    const updateProfile = async (updates: Partial<{ name: string; avatarUrl: string }>) => {
        if (!phone) return;
        try {
            await fetch(`${baseUrl}/me/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, ...updates }),
            });
        } catch (e) {
            console.error('❌ Fehler beim Aktualisieren des Profils:', e);
        }
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.7,
        });

        if (!result.canceled) {
            const uri = result.assets[0].uri;
            setAvatarUrl(uri);
            await updateProfile({ avatarUrl: uri });
        }
    };

    const openNameModal = () => {
        setNewName(displayName);
        setModalVisible(true);
    };

    const confirmNameChange = async () => {
        setDisplayName(newName);
        await updateProfile({ name: newName });
        setModalVisible(false);
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
                    <TouchableOpacity onPress={pickImage}>
                        <Image
                            source={{
                                uri:
                                    avatarUrl ||
                                    'https://ui-avatars.com/api/?name=You&background=cccccc&color=ffffff&rounded=true&size=64',
                            }}
                            style={styles.avatar}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={openNameModal}>
                        <View>
                            <Text style={[styles.title, { color: colors.text }]}>{displayName}</Text>
                            <Text style={[styles.subtitle, { color: colors.gray }]}>Edit name</Text>
                        </View>
                    </TouchableOpacity>
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

            <Modal visible={modalVisible} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Change your name</Text>
                        <TextInput
                            value={newName}
                            onChangeText={setNewName}
                            style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                            placeholder="Enter name"
                            placeholderTextColor={colors.gray}
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Text style={{ color: colors.gray }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={confirmNameChange}>
                                <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
    modalOverlay: {
        flex: 1,
        backgroundColor: '#00000080',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalBox: {
        width: '80%',
        padding: 24,
        borderRadius: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 10,
        marginBottom: 16,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
});