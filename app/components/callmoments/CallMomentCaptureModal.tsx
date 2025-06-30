import React, { useState, useEffect } from 'react';
import {
    Alert,
    Animated,
    Dimensions,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../theme';
import { resolveContact, generateAvatarUrl, normalizePhone } from '../../../utils/contactResolver';

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
    reactions: Array<{ emoji: string; count: number; userReacted: boolean }>;
    totalReactions: number;
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
    userProfiles,
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
    userProfiles?: Map<string, any>;
}) {
    const { colors } = useTheme();
    const { userPhone: authUserPhone, userProfile } = useAuth();
    const [mood, setMood] = useState<string>('😊');
    const [note, setNote] = useState('');
    const [controlsVisible, setControlsVisible] = useState(true);
    const [controlsOpacity] = useState(new Animated.Value(1));
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
    
    const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

    // Helper function to resolve contact information
    const getContactInfo = (phone: string, fallbackName?: string) => {
        const normalizedPhone = normalizePhone(phone);
        
        // Start with passed user profiles or create empty map
        const profilesMap = new Map(userProfiles || new Map());
        
        // Add current user's profile if available
        if (authUserPhone && userProfile?.name) {
            profilesMap.set(normalizePhone(authUserPhone), userProfile);
        }
        
        // Only add fallback profile if no real profile exists and fallback is meaningful
        if (fallbackName && fallbackName !== phone && !profilesMap.has(normalizedPhone)) {
            // Check if this looks like a real name vs a placeholder like "Kontakt 1888"
            const isPlaceholderName = fallbackName.startsWith('Kontakt ');
            
            // Only create mock profile for non-placeholder names
            if (!isPlaceholderName) {
                const mockProfile = {
                    name: fallbackName,
                    avatarUrl: '',
                    lastOnline: '',
                    momentActiveUntil: null,
                };
                profilesMap.set(normalizedPhone, mockProfile);
            }
        }
        
        const resolved = resolveContact(normalizedPhone, {
            userProfiles: profilesMap,
            fallbackToFormatted: true,
        });
        
        
        return resolved;
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
            reactions: [], // Start with no reactions
            totalReactions: 0,
        };

        onPost(callMomentData);
        reset();
    };

    const reset = () => {
        setMood('😊');
        setNote('');
        onClose();
    };

    const toggleControls = () => {
        const newVisible = !controlsVisible;
        setControlsVisible(newVisible);
        
        Animated.timing(controlsOpacity, {
            toValue: newVisible ? 1 : 0,
            duration: 300,
            useNativeDriver: true,
        }).start();
    };

    const formatTimestamp = (timestamp: string) => {
        const now = new Date();
        const diffInMinutes = Math.floor((now.getTime() - new Date(timestamp).getTime()) / (1000 * 60));
        return diffInMinutes < 1 ? 'Gerade eben' : `${diffInMinutes}m`;
    };

    // Keyboard handling
    useEffect(() => {
        const keyboardWillShowListener = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (e) => {
                setKeyboardHeight(e.endCoordinates.height);
                setIsKeyboardVisible(true);
            }
        );

        const keyboardWillHideListener = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => {
                setKeyboardHeight(0);
                setIsKeyboardVisible(false);
            }
        );

        return () => {
            keyboardWillShowListener.remove();
            keyboardWillHideListener.remove();
        };
    }, []);

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
            <KeyboardAvoidingView 
                style={styles.fullScreenContainer}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                {/* Full-screen background image */}
                {screenshotUri && (
                    <TouchableOpacity 
                        style={styles.fullScreenImageContainer}
                        activeOpacity={1}
                        onPress={toggleControls}
                    >
                        <Image 
                            source={{ uri: screenshotUri }} 
                            style={[styles.fullScreenImage, { width: screenWidth, height: screenHeight }]}
                            resizeMode="cover"
                        />
                        
                        {/* Subtle gradients for overlay readability */}
                        <View style={styles.topGradient} />
                        <View style={styles.bottomGradient} />
                    </TouchableOpacity>
                )}

                {/* Top overlay controls */}
                <Animated.View 
                    style={[
                        styles.topOverlay,
                        { opacity: controlsOpacity }
                    ]}
                >
                    <View style={styles.topControls}>
                        <View style={styles.userInfo}>
                            <Image
                                source={{
                                    uri: generateAvatarUrl(
                                        getContactInfo(userPhone, userName).name,
                                        getContactInfo(userPhone, userName).avatarUrl
                                    )
                                }}
                                style={styles.avatarSmall}
                            />
                            <View style={styles.userDetails}>
                                <Text style={styles.userNameText}>
                                    {getContactInfo(userPhone, userName).name}
                                </Text>
                                <Text style={styles.callInfoText}>
                                    mit {getContactInfo(targetPhone, targetName).name} • {callDuration}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.topRightControls}>
                            <Text style={styles.timeText}>{formatTimestamp(new Date().toISOString())}</Text>
                            <Text style={styles.moodDisplay}>{mood}</Text>
                        </View>
                    </View>
                </Animated.View>

                {/* Bottom overlay controls */}
                <Animated.View 
                    style={[
                        styles.bottomOverlay,
                        { 
                            opacity: controlsOpacity,
                            bottom: isKeyboardVisible ? keyboardHeight : 0,
                            paddingBottom: isKeyboardVisible ? 20 : 40
                        }
                    ]}
                >
                    {/* Note preview */}
                    {note && (
                        <View style={styles.notePreview}>
                            <Text style={styles.notePreviewText}>{note}</Text>
                        </View>
                    )}
                    
                    {/* Control panel */}
                    <View style={styles.controlPanel}>
                        {/* Mood selector */}
                        <View style={styles.moodSection}>
                            <Text style={styles.controlLabel}>Stimmung:</Text>
                            <ScrollView 
                                horizontal 
                                showsHorizontalScrollIndicator={false}
                                style={styles.moodScrollView}
                            >
                                {moods.map((m) => (
                                    <TouchableOpacity
                                        key={m}
                                        onPress={() => setMood(m)}
                                        style={[
                                            styles.moodButtonOverlay,
                                            { 
                                                backgroundColor: mood === m ? 'rgba(0,122,255,0.3)' : 'rgba(255,255,255,0.2)',
                                                borderColor: mood === m ? '#007AFF' : 'rgba(255,255,255,0.3)'
                                            }
                                        ]}
                                    >
                                        <Text style={styles.moodEmojiOverlay}>{m}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        {/* Note input */}
                        <View style={styles.noteSection}>
                            <Text style={styles.controlLabel}>Notiz:</Text>
                            <TextInput
                                placeholder="Was möchtest du teilen?"
                                placeholderTextColor="rgba(255,255,255,0.7)"
                                style={styles.noteInputOverlay}
                                value={note}
                                onChangeText={setNote}
                                multiline
                                maxLength={200}
                            />
                            <Text style={styles.charCountOverlay}>
                                {note.length}/200
                            </Text>
                        </View>

                        {/* Action buttons */}
                        <View style={styles.actionButtons}>
                            <TouchableOpacity 
                                onPress={reset}
                                style={styles.cancelButtonOverlay}
                            >
                                <Text style={styles.cancelButtonText}>Abbrechen</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                onPress={handlePost}
                                style={styles.shareButtonOverlay}
                                disabled={!screenshotUri}
                            >
                                <Text style={styles.shareButtonText}>
                                    Teilen
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    // Full-screen container
    fullScreenContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    fullScreenImageContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    fullScreenImage: {
        position: 'absolute',
        top: 0,
        left: 0,
    },
    
    // Gradients for overlay readability
    topGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 120,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    bottomGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 200,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    
    // Top overlay
    topOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingTop: 50,
        paddingHorizontal: 16,
        zIndex: 10,
    },
    topControls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 12,
    },
    avatarSmall: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#ffffff',
    },
    userDetails: {
        flex: 1,
    },
    userNameText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#ffffff',
        textShadowColor: 'rgba(0,0,0,0.7)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    callInfoText: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.95)',
        fontWeight: '500',
        textShadowColor: 'rgba(0,0,0,0.7)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    topRightControls: {
        alignItems: 'flex-end',
        gap: 4,
    },
    timeText: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.9)',
        fontWeight: '600',
        textShadowColor: 'rgba(0,0,0,0.7)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    moodDisplay: {
        fontSize: 24,
    },
    
    // Bottom overlay
    bottomOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        paddingBottom: 40,
        zIndex: 10,
    },
    notePreview: {
        marginBottom: 16,
        padding: 12,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 12,
    },
    notePreviewText: {
        fontSize: 15,
        color: '#ffffff',
        lineHeight: 20,
        textShadowColor: 'rgba(0,0,0,0.7)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    controlPanel: {
        backgroundColor: 'rgba(0,0,0,0.7)',
        borderRadius: 16,
        padding: 16,
        gap: 16,
    },
    
    // Control sections
    moodSection: {
        gap: 8,
    },
    noteSection: {
        gap: 8,
    },
    controlLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#ffffff',
    },
    moodScrollView: {
        flexGrow: 0,
    },
    moodButtonOverlay: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
        borderWidth: 1.5,
    },
    moodEmojiOverlay: {
        fontSize: 20,
    },
    noteInputOverlay: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12,
        padding: 12,
        color: '#ffffff',
        fontSize: 16,
        minHeight: 44,
        maxHeight: 80,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    charCountOverlay: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'right',
    },
    
    // Action buttons
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelButtonOverlay: {
        flex: 1,
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.3)',
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
    },
    shareButtonOverlay: {
        flex: 1,
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 25,
        backgroundColor: '#007AFF',
        alignItems: 'center',
    },
    shareButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#ffffff',
    },
});