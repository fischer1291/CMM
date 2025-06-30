import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import NotificationService from '../services/notificationService';
import { useAuth } from '../contexts/AuthContext';

export default function PushTokenDebug() {
  const { userPhone } = useAuth();

  const handleRefreshToken = async () => {
    if (!userPhone) {
      Alert.alert('Error', 'No user phone number found');
      return;
    }

    Alert.alert(
      'Refresh Push Token',
      'This will force refresh your push token for the standalone app. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Refresh',
          onPress: async () => {
            const success = await NotificationService.refreshPushToken(userPhone);
            if (success) {
              Alert.alert('Success', 'Push token refreshed successfully! You should now receive notifications.');
            } else {
              Alert.alert('Error', 'Failed to refresh push token. Check console logs.');
            }
          }
        }
      ]
    );
  };

  const handleShowCurrentToken = () => {
    const token = NotificationService.getPushToken();
    if (token) {
      Alert.alert(
        'Current Push Token',
        `Token: ${token.substring(0, 30)}...\n\nLength: ${token.length} characters`,
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert('No Token', 'No push token currently registered');
    }
  };

  if (!userPhone) {
    return null; // Don't show debug component if not logged in
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔧 Push Token Debug</Text>
      <Text style={styles.subtitle}>Standalone App Notifications</Text>
      
      <TouchableOpacity style={styles.button} onPress={handleRefreshToken}>
        <Text style={styles.buttonText}>🔄 Refresh Push Token</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={handleShowCurrentToken}>
        <Text style={styles.buttonText}>👁️ Show Current Token</Text>
      </TouchableOpacity>
      
      <Text style={styles.note}>
        Use "Refresh Push Token" if you're not receiving notifications after switching from Expo Go to standalone app.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 20,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginVertical: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  note: {
    fontSize: 12,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});