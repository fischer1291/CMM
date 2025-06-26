import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MomentCardProps {
  // Add props as needed
}

export default function MomentCard(props: MomentCardProps) {
  return (
    <View style={styles.container}>
      <Text>Moment Card - Coming Soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    margin: 8,
  },
});