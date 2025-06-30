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
import { resolveContact, generateAvatarUrl } from '../../utils/contactResolver';

interface Reaction {
    emoji: string;
    count: number;
    userReacted: boolean;
}

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
    reactions: Reaction[];
    totalReactions: number;
}

export default function CallMomentsScreen() {
    const { userPhone, userProfile } = useAuth();
    const { colors } = useTheme();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();
    const [callMoments, setCallMoments] = useState<CallMoment[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [userProfiles, setUserProfiles] = useState(new Map());
    
    // Available reaction types
    const availableReactions = ['❤️', '😂', '😮', '😢', '😍', '👏'];
    
    // Calculate available height accounting for header and tab bar
    const headerHeight = 100; // Header height
    const tabBarHeight = 80; // Tab bar height
    const availableHeight = screenHeight - headerHeight - tabBarHeight;

    const fetchCallMoments = async () => {
        if (!userPhone) return; // Don't fetch if no user logged in
        
        try {
            const response = await fetch(`https://cmm-backend-gdqx.onrender.com/moment/callmoments?userPhone=${encodeURIComponent(userPhone)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const result = await response.json();
            if (result.success) {
                const moments = (result.callMoments || []).map((moment: any) => ({
                    ...moment,
                    reactions: moment.reactions || [],
                    totalReactions: moment.totalReactions || 0
                }));
                
                setCallMoments(moments);
                
                // Fetch profile data for all unique phone numbers in the call moments
                await fetchProfilesForMoments(moments);
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

    const fetchProfilesForMoments = async (moments: CallMoment[]) => {
        // Extract all unique phone numbers from call moments
        const phoneNumbers = new Set<string>();
        moments.forEach(moment => {
            phoneNumbers.add(moment.userPhone);
            phoneNumbers.add(moment.targetPhone);
        });

        // Create user profiles map starting with current user
        const profilesMap = new Map();
        if (userPhone && userProfile?.name) {
            profilesMap.set(userPhone, userProfile);
        }

        // Fetch profile data for each phone number
        const uniquePhones = Array.from(phoneNumbers);
        if (uniquePhones.length > 0) {
            try {
                const profilePromises = uniquePhones.map(async (phone: string) => {
                    try {
                        const response = await fetch(`https://cmm-backend-gdqx.onrender.com/me?phone=${encodeURIComponent(phone)}`);
                        const data = await response.json();
                        if (data.success && data.user && data.user.name) {
                            return {
                                phone,
                                profile: {
                                    name: data.user.name,
                                    avatarUrl: data.user.avatarUrl || '',
                                    lastOnline: data.user.lastOnline || '',
                                    momentActiveUntil: data.user.momentActiveUntil || null,
                                }
                            };
                        }
                    } catch (error) {
                        // Silently fail for individual profiles
                    }
                    return null;
                });

                const profileResults = await Promise.all(profilePromises);
                profileResults.forEach((result) => {
                    if (result) {
                        profilesMap.set(result.phone, result.profile);
                    }
                });
            } catch (profileError) {
                // Continue without profile data - will fall back to fallback names
            }
        }

        setUserProfiles(profilesMap);
    };

    useEffect(() => {
        if (userPhone) {
            fetchCallMoments();
        }
    }, [userPhone]);

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
            return `${diffInMinutes}m`;
        } else if (diffInHours < 24) {
            return `${diffInHours}h`;
        } else {
            const diffInDays = Math.floor(diffInHours / 24);
            return `${diffInDays}d`;
        }
    };

    // Helper function to resolve contact information
    const getContactInfo = (phone: string, fallbackName?: string) => {
        // Start with the fetched user profiles
        const profilesMap = new Map(userProfiles);
        
        // If we have a fallback name that's different from phone and no profile exists, create a mock profile
        if (fallbackName && fallbackName !== phone && !profilesMap.has(phone)) {
            const mockProfile = {
                name: fallbackName,
                avatarUrl: '',
                lastOnline: '',
                momentActiveUntil: null,
            };
            profilesMap.set(phone, mockProfile);
        }
        
        return resolveContact(phone, {
            userProfiles: profilesMap,
            fallbackToFormatted: true,
        });
    };

    // Handle reaction toggle
    const handleReactionToggle = async (momentId: string, emoji: string) => {
        if (!userPhone) {
            Alert.alert('Fehler', 'Du musst angemeldet sein, um zu reagieren.');
            return;
        }
        
        // Store original state for rollback
        const originalMoments = [...callMoments];
        
        // Optimistic update
        setCallMoments(prev => prev.map(moment => {
            if ((moment as any)._id === momentId) {
                const updatedReactions = moment.reactions.map(reaction => {
                    if (reaction.emoji === emoji) {
                        return {
                            ...reaction,
                            count: reaction.userReacted ? reaction.count - 1 : reaction.count + 1,
                            userReacted: !reaction.userReacted
                        };
                    }
                    return reaction;
                });
                
                // If reaction doesn't exist, add it
                const existingReaction = moment.reactions.find(r => r.emoji === emoji);
                if (!existingReaction) {
                    updatedReactions.push({
                        emoji,
                        count: 1,
                        userReacted: true
                    });
                }
                
                const totalReactions = updatedReactions.reduce((sum, r) => sum + r.count, 0);
                
                return {
                    ...moment,
                    reactions: updatedReactions.filter(r => r.count > 0),
                    totalReactions
                };
            }
            return moment;
        }));
        
        try {
            const payload = {
                momentId: momentId,
                userPhone,
                emoji
            };
            
            const response = await fetch('https://cmm-backend-gdqx.onrender.com/moment/react', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            
            const result = await response.json();
            if (!result.success) {
                // Rollback optimistic update
                setCallMoments(originalMoments);
                Alert.alert('Fehler', result.message || 'Reaktion konnte nicht gespeichert werden.');
            } else {
                // Update with server response to ensure consistency
                setCallMoments(prev => prev.map(moment => {
                    if ((moment as any)._id === momentId) {
                        return {
                            ...moment,
                            reactions: result.reactions || [],
                            totalReactions: result.totalReactions || 0
                        };
                    }
                    return moment;
                }));
            }
        } catch (error) {
            // Rollback optimistic update on network error
            setCallMoments(originalMoments);
            console.error('Failed to toggle reaction:', error);
            Alert.alert(
                'Verbindungsfehler',
                'Reaktion konnte nicht gespeichert werden. Bitte überprüfe deine Internetverbindung.',
                [{ text: 'OK' }]
            );
        }
    };

    // Show reaction picker
    const showReactionPicker = (momentId: string) => {
        Alert.alert(
            'Reaktion wählen',
            'Tippe auf eine Reaktion oder wähle eine neue:',
            [
                { text: 'Abbrechen', style: 'cancel' },
                ...availableReactions.map(emoji => ({
                    text: `${emoji} ${emoji === '❤️' ? 'Liebe' : emoji === '😂' ? 'Lustig' : emoji === '😮' ? 'Wow' : emoji === '😢' ? 'Traurig' : emoji === '😍' ? 'Toll' : 'Applaus'}`,
                    onPress: () => handleReactionToggle(momentId, emoji)
                }))
            ]
        );
    };

    const renderCallMoment = ({ item }: { item: CallMoment }) => (
        <View style={[styles.momentContainer, { height: availableHeight }]}>
            {/* Full-screen background image that fits properly */}
            <Image 
                source={{ uri: item.screenshot }} 
                style={[styles.backgroundImage, { width: screenWidth, height: availableHeight }]}
                resizeMode="cover"
            />
            
            {/* Subtle gradient only at top and bottom edges for text readability */}
            <View style={styles.topGradient} />
            <View style={styles.bottomGradient} />
            
            {/* Top user info overlay */}
            <View style={styles.topOverlay}>
                <View style={styles.userRow}>
                    <Image
                        source={{
                            uri: generateAvatarUrl(
                                getContactInfo(item.userPhone, item.userName).name,
                                getContactInfo(item.userPhone, item.userName).avatarUrl
                            ),
                        }}
                        style={styles.avatar}
                    />
                    <View style={styles.userDetails}>
                        <Text style={styles.userName}>
                            {getContactInfo(item.userPhone, item.userName).name}
                        </Text>
                        <Text style={styles.callInfo}>
                            mit {getContactInfo(item.targetPhone, item.targetName).name} • {item.callDuration}
                        </Text>
                    </View>
                </View>
                <View style={styles.timeAndMood}>
                    <Text style={styles.timestamp}>{formatTimestamp(item.timestamp)}</Text>
                    <Text style={styles.mood}>{item.mood}</Text>
                </View>
            </View>

            {/* Side action buttons */}
            <View style={styles.sideButtons}>
                {/* Smart reaction button */}
                {(() => {
                    // Find the most popular reaction, or default to heart
                    const sortedReactions = [...(item.reactions || [])]
                        .filter(r => r.count > 0)
                        .sort((a, b) => b.count - a.count);
                    
                    const primaryReaction = sortedReactions.length > 0 
                        ? sortedReactions[0] 
                        : { emoji: '❤️', count: 0, userReacted: false };
                    
                    return (
                        <TouchableOpacity 
                            style={styles.actionButton}
                            onPress={() => handleReactionToggle((item as any)._id, primaryReaction.emoji)}
                            onLongPress={() => showReactionPicker((item as any)._id)}
                            delayLongPress={500}
                        >
                            <Text style={[
                                styles.actionEmoji, 
                                primaryReaction.userReacted && styles.userReacted
                            ]}>{primaryReaction.emoji}</Text>
                            <Text style={styles.actionCount}>
                                {item.totalReactions || 0}
                            </Text>
                        </TouchableOpacity>
                    );
                })()}
            </View>

            {/* Bottom section with reactions and note */}
            <View style={styles.bottomSection}>
                {/* Reactions display */}
                {item.reactions && item.reactions.length > 0 && (
                    <View style={styles.reactionsContainer}>
                        {item.reactions
                            .filter(r => r.count > 0)
                            .sort((a, b) => b.count - a.count)
                            .slice(0, 3) // Show top 3 reactions
                            .map((reaction, index) => (
                                <TouchableOpacity 
                                    key={reaction.emoji}
                                    style={[
                                        styles.reactionPill,
                                        reaction.userReacted && styles.userReactionPill
                                    ]}
                                    onPress={() => handleReactionToggle((item as any)._id, reaction.emoji)}
                                >
                                    <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                                    <Text style={[
                                        styles.reactionCount,
                                        reaction.userReacted && styles.userReactionCount
                                    ]}>{reaction.count}</Text>
                                </TouchableOpacity>
                            ))
                        }
                        {item.reactions.filter(r => r.count > 0).length > 3 && (
                            <TouchableOpacity 
                                style={styles.moreReactions}
                                onPress={() => showReactionPicker((item as any)._id)}
                            >
                                <Text style={styles.moreReactionsText}>+{item.reactions.filter(r => r.count > 0).length - 3}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
                
                {/* Note text */}
                {item.note && (
                    <Text style={styles.noteText}>{item.note}</Text>
                )}
            </View>
        </View>
    );

    const renderEmptyState = () => (
        <View style={[styles.emptyContainer, { height: availableHeight }]}>
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
            <View style={[styles.container, styles.loadingContainer]}>
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
                keyExtractor={(item, index) => (item as any)._id || `callmoment-${index}`}
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
                snapToInterval={availableHeight}
                snapToAlignment="start"
                decelerationRate="fast"
                getItemLayout={(data, index) => ({
                    length: availableHeight,
                    offset: availableHeight * index,
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
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
    },
    loadingText: {
        fontSize: 16,
        color: '#fff',
        fontWeight: '500',
    },
    
    // Moment container
    momentContainer: {
        width: '100%',
        position: 'relative',
        backgroundColor: '#000',
    },
    backgroundImage: {
        position: 'absolute',
        top: 0,
        left: 0,
    },
    
    // Subtle gradients only at edges
    topGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 80,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    bottomGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 80,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    
    // Top overlay
    topOverlay: {
        position: 'absolute',
        top: 20,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: 16,
        zIndex: 10,
    },
    userRow: {
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
        borderColor: '#ffffff',
    },
    userDetails: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#ffffff',
        textShadowColor: 'rgba(0,0,0,0.7)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
        marginBottom: 2,
    },
    callInfo: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.95)',
        fontWeight: '500',
        textShadowColor: 'rgba(0,0,0,0.7)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    timeAndMood: {
        alignItems: 'flex-end',
        gap: 4,
    },
    timestamp: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.9)',
        fontWeight: '600',
        textShadowColor: 'rgba(0,0,0,0.7)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    mood: {
        fontSize: 24,
    },
    
    // Side buttons
    sideButtons: {
        position: 'absolute',
        right: 16,
        bottom: 100,
        flexDirection: 'column',
        gap: 24,
        alignItems: 'center',
        zIndex: 10,
    },
    actionButton: {
        alignItems: 'center',
        gap: 4,
    },
    actionEmoji: {
        fontSize: 28,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    actionCount: {
        fontSize: 12,
        color: '#ffffff',
        fontWeight: '600',
        textShadowColor: 'rgba(0,0,0,0.7)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    userReacted: {
        transform: [{ scale: 1.2 }],
        textShadowColor: '#FFD700',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 8,
    },
    
    // Bottom section
    bottomSection: {
        position: 'absolute',
        bottom: 20,
        left: 16,
        right: 80, // Leave space for side buttons
        zIndex: 10,
    },
    reactionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    reactionPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
        gap: 4,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    userReactionPill: {
        backgroundColor: 'rgba(255,215,0,0.3)',
        borderColor: '#FFD700',
    },
    reactionEmoji: {
        fontSize: 16,
    },
    reactionCount: {
        fontSize: 12,
        color: '#ffffff',
        fontWeight: '600',
        textShadowColor: 'rgba(0,0,0,0.7)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    userReactionCount: {
        color: '#FFD700',
    },
    moreReactions: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 20,
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    moreReactionsText: {
        fontSize: 12,
        color: '#ffffff',
        fontWeight: '600',
    },
    noteText: {
        fontSize: 15,
        lineHeight: 22,
        color: '#ffffff',
        fontWeight: '500',
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
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
        marginBottom: 4,
    },
    emptySubtitle: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 22,
        color: 'rgba(255,255,255,0.7)',
        marginBottom: 8,
    },
    emptyButton: {
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 25,
        backgroundColor: '#007AFF',
    },
    emptyButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});