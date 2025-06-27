import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useState } from 'react';
import {
    Alert,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../theme';

const baseUrl = 'https://cmm-backend-gdqx.onrender.com';

export default function SettingsScreen() {
    const { colors } = useTheme();
    const { setUserPhone, userPhone, userProfile, updateUserProfile, reloadProfile } = useAuth();

    const [modalVisible, setModalVisible] = useState(false);
    const [newName, setNewName] = useState('');

    const logout = async () => {
        try {
            console.log('🔒 Logging out...');
            await SecureStore.deleteItemAsync('userPhone');
            setUserPhone(null);
            router.replace('/(auth)/onboarding');
        } catch (e) {
            console.error('❌ Fehler beim Logout:', e);
            Alert.alert('Fehler', 'Abmelden fehlgeschlagen.');
        }
    };

    const updateProfile = async (updates: Partial<{ name: string; avatarUrl: string }>) => {
        if (!userPhone) return;
        try {
            await updateUserProfile(updates);
        } catch (e) {
            console.error('❌ Fehler beim Aktualisieren des Profils:', e);
            Alert.alert('Fehler', 'Profil konnte nicht aktualisiert werden. Bitte versuche es erneut.');
        }
    };

    const uploadImage = async (imageUri: string): Promise<string | null> => {
        try {
            const formData = new FormData();
            formData.append('avatar', {
                uri: imageUri,
                type: 'image/jpeg',
                name: 'avatar.jpg',
            } as any);
            
            // Add phone number to the request
            if (userPhone) {
                formData.append('phone', userPhone);
            }

            const response = await fetch('https://cmm-backend-gdqx.onrender.com/upload/avatar', {
                method: 'POST',
                body: formData,
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            const responseText = await response.text();
            
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                throw new Error(`Server error ${response.status}: ${responseText}`);
            }
            
            if (data.success && data.avatarUrl) {
                return data.avatarUrl;
            } else {
                throw new Error(`Upload failed: ${data.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Upload error:', error);
            return null;
        }
    };

    const showImagePickerOptions = () => {
        Alert.alert(
            'Profilbild auswählen',
            'Wie möchtest du dein Profilbild hinzufügen?',
            [
                { text: 'Abbrechen', style: 'cancel' },
                { text: 'Foto aufnehmen', onPress: () => pickImageFromCamera() },
                { text: 'Aus Galerie wählen', onPress: () => pickImageFromLibrary() },
            ]
        );
    };

    const pickImageFromCamera = async () => {
        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
        
        if (permissionResult.granted === false) {
            Alert.alert('Berechtigung erforderlich', 'Wir benötigen Kamera-Zugriff um ein Foto aufzunehmen.');
            return;
        }

        try {
            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.7,
            });
            
            await handleImageResult(result);
        } catch (error) {
            console.error('Camera error:', error);
            Alert.alert('Fehler', 'Foto konnte nicht aufgenommen werden.');
        }
    };

    const pickImageFromLibrary = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        
        if (permissionResult.granted === false) {
            Alert.alert('Berechtigung erforderlich', 'Wir benötigen Zugriff auf deine Fotobibliothek.');
            return;
        }
        
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                allowsEditing: true,
                quality: 0.7,
                aspect: [1, 1],
            });
            
            await handleImageResult(result);
        } catch (error) {
            console.error('Image picker error:', error);
            Alert.alert('Fehler', 'Bildauswahl fehlgeschlagen.');
        }
    };

    const handleImageResult = async (result: any) => {
        if (!result.canceled && result.assets && result.assets[0]) {
            const uri = result.assets[0].uri;
            
            // Upload to Cloudinary first, then update profile
            const cloudinaryUrl = await uploadImage(uri);
            if (cloudinaryUrl) {
                await updateProfile({ avatarUrl: cloudinaryUrl });
            } else {
                Alert.alert('Fehler', 'Profilbild konnte nicht hochgeladen werden.');
            }
        }
    };

    // Keep the old function name for compatibility
    const pickImage = showImagePickerOptions;

    const openNameModal = () => {
        setNewName(userProfile?.name || '');
        setModalVisible(true);
    };

    const confirmNameChange = async () => {
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
                    <TouchableOpacity 
                        onPress={pickImage}
                        style={styles.avatarContainer}
                        activeOpacity={0.7}
                    >
                        <Image
                            source={{
                                uri:
                                    userProfile?.avatarUrl ||
                                    'https://ui-avatars.com/api/?name=You&background=cccccc&color=ffffff&rounded=true&size=64',
                            }}
                            style={styles.avatar}
                        />
                        <View style={styles.editIconContainer}>
                            <Text style={styles.editIcon}>✏️</Text>
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={openNameModal}>
                        <View>
                            <Text style={[styles.title, { color: colors.text }]}>{userProfile?.name || 'Unnamed User'}</Text>
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
    avatarContainer: {
        position: 'relative',
        marginRight: 12,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
    },
    editIconContainer: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: '#007AFF',
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#ffffff',
    },
    editIcon: {
        fontSize: 10,
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