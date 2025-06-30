import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
  Animated,
  Vibration,
} from 'react-native';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

interface IncomingCallScreenProps {
  visible: boolean;
  callerName: string;
  callerPhone: string;
  callerAvatar?: string;
  onAnswer: () => void;
  onDecline: () => void;
}

export default function IncomingCallScreen({
  visible,
  callerName,
  callerPhone,
  callerAvatar,
  onAnswer,
  onDecline,
}: IncomingCallScreenProps) {
  const [pulseAnim] = useState(new Animated.Value(1));
  const [slideAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      // Start vibration pattern
      Vibration.vibrate([500, 1000], true);
      
      // Start pulsing animation for avatar
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      
      // Slide in animation
      const slideAnimation = Animated.timing(slideAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      });

      pulseAnimation.start();
      slideAnimation.start();

      return () => {
        Vibration.cancel();
        pulseAnimation.stop();
      };
    } else {
      Vibration.cancel();
      slideAnim.setValue(0);
    }
  }, [visible, pulseAnim, slideAnim]);

  if (!visible) return null;

  const handleAnswer = () => {
    Vibration.cancel();
    onAnswer();
  };

  const handleDecline = () => {
    Vibration.cancel();
    onDecline();
  };

  return (
    <View style={styles.container}>
      <BlurView intensity={50} style={styles.blurContainer}>
        <Animated.View 
          style={[
            styles.content,
            {
              transform: [
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [height, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Top section with caller info */}
          <View style={styles.topSection}>
            <Text style={styles.incomingLabel}>Eingehender Videoanruf</Text>
            
            <Animated.View 
              style={[
                styles.avatarContainer,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              {callerAvatar ? (
                <Image
                  source={{ uri: callerAvatar }}
                  style={styles.avatar}
                />
              ) : (
                <View style={[styles.avatar, styles.defaultAvatar]}>
                  <Text style={styles.avatarInitial}>
                    {callerName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </Animated.View>
            
            <Text style={styles.callerName}>{callerName}</Text>
            <Text style={styles.callerPhone}>{callerPhone}</Text>
          </View>

          {/* Bottom section with action buttons */}
          <View style={styles.bottomSection}>
            <View style={styles.actionsContainer}>
              {/* Decline button */}
              <TouchableOpacity
                style={[styles.actionButton, styles.declineButton]}
                onPress={handleDecline}
                activeOpacity={0.8}
              >
                <View style={styles.buttonIcon}>
                  <Text style={styles.declineIcon}>✕</Text>
                </View>
              </TouchableOpacity>

              {/* Answer button */}
              <TouchableOpacity
                style={[styles.actionButton, styles.answerButton]}
                onPress={handleAnswer}
                activeOpacity={0.8}
              >
                <View style={styles.buttonIcon}>
                  <Text style={styles.answerIcon}>📞</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.actionLabels}>
              <Text style={styles.actionLabel}>Ablehnen</Text>
              <Text style={styles.actionLabel}>Annehmen</Text>
            </View>
          </View>
        </Animated.View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  blurContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 100,
    paddingBottom: 80,
    paddingHorizontal: 40,
  },
  topSection: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  incomingLabel: {
    fontSize: 16,
    color: 'white',
    opacity: 0.8,
    marginBottom: 40,
    textAlign: 'center',
  },
  avatarContainer: {
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  avatar: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    borderColor: 'white',
  },
  defaultAvatar: {
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 80,
    fontWeight: 'bold',
    color: 'white',
  },
  callerName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  callerPhone: {
    fontSize: 18,
    color: 'white',
    opacity: 0.8,
    textAlign: 'center',
  },
  bottomSection: {
    alignItems: 'center',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: width * 0.6,
    marginBottom: 20,
  },
  actionButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  declineButton: {
    backgroundColor: '#FF3B30',
  },
  answerButton: {
    backgroundColor: '#34C759',
  },
  buttonIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  declineIcon: {
    fontSize: 28,
    color: 'white',
    fontWeight: 'bold',
  },
  answerIcon: {
    fontSize: 24,
    color: 'white',
  },
  actionLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: width * 0.6,
  },
  actionLabel: {
    fontSize: 16,
    color: 'white',
    opacity: 0.8,
    textAlign: 'center',
    width: 70,
  },
});