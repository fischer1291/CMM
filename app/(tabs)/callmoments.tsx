import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../theme';

interface CallMoment {
    id: string;
    userPhone: string;
    userName: string;
    targetPhone: string;
    targetName: string;
    screenshot: string;
    note?: string;
    mood: string;
    callDuration: string;
    timestamp: string;
}

export default function CallMomentsScreen() {
    const { userPhone } = useAuth();
    const { colors } = useTheme();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();
    const [callMoments, setCallMoments] = useState<CallMoment[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    // Simple height calculation - let the tab navigator handle the rest
    const itemHeight = screenHeight;

    const fetchCallMoments = async () => {
        try {
            const response = await fetch('https://cmm-backend-gdqx.onrender.com/moment/callmoments', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const result = await response.json();
            if (result.success) {
                setCallMoments(result.callMoments || []);
            } else {
                Alert.alert(
                    'Fehler',
                    'CallMoments konnten nicht geladen werden.',
                    [{ text: 'OK' }]
                );
            }
        } catch (error) {
            Alert.alert(
                'Verbindungsfehler',
                'CallMoments konnten nicht geladen werden. Bitte überprüfe deine Internetverbindung.',
                [{ text: 'OK' }]
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchCallMoments();
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchCallMoments();
    }, []);

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
        
        if (diffInHours < 1) {
            const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
            return `vor ${diffInMinutes} Min`;
        } else if (diffInHours < 24) {
            return `vor ${diffInHours}h`;
        } else {
            const diffInDays = Math.floor(diffInHours / 24);
            return `vor ${diffInDays}d`;
        }
    };

    const renderCallMoment = ({ item }: { item: CallMoment }) => (
        <View style={[styles.fullScreenMoment, { height: itemHeight }]}>
            {/* Full-screen background image */}
            <Image source={{ uri: item.screenshot }} style={styles.fullScreenImage} />
            
            {/* Top overlay - attached to header */}
            <View style={styles.topOverlay}>
                <View style={styles.userInfo}>
                    <Image
                        source={{
                            uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(item.userName)}&background=ffffff&color=000000&rounded=true&size=48`,
                        }}
                        style={styles.avatar}
                    />
                    <View style={styles.userText}>
                        <Text style={styles.userName}>{item.userName}</Text>
                        <Text style={styles.callInfo}>📞 {item.callDuration} mit {item.targetName}</Text>
                    </View>
                </View>
                <View style={styles.timeInfo}>
                    <Text style={styles.timestamp}>{formatTimestamp(item.timestamp)}</Text>
                    <Text style={styles.moodEmoji}>{item.mood}</Text>
                </View>
            </View>

            {/* Bottom overlay - attached to tab bar */}
            {item.note && (
                <View style={styles.bottomOverlay}>
                    <Text style={styles.noteText}>{item.note}</Text>
                </View>
            )}
        </View>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📸</Text>
            <Text style={styles.emptyTitle}>Noch keine CallMoments</Text>
            <Text style={styles.emptySubtitle}>
                Starte einen Videoanruf und teile deinen ersten CallMoment!
            </Text>
            <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => router.push('/(tabs)/contacts')}
            >
                <Text style={styles.emptyButtonText}>Zu den Kontakten</Text>
            </TouchableOpacity>
        </View>
    );

    if (loading) {
        return (
            <View style={[styles.container, styles.centerContent]}>
                <ActivityIndicator size="large" color="#ffffff" />
                <Text style={styles.loadingText}>CallMoments werden geladen...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={callMoments}
                renderItem={renderCallMoment}
                keyExtractor={(item, index) => item.id || `callmoment-${index}`}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#ffffff"
                    />
                }
                ListEmptyComponent={renderEmptyState}
                showsVerticalScrollIndicator={false}
                pagingEnabled={true}
                snapToInterval={itemHeight}
                snapToAlignment="start"
                decelerationRate="fast"
                getItemLayout={(data, index) => ({
                    length: itemHeight,
                    offset: itemHeight * index,
                    index,
                })}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    centerContent: {
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
    },
    loadingText: {
        fontSize: 16,
        color: '#fff',
    },
    fullScreenMoment: {
        width: '100%',
        position: 'relative',
        backgroundColor: '#000',
    },
    fullScreenImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'contain',
    },
    
    // Top overlay - attached to header
    topOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingTop: 60, // Account for header
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.8)',
    },
    userText: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#ffffff',
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    callInfo: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.9)',
        marginTop: 2,
        fontWeight: '600',
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    timeInfo: {
        alignItems: 'flex-end',
        gap: 4,
    },
    timestamp: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '600',
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    moodEmoji: {
        fontSize: 24,
        textShadowColor: 'rgba(0,0,0,0.6)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    
    // Bottom overlay - attached to tab bar
    bottomOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingBottom: 100, // Account for tab bar
    },
    noteText: {
        fontSize: 15,
        lineHeight: 20,
        color: '#ffffff',
        fontWeight: '600',
        textAlign: 'center',
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    
    // Empty state
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        gap: 16,
        backgroundColor: '#000',
    },
    emptyEmoji: {
        fontSize: 64,
        marginBottom: 8,
    },
    emptyTitle: {
        fontSize: 24,
        fontWeight: '700',
        textAlign: 'center',
        color: '#fff',
    },
    emptySubtitle: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 22,
        color: 'rgba(255,255,255,0.7)',
    },
    emptyButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 25,
        marginTop: 8,
        backgroundColor: '#007AFF',
    },
    emptyButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});