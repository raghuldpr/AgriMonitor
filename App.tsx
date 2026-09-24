import React, { useState } from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { THEME } from './src/constants/theme';
import { DashboardScreen } from './src/screens/Dashboard/DashboardScreen';
import { AssistantScreen } from './src/screens/Assistant/AssistantScreen';
import { FertilizerScreen } from './src/screens/Fertilizer/FertilizerScreen';
import { NearbyScreen } from './src/screens/Nearby/NearbyScreen';
import { AlertsScreen } from './src/screens/Alerts/AlertsScreen';

type Tab = 'dashboard' | 'assistant' | 'fertilizer' | 'nearby' | 'alerts';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  const renderScreen = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardScreen />;
      case 'assistant':
        return <AssistantScreen />;
      case 'fertilizer':
        return <FertilizerScreen />;
      case 'nearby':
        return <NearbyScreen />;
      case 'alerts':
        return <AlertsScreen />;
      default:
        return <DashboardScreen />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.colors.background} />
      <View style={styles.body}>{renderScreen()}</View>

      {/* Bottom Navigation Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('dashboard')}
        >
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'dashboard' ? styles.tabLabelActive : styles.tabLabelInactive,
            ]}
          >
            Dashboard
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('assistant')}
        >
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'assistant' ? styles.tabLabelActive : styles.tabLabelInactive,
            ]}
          >
            AI Advisor
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('fertilizer')}
        >
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'fertilizer' ? styles.tabLabelActive : styles.tabLabelInactive,
            ]}
          >
            Fertilizer
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('nearby')}
        >
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'nearby' ? styles.tabLabelActive : styles.tabLabelInactive,
            ]}
          >
            Nearby
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('alerts')}
        >
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'alerts' ? styles.tabLabelActive : styles.tabLabelInactive,
            ]}
          >
            Alerts
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  body: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.surface,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    paddingVertical: 12,
    paddingBottom: 16,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: THEME.colors.primary,
  },
  tabLabelInactive: {
    color: THEME.colors.textMuted,
  },
});
