import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>📲 Eingehender Anruf</Text>
          <Text style={styles.subtext}>Von: {callerPhone}</Text>
          <View style={styles.buttons}>
            <TouchableOpacity onPress={onAccept} style={[styles.button, styles.accept]}>
              <Text style={styles.buttonText}>Annehmen</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onDecline} style={[styles.button, styles.decline]}>
              <Text style={styles.buttonText}>Ablehnen</Text>
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '80%',
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  subtext: {
    fontSize: 16,
    marginBottom: 24,
  },
  buttons: {
    flexDirection: 'row',
    gap: 16,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  accept: {
    backgroundColor: 'green',
  },
  decline: {
    backgroundColor: 'red',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});