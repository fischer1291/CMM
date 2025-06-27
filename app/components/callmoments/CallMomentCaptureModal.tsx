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
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../theme';
import { resolveContact } from '../../../utils/contactResolver';

const moods = ['😊', '😐', '😔', '🤣', '😍', '🥰', '😎', '🤔', '😴', '🥳', '😇', '🤪'];

interface CallMomentData {
    screenshot: string;
    note: string;
    mood: string;
    userPhone: string;
    userName: string;
    targetPhone: string;
    targetName: string;
    callDuration: string;
}

export default function CallMomentCaptureModal({
    visible,
    onClose,
    onPost,
    screenshotUri,
    userPhone,
    userName,
    targetPhone,
    targetName,
    callDuration,
}: {
    visible: boolean;
    onClose: () => void;
    onPost: (data: CallMomentData) => void;
    screenshotUri: string | null;
    userPhone: string;
    userName: string;
    targetPhone: string;
    targetName: string;
    callDuration: string;
}) {
    const { colors } = useTheme();
    const { userPhone: authUserPhone, userProfile } = useAuth();
    const [mood, setMood] = useState<string>('😊');
    const [note, setNote] = useState('');

    // Create user profiles map for contact resolution
    const createUserProfilesMap = () => {
        const profilesMap = new Map();
        if (authUserPhone && userProfile?.name) {
            profilesMap.set(authUserPhone, userProfile);
        }
        return profilesMap;
    };

    // Helper function to resolve contact information
    const getContactInfo = (phone: string, fallbackName?: string) => {
        const userProfilesMap = createUserProfilesMap();
        
        // If we have a fallback name that's different from phone, create a mock profile
        if (fallbackName && fallbackName !== phone) {
            const mockProfile = {
                name: fallbackName,
                avatarUrl: '',
                lastOnline: '',
                momentActiveUntil: null,
            };
            userProfilesMap.set(phone, mockProfile);
        }
        
        return resolveContact(phone, {
            userProfiles: userProfilesMap,
            fallbackToFormatted: true,
        });
    };

    const handlePost = () => {
        if (!screenshotUri) {
            Alert.alert(
                'Fehler',
                'Screenshot nicht verfügbar. Bitte versuche es erneut.',
                [{ text: 'OK' }]
            );
            return;
        }

        const callMomentData: CallMomentData = {
            screenshot: screenshotUri,
            note,
            mood,
            userPhone,
            userName,
            targetPhone,
            targetName,
            callDuration,
        };

        onPost(callMomentData);
        reset();
    };

    const reset = () => {
        setMood('😊');
        setNote('');
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.overlay}>
                <View style={[styles.modal, { backgroundColor: colors.card }]}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={[styles.title, { color: colors.text }]}>
                            📸 CallMoment teilen
                        </Text>

                        {screenshotUri ? (
                            <View style={styles.screenshotContainer}>
                                <Image source={{ uri: screenshotUri }} style={styles.screenshot} />
                                <View style={[styles.overlay_info, { backgroundColor: colors.background + 'CC' }]}>
                                    <Text style={[styles.callInfo, { color: colors.text }]}>
                                        📞 {callDuration} • {getContactInfo(targetPhone, targetName).name}
                                    </Text>
                                </View>
                            </View>
                        ) : (
                            <View style={[styles.screenshotPlaceholder, { backgroundColor: colors.muted }]}>
                                <Text style={[styles.placeholderText, { color: colors.gray }]}>
                                    Kein Screenshot verfügbar
                                </Text>
                            </View>
                        )}

                        <Text style={[styles.sectionLabel, { color: colors.text }]}>
                            Wie war der Anruf?
                        </Text>
                        <View style={styles.moodGrid}>
                            {moods.map((m) => (
                                <TouchableOpacity
                                    key={m}
                                    onPress={() => setMood(m)}
                                    style={[
                                        styles.moodButton,
                                        {
                                            backgroundColor: mood === m ? colors.primary : colors.border,
                                            borderColor: mood === m ? colors.primary : colors.border,
                                        }
                                    ]}
                                >
                                    <Text style={styles.moodEmoji}>{m}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={[styles.sectionLabel, { color: colors.text }]}>
                            Notiz hinzufügen (optional)
                        </Text>
                        <TextInput
                            placeholder="Was möchtest du über diesen Anruf teilen?"
                            placeholderTextColor={colors.gray}
                            style={[styles.noteInput, { borderColor: colors.border, color: colors.text }]}
                            value={note}
                            onChangeText={setNote}
                            multiline
                            maxLength={200}
                        />
                        <Text style={[styles.charCount, { color: colors.gray }]}>
                            {note.length}/200
                        </Text>

                        <View style={styles.buttonRow}>
                            <TouchableOpacity 
                                onPress={reset}
                                style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
                            >
                                <Text style={[styles.buttonText, { color: colors.gray }]}>Abbrechen</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                onPress={handlePost}
                                style={[styles.button, styles.postButton, { backgroundColor: colors.primary }]}
                                disabled={!screenshotUri}
                            >
                                <Text style={[styles.buttonText, { color: '#fff' }]}>
                                    CallMoment teilen
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: '#00000088',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modal: {
        width: '90%',
        maxHeight: '80%',
        borderRadius: 20,
        padding: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 20,
        textAlign: 'center',
    },
    screenshotContainer: {
        position: 'relative',
        marginBottom: 20,
    },
    screenshot: {
        width: '100%',
        height: 200,
        borderRadius: 12,
        resizeMode: 'cover',
    },
    overlay_info: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        right: 8,
        borderRadius: 8,
        padding: 8,
    },
    callInfo: {
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
    screenshotPlaceholder: {
        height: 200,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    placeholderText: {
        fontSize: 16,
        fontStyle: 'italic',
    },
    sectionLabel: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
        marginTop: 8,
    },
    moodGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 20,
        gap: 8,
    },
    moodButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
    },
    moodEmoji: {
        fontSize: 24,
    },
    noteInput: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
        minHeight: 80,
        textAlignVertical: 'top',
    },
    charCount: {
        fontSize: 12,
        textAlign: 'right',
        marginTop: 4,
        marginBottom: 20,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
    },
    button: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 25,
        alignItems: 'center',
    },
    cancelButton: {
        borderWidth: 1,
    },
    postButton: {
        // backgroundColor set dynamically
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
    },
});