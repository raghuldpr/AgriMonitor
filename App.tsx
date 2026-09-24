import React, { useState } from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { DashboardScreen } from './src/screens/Dashboard/DashboardScreen';
import { BleTestScreen } from './src/screens/BleTestScreen';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'ble_test'>('dashboard');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1120" />

      {/* Screen Body */}
      <View style={styles.body}>
        {activeTab === 'dashboard' ? <DashboardScreen /> : <BleTestScreen />}
      </View>

      {/* Phase 2 Bottom Tab Navigation */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'dashboard' && styles.tabItemActive]}
          onPress={() => setActiveTab('dashboard')}
        >
          <Text style={[styles.tabLabel, activeTab === 'dashboard' ? styles.tabLabelActive : styles.tabLabelInactive]}>
            🌾 Live Dashboard
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'ble_test' && styles.tabItemActive]}
          onPress={() => setActiveTab('ble_test')}
        >
          <Text style={[styles.tabLabel, activeTab === 'ble_test' ? styles.tabLabelActive : styles.tabLabelInactive]}>
            🔧 BLE / Pipeline Test
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1120',
  },
  body: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingVertical: 10,
    paddingHorizontal: 8,
    paddingBottom: 14,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  tabItemActive: {
    backgroundColor: '#0F172A',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  tabLabelActive: {
    color: '#10B981',
  },
  tabLabelInactive: {
    color: '#94A3B8',
  },
});
