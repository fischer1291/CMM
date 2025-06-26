import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MomentFeedProps {
  // Add props as needed
}

export default function MomentFeed(props: MomentFeedProps) {
  return (
    <View style={styles.container}>
      <Text>Moment Feed - Coming Soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});