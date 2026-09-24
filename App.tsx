import React, { useState } from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { DashboardScreen } from './src/screens/Dashboard/DashboardScreen';
import { AlertsScreen } from './src/screens/Alerts/AlertsScreen';
import { FertilizerScreen } from './src/screens/Fertilizer/FertilizerScreen';
import { AgricultureChatScreen } from './src/screens/Chat/AgricultureChatScreen';
import { NearbyScreen } from './src/screens/Nearby/NearbyScreen';
import { BleTestScreen } from './src/screens/BleTestScreen';

type Tab = 'dashboard' | 'alerts' | 'fertilizer' | 'assistant' | 'nearby' | 'ble_test';

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
      case 'assistant':
        return <AgricultureChatScreen />;
      case 'nearby':
        return <NearbyScreen />;
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

      {/* Phase 6 Bottom Navigation Bar */}
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
          style={[styles.tabItem, activeTab === 'assistant' && styles.tabItemActive]}
          onPress={() => setActiveTab('assistant')}
        >
          <Text style={[styles.tabLabel, activeTab === 'assistant' ? styles.tabLabelActive : styles.tabLabelInactive]}>
            🌱 Assistant
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'nearby' && styles.tabItemActive]}
          onPress={() => setActiveTab('nearby')}
        >
          <Text style={[styles.tabLabel, activeTab === 'nearby' ? styles.tabLabelActive : styles.tabLabelInactive]}>
            📍 Nearby
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'ble_test' && styles.tabItemActive]}
          onPress={() => setActiveTab('ble_test')}
        >
          <Text style={[styles.tabLabel, activeTab === 'ble_test' ? styles.tabLabelActive : styles.tabLabelInactive]}>
            🔧 BLE
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
    paddingVertical: 6,
    paddingHorizontal: 2,
    paddingBottom: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    borderRadius: 6,
  },
  tabItemActive: {
    backgroundColor: '#0F172A',
  },
  tabLabel: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  tabLabelActive: {
    color: '#10B981',
  },
  tabLabelInactive: {
    color: '#94A3B8',
  },
});
