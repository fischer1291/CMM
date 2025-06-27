import React from 'react';
import { Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { resolveContact, generateAvatarUrl } from '../../utils/contactResolver';

interface IncomingCallModalProps {
  visible: boolean;
  callerPhone: string;
  onAccept: () => void;
  onDecline: () => void;
}

export default function IncomingCallModal({
  visible,
  callerPhone,
  onAccept,
  onDecline,
}: IncomingCallModalProps) {
  const { userPhone, userProfile } = useAuth();

  // Create user profiles map for contact resolution
  const createUserProfilesMap = () => {
    const profilesMap = new Map();
    if (userPhone && userProfile?.name) {
      profilesMap.set(userPhone, userProfile);
    }
    return profilesMap;
  };

  // Resolve caller contact information
  const callerInfo = resolveContact(callerPhone, {
    userProfiles: createUserProfilesMap(),
    fallbackToFormatted: true,
  });

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Image
            source={{ uri: generateAvatarUrl(callerInfo.name, callerInfo.avatarUrl) }}
            style={styles.avatar}
          />
          <Text style={styles.title}>📲 Eingehender Anruf</Text>
          <Text style={styles.callerName}>{callerInfo.name}</Text>
          {callerInfo.source === 'formatted_phone' && (
            <Text style={styles.phoneNumber}>{callerPhone}</Text>
          )}
          <View style={styles.buttons}>
            <TouchableOpacity onPress={onDecline} style={[styles.button, styles.decline]}>
              <Text style={styles.buttonText}>❌</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onAccept} style={[styles.button, styles.accept]}>
              <Text style={styles.buttonText}>📞</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '85%',
    backgroundColor: '#fff',
    padding: 32,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#f0f0f0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  callerName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
    textAlign: 'center',
  },
  phoneNumber: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
  },
  buttons: {
    flexDirection: 'row',
    gap: 40,
    justifyContent: 'center',
    width: '100%',
  },
  button: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  accept: {
    backgroundColor: '#00C851',
  },
  decline: {
    backgroundColor: '#FF4444',
  },
  buttonText: {
    fontSize: 28,
  },
});