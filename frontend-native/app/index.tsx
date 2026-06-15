import React from 'react';
import { View, Text } from 'react-native';

export default function Index() {
  console.log('[FEMME DEBUG] app/index.tsx - Index Component Mounted');
  return (
    <View style={{ flex: 1, backgroundColor: 'blue', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold' }}>
        INDEX IS RENDERING (BLUE SCREEN)
      </Text>
    </View>
  );
}
