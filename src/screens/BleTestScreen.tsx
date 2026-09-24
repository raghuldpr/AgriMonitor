import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { BleManager } from '../services/ble/BleManager';
import { BlePermissionsService } from '../services/ble/blePermissions';
import {
  AgricultureTelemetry,
  BleConnectionStatus,
  DiscoveredBleDevice,
} from '../types/telemetry';

export const BleTestScreen: React.FC = () => {
  const ble = BleManager.getInstance();

  const [permissionsGranted, setPermissionsGranted] = useState<boolean>(false);
  const [bleStatus, setBleStatus] = useState<BleConnectionStatus>(ble.getConnectionStatus());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [devices, setDevices] = useState<DiscoveredBleDevice[]>(ble.getDiscoveredDevices());
  const [telemetry, setTelemetry] = useState<AgricultureTelemetry | null>(ble.getLatestTelemetry());
  const [rawPacketInput, setRawPacketInput] = useState<string>(
    '{"temperature": 28.5, "humidity": 65, "soilMoisture": 45, "tds": 580}'
  );
  const [packetFeedback, setPacketFeedback] = useState<string | null>(null);

  // Check permissions & subscribe on mount
  useEffect(() => {
    checkPermissionsStatus();

    const unsubStatus = ble.subscribeStatus((status, err) => {
      setBleStatus(status);
      setErrorMessage(err || null);
    });

    const unsubDevices = ble.subscribeDiscoveredDevices((list) => {
      setDevices(list);
    });

    const unsubTelemetry = ble.subscribeTelemetry((data) => {
      setTelemetry(data);
    });

    return () => {
      unsubStatus();
      unsubDevices();
      unsubTelemetry();
    };
  }, []);

  const checkPermissionsStatus = async () => {
    const granted = await BlePermissionsService.checkPermissions();
    setPermissionsGranted(granted);
  };

  const handleRequestPermissions = async () => {
    const result = await BlePermissionsService.requestPermissions();
    setPermissionsGranted(result.granted);
    if (!result.granted && result.message) {
      setErrorMessage(result.message);
    } else {
      setErrorMessage(null);
    }
  };

  const handleStartScan = async () => {
    setErrorMessage(null);
    await ble.startScan();
  };

  const handleStopScan = () => {
    ble.stopScan();
  };

  const handleConnect = async (deviceId: string) => {
    setErrorMessage(null);
    await ble.connect(deviceId);
  };

  const handleDisconnect = async () => {
    await ble.disconnect();
  };

  const handleTestPacketInject = () => {
    const success = ble.injectRawPacket(rawPacketInput);
    if (success) {
      setPacketFeedback('✓ Valid JSON packet parsed and dispatched!');
    } else {
      setPacketFeedback('✗ Rejected! Invalid JSON syntax, non-numeric values, or out-of-bounds bounds.');
    }
    setTimeout(() => setPacketFeedback(null), 4000);
  };

  const getStatusColor = () => {
    switch (bleStatus) {
      case 'CONNECTED':
        return '#10B981'; // Green
      case 'CONNECTING':
      case 'RECONNECTING':
      case 'SCANNING':
        return '#F59E0B'; // Amber
      case 'ERROR':
        return '#EF4444'; // Red
      default:
        return '#94A3B8'; // Slate
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.section}>
        <Text style={styles.headerTitle}>AgriMonitor BLE Test</Text>
        <Text style={styles.headerSubtitle}>Phase 1 — ESP32 Telemetry Pipeline Verification</Text>
      </View>

      {/* Permission Section */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Android BLE Permissions</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Permission Status:</Text>
          <Text style={[styles.badge, { color: permissionsGranted ? '#10B981' : '#EF4444' }]}>
            {permissionsGranted ? 'GRANTED' : 'DENIED / NOT REQUESTED'}
          </Text>
        </View>
        {!permissionsGranted && (
          <TouchableOpacity style={styles.btnPrimary} onPress={handleRequestPermissions}>
            <Text style={styles.btnText}>Request Android BLE Permissions</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* BLE Scanner Section */}
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.cardTitle}>Device Scanner</Text>
          {bleStatus === 'SCANNING' ? (
            <TouchableOpacity style={styles.btnSmallDanger} onPress={handleStopScan}>
              <Text style={styles.btnSmallText}>Stop Scan</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.btnSmallPrimary, bleStatus === 'CONNECTED' && styles.btnDisabled]}
              onPress={handleStartScan}
              disabled={bleStatus === 'CONNECTED'}
            >
              <Text style={styles.btnSmallText}>Start Scan</Text>
            </TouchableOpacity>
          )}
        </View>

        {bleStatus === 'SCANNING' && (
          <View style={styles.inlineLoader}>
            <ActivityIndicator size="small" color="#38BDF8" />
            <Text style={styles.loaderText}>Scanning for nearby BLE peripherals...</Text>
          </View>
        )}

        <Text style={[styles.subLabel, { marginTop: 12 }]}>Found Devices ({devices.length}):</Text>
        {devices.length === 0 ? (
          <Text style={styles.emptyText}>No devices discovered yet. Tap "Start Scan" to search.</Text>
        ) : (
          devices.map((device) => (
            <View key={device.id} style={styles.deviceRow}>
              <View style={styles.deviceInfo}>
                <Text style={styles.deviceName}>{device.name || 'Unknown Device'}</Text>
                <Text style={styles.deviceId}>{device.id} {device.rssi ? `(${device.rssi} dBm)` : ''}</Text>
              </View>
              {bleStatus === 'CONNECTED' ? (
                <TouchableOpacity style={styles.btnSmallDanger} onPress={handleDisconnect}>
                  <Text style={styles.btnSmallText}>Disconnect</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.btnSmallPrimary}
                  onPress={() => handleConnect(device.id)}
                  disabled={bleStatus === 'CONNECTING'}
                >
                  <Text style={styles.btnSmallText}>Connect</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </View>

      {/* Connection State Section */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Connection State</Text>
        <View style={styles.row}>
          <Text style={styles.label}>GATT Status:</Text>
          <Text style={[styles.statusBadge, { color: getStatusColor() }]}>
            ● {bleStatus}
          </Text>
        </View>
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        {bleStatus === 'CONNECTED' && (
          <TouchableOpacity style={[styles.btnDanger, { marginTop: 12 }]} onPress={handleDisconnect}>
            <Text style={styles.btnText}>Disconnect ESP32</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Telemetry Output Section */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Latest Telemetry (SensorParser Output)</Text>
        {telemetry ? (
          <View style={styles.telemetryGrid}>
            <View style={styles.telemetryBox}>
              <Text style={styles.telemetryLabel}>Temperature</Text>
              <Text style={[styles.telemetryValue, { color: '#F97316' }]}>
                {telemetry.temperature} <Text style={styles.unit}>°C</Text>
              </Text>
            </View>

            <View style={styles.telemetryBox}>
              <Text style={styles.telemetryLabel}>Humidity</Text>
              <Text style={[styles.telemetryValue, { color: '#38BDF8' }]}>
                {telemetry.humidity} <Text style={styles.unit}>%</Text>
              </Text>
            </View>

            <View style={styles.telemetryBox}>
              <Text style={styles.telemetryLabel}>Soil Moisture</Text>
              <Text style={[styles.telemetryValue, { color: '#10B981' }]}>
                {telemetry.soilMoisture} <Text style={styles.unit}>%</Text>
              </Text>
            </View>

            <View style={styles.telemetryBox}>
              <Text style={styles.telemetryLabel}>TDS (Conductivity)</Text>
              <Text style={[styles.telemetryValue, { color: '#A855F7' }]}>
                {telemetry.tds} <Text style={styles.unit}>ppm</Text>
              </Text>
            </View>

            <View style={[styles.telemetryBox, { width: '100%' }]}>
              <Text style={styles.telemetryLabel}>Last Received</Text>
              <Text style={styles.timestampText}>
                {new Date(telemetry.timestamp).toLocaleTimeString()} ({Math.round((Date.now() - telemetry.timestamp) / 1000)}s ago)
              </Text>
            </View>
          </View>
        ) : (
          <Text style={styles.emptyText}>No telemetry packet received yet.</Text>
        )}
      </View>

      {/* Raw JSON Packet Injector / Validator Tool */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Test Packet Injector / Validator</Text>
        <Text style={styles.subLabel}>Verify SensorParser JSON validation & technical bounds:</Text>
        <TextInput
          style={styles.textInput}
          value={rawPacketInput}
          onChangeText={setRawPacketInput}
          multiline
          placeholder='{"temperature": 28.5, "humidity": 65, "soilMoisture": 45, "tds": 580}'
          placeholderTextColor="#64748B"
        />
        <TouchableOpacity style={styles.btnSecondary} onPress={handleTestPacketInject}>
          <Text style={styles.btnText}>Parse & Inject Packet</Text>
        </TouchableOpacity>
        {packetFeedback ? (
          <Text style={[styles.feedbackText, { color: packetFeedback.startsWith('✓') ? '#10B981' : '#EF4444' }]}>
            {packetFeedback}
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1120',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    color: '#94A3B8',
  },
  subLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 8,
  },
  badge: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusBadge: {
    fontSize: 14,
    fontWeight: '800',
  },
  btnPrimary: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  btnSecondary: {
    backgroundColor: '#0EA5E9',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDanger: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  btnSmallPrimary: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  btnSmallDanger: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  btnSmallText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  inlineLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  loaderText: {
    fontSize: 12,
    color: '#38BDF8',
  },
  emptyText: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
    marginTop: 4,
  },
  deviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  deviceId: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 8,
  },
  telemetryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 6,
  },
  telemetryBox: {
    width: '48%',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  telemetryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 4,
  },
  telemetryValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  unit: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  timestampText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  textInput: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    color: '#F8FAFC',
    padding: 10,
    fontSize: 12,
    fontFamily: 'monospace',
    minHeight: 60,
  },
  feedbackText: {
    fontSize: 12,
    marginTop: 8,
    fontWeight: '600',
  },
});
