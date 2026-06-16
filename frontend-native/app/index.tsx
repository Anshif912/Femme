import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

export default function Index() {
  console.log('[IndexScreen] Rendering loading index...');
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#f43f5e" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f12',
    justifyContent: 'center',
    alignItems: 'center',
  },
});