import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { THEME } from '../../constants/theme';
import { BleManager } from '../../services/ble/BleManager';
import { AgricultureSensorData, BleConnectionStatus } from '../../types/telemetry';

export const DashboardScreen: React.FC = () => {
  const ble = BleManager.getInstance();
  const [data, setData] = useState<AgricultureSensorData>(ble.getLastData());
  const [bleStatus, setBleStatus] = useState<BleConnectionStatus>(ble.getConnectionStatus());
  const [deviceName, setDeviceName] = useState<string | null>(ble.getConnectedDeviceName());

  useEffect(() => {
    const unsubData = ble.subscribeSensorData((latest) => setData(latest));
    const unsubBle = ble.subscribeConnectionState((status, name) => {
      setBleStatus(status);
      setDeviceName(name);
    });

    return () => {
      unsubData();
      unsubBle();
    };
  }, []);

  const handleToggleConnection = () => {
    if (bleStatus === 'CONNECTED') {
      ble.disconnect();
    } else {
      ble.connect();
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header & BLE Status */}
      <View style={styles.header}>
        <View>
          <Text style={styles.appTitle}>AgriMonitor</Text>
          <Text style={styles.subtitle}>ESP32 Agriculture Node</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.connectBadge,
            { backgroundColor: bleStatus === 'CONNECTED' ? THEME.colors.optimalBg : THEME.colors.warningBg },
          ]}
          onPress={handleToggleConnection}
        >
          <Text
            style={[
              styles.connectBadgeText,
              { color: bleStatus === 'CONNECTED' ? THEME.colors.optimal : THEME.colors.warning },
            ]}
          >
            {bleStatus === 'CONNECTED' ? `● ${deviceName || 'Connected'}` : '○ Connect BLE'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sensor Metric Grid */}
      <View style={styles.grid}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>SOIL MOISTURE</Text>
          <Text style={[styles.cardValue, { color: THEME.colors.water }]}>{data.soilMoisture}%</Text>
          <Text style={styles.cardHint}>Optimal Range: 40-70%</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>TEMPERATURE</Text>
          <Text style={[styles.cardValue, { color: THEME.colors.temperature }]}>{data.temperature}°C</Text>
          <Text style={styles.cardHint}>Ambient Air</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>HUMIDITY</Text>
          <Text style={[styles.cardValue, { color: THEME.colors.moderate }]}>{data.humidity}%</Text>
          <Text style={styles.cardHint}>Relative Air Humidity</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>TDS (DISSOLVED SOLIDS)</Text>
          <Text style={[styles.cardValue, { color: THEME.colors.tds }]}>{data.tds} <Text style={styles.unit}>ppm</Text></Text>
          <Text style={styles.cardHint}>Conductivity / Mineral Index</Text>
        </View>
      </View>

      {/* Manual pH & Battery Summary */}
      <View style={styles.metaRow}>
        <View style={styles.metaCard}>
          <Text style={styles.metaLabel}>SOIL pH (MANUAL)</Text>
          <Text style={[styles.metaValue, { color: THEME.colors.ph }]}>{data.ph?.toFixed(1) || '6.5'}</Text>
        </View>
        <View style={styles.metaCard}>
          <Text style={styles.metaLabel}>NODE BATTERY</Text>
          <Text style={[styles.metaValue, { color: THEME.colors.primary }]}>{data.battery || 88}%</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  content: {
    padding: THEME.spacing.lg,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.xl,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  connectBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.full,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  connectBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: THEME.spacing.md,
    marginBottom: THEME.spacing.lg,
  },
  card: {
    width: '48%',
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  cardValue: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 4,
  },
  unit: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  cardHint: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    gap: THEME.spacing.md,
  },
  metaCard: {
    flex: 1,
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 18,
    fontWeight: '700',
  },
});
