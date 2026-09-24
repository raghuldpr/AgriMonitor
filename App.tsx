import React, { useState } from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { DashboardScreen } from './src/screens/Dashboard/DashboardScreen';
import { AlertsScreen } from './src/screens/Alerts/AlertsScreen';
import { FertilizerScreen } from './src/screens/Fertilizer/FertilizerScreen';
import { BleTestScreen } from './src/screens/BleTestScreen';

type Tab = 'dashboard' | 'alerts' | 'fertilizer' | 'ble_test';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  const renderScreen = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardScreen />;
      case 'alerts':
        return <AlertsScreen />;
      case 'fertilizer':
        return <FertilizerScreen />;
      case 'ble_test':
        return <BleTestScreen />;
      default:
        return <DashboardScreen />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1120" />

      {/* Screen Body */}
      <View style={styles.body}>{renderScreen()}</View>

      {/* Phase 4 Bottom Navigation Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'dashboard' && styles.tabItemActive]}
          onPress={() => setActiveTab('dashboard')}
        >
          <Text style={[styles.tabLabel, activeTab === 'dashboard' ? styles.tabLabelActive : styles.tabLabelInactive]}>
            🌾 Dashboard
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'alerts' && styles.tabItemActive]}
          onPress={() => setActiveTab('alerts')}
        >
          <Text style={[styles.tabLabel, activeTab === 'alerts' ? styles.tabLabelActive : styles.tabLabelInactive]}>
            ⚠ Alerts
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'fertilizer' && styles.tabItemActive]}
          onPress={() => setActiveTab('fertilizer')}
        >
          <Text style={[styles.tabLabel, activeTab === 'fertilizer' ? styles.tabLabelActive : styles.tabLabelInactive]}>
            🧪 Fertilizer
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'ble_test' && styles.tabItemActive]}
          onPress={() => setActiveTab('ble_test')}
        >
          <Text style={[styles.tabLabel, activeTab === 'ble_test' ? styles.tabLabelActive : styles.tabLabelInactive]}>
            🔧 BLE Test
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
    paddingHorizontal: 6,
    paddingBottom: 14,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 8,
  },
  tabItemActive: {
    backgroundColor: '#0F172A',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  tabLabelActive: {
    color: '#10B981',
  },
  tabLabelInactive: {
    color: '#94A3B8',
  },
});
