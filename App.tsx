import React from 'react';
import { SafeAreaView, StyleSheet, StatusBar } from 'react-native';
import { BleTestScreen } from './src/screens/BleTestScreen';

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1120" />
      <BleTestScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1120',
  },
});
