import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useTelemetry } from '../../hooks/useTelemetry';
import { useAlerts } from '../../hooks/useAlerts';

export const DashboardScreen: React.FC = () => {
  const {
    telemetry,
    connectionStatus,
    deviceStatus,
    errorMessage,
    discoveredDevices,
    lastUpdatedFormatted,
    secondsSinceLastUpdate,
    isStale,
    connect,
    disconnect,
    startScan,
    stopScan,
  } = useTelemetry();

  const { evaluation, activeAlerts } = useAlerts();
  const [isScannerModalVisible, setIsScannerModalVisible] = useState(false);

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case 'CONNECTED':
        return {
          text: `● ${deviceStatus.deviceName || 'Connected'}`,
          color: '#10B981',
          bg: 'rgba(16, 185, 129, 0.15)',
          border: 'rgba(16, 185, 129, 0.3)',
        };
      case 'CONNECTING':
        return {
          text: '○ Connecting...',
          color: '#38BDF8',
          bg: 'rgba(56, 189, 248, 0.15)',
          border: 'rgba(56, 189, 248, 0.3)',
        };
      case 'RECONNECTING':
        return {
          text: '⚠ Reconnecting...',
          color: '#F59E0B',
          bg: 'rgba(245, 158, 11, 0.15)',
          border: 'rgba(245, 158, 11, 0.3)',
        };
      case 'SCANNING':
        return {
          text: '🔍 Scanning...',
          color: '#A855F7',
          bg: 'rgba(168, 85, 247, 0.15)',
          border: 'rgba(168, 85, 247, 0.3)',
        };
      case 'ERROR':
        return {
          text: '✕ Error',
          color: '#EF4444',
          bg: 'rgba(239, 68, 68, 0.15)',
          border: 'rgba(239, 68, 68, 0.3)',
        };
      default:
        return {
          text: '○ Disconnected',
          color: '#94A3B8',
          bg: 'rgba(148, 163, 184, 0.12)',
          border: 'rgba(148, 163, 184, 0.25)',
        };
    }
  };

  const getSoilMoistureBadge = (val: number) => {
    if (val < 20) return { label: 'VERY LOW / DROUGHT', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' };
    if (val < 30) return { label: 'LOW / DRY', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' };
    if (val <= 70) return { label: 'OPTIMAL (40–70%)', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' };
    if (val <= 85) return { label: 'HIGH MOISTURE', color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.15)' };
    return { label: 'SATURATED / WET', color: '#EC4899', bg: 'rgba(236, 72, 153, 0.15)' };
  };

  const getTdsBadge = (val: number) => {
    if (val < 200) return { label: 'LOW MINERALS', color: '#38BDF8' };
    if (val <= 1200) return { label: 'BALANCED SOLIDS', color: '#10B981' };
    return { label: 'HIGH DISSOLVED SOLIDS', color: '#F59E0B' };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NORMAL':
        return '#10B981';
      case 'HIGH':
      case 'LOW':
        return '#F59E0B';
      case 'VERY_HIGH':
      case 'VERY_LOW':
      case 'SATURATED':
        return '#EF4444';
      default:
        return '#94A3B8';
    }
  };

  const handleOpenScanner = async () => {
    setIsScannerModalVisible(true);
    await startScan();
  };

  const handleSelectDevice = async (deviceId: string) => {
    setIsScannerModalVisible(false);
    stopScan();
    await connect(deviceId);
  };

  const badge = getStatusBadge();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* App Header & Real-time BLE Link Bar */}
      <View style={styles.header}>
        <View>
          <Text style={styles.appTitle}>AgriMonitor</Text>
          <Text style={styles.subTitle}>Live ESP32 Telemetry & Crop Insights</Text>
        </View>

        <TouchableOpacity
          style={[styles.statusBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}
          onPress={connectionStatus === 'CONNECTED' ? disconnect : handleOpenScanner}
        >
          <Text style={[styles.statusBadgeText, { color: badge.color }]}>{badge.text}</Text>
        </TouchableOpacity>
      </View>

      {/* Connection & Update Timestamp Ribbon */}
      <View style={styles.updateRibbon}>
        <View style={styles.updateLeft}>
          <Text style={styles.updateLabel}>LAST UPDATED</Text>
          <Text style={styles.updateValue}>
            {lastUpdatedFormatted}{' '}
            {secondsSinceLastUpdate !== null && telemetry ? `(${secondsSinceLastUpdate}s ago)` : ''}
          </Text>
        </View>

        {isStale && (
          <View style={styles.staleBadge}>
            <Text style={styles.staleText}>⚠️ Stale Data</Text>
          </View>
        )}

        {connectionStatus !== 'CONNECTED' && (
          <TouchableOpacity style={styles.connectButton} onPress={handleOpenScanner}>
            <Text style={styles.connectButtonText}>Scan & Connect</Text>
          </TouchableOpacity>
        )}
      </View>

      {errorMessage ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{errorMessage}</Text>
        </View>
      ) : null}

      {/* Main Sensor Grid */}
      {!telemetry ? (
        <View style={styles.noDataCard}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.noDataTitle}>Waiting for sensor data...</Text>
          <Text style={styles.noDataDesc}>
            {connectionStatus === 'CONNECTED'
              ? 'Connected to ESP32 node. Receiving initial telemetry packet...'
              : 'Connect your ESP32 Agriculture Node to view live sensor readings.'}
          </Text>
          {connectionStatus !== 'CONNECTED' && (
            <TouchableOpacity style={styles.noDataBtn} onPress={handleOpenScanner}>
              <Text style={styles.noDataBtnText}>Connect ESP32 Sensor</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <>
          <View style={styles.grid}>
            {/* 1. SOIL MOISTURE (Primary Agriculture Metric) */}
            <View style={[styles.card, styles.cardFull]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>SOIL MOISTURE</Text>
                <View
                  style={[
                    styles.paramBadge,
                    { backgroundColor: getSoilMoistureBadge(telemetry.soilMoisture).bg },
                  ]}
                >
                  <Text
                    style={[
                      styles.paramBadgeText,
                      { color: getSoilMoistureBadge(telemetry.soilMoisture).color },
                    ]}
                  >
                    {getSoilMoistureBadge(telemetry.soilMoisture).label}
                  </Text>
                </View>
              </View>

              <View style={styles.bigMetricRow}>
                <Text style={[styles.bigMetricValue, { color: '#10B981' }]}>
                  {telemetry.soilMoisture}
                  <Text style={styles.bigMetricUnit}>%</Text>
                </Text>
                <Text style={styles.sensorStatusText}>
                  {connectionStatus === 'CONNECTED' ? 'Live Reading' : 'Last Valid Reading'}
                </Text>
              </View>

              {/* Visual Progress Bar */}
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(100, Math.max(0, telemetry.soilMoisture))}%`,
                      backgroundColor: getSoilMoistureBadge(telemetry.soilMoisture).color,
                    },
                  ]}
                />
              </View>
              <View style={styles.progressLabels}>
                <Text style={styles.progressLabel}>0% (Dry)</Text>
                <Text style={styles.progressLabel}>Optimal (30–70%)</Text>
                <Text style={styles.progressLabel}>100% (Wet)</Text>
              </View>
            </View>

            {/* 2. TEMPERATURE */}
            <View style={styles.cardHalf}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>TEMPERATURE</Text>
              </View>
              <Text style={[styles.metricValue, { color: '#F97316' }]}>
                {telemetry.temperature}
                <Text style={styles.metricUnit}> °C</Text>
              </Text>
              <Text style={styles.metricSub}>Ambient Air (DHT11)</Text>
            </View>

            {/* 3. HUMIDITY */}
            <View style={styles.cardHalf}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>HUMIDITY</Text>
              </View>
              <Text style={[styles.metricValue, { color: '#38BDF8' }]}>
                {telemetry.humidity}
                <Text style={styles.metricUnit}> %</Text>
              </Text>
              <Text style={styles.metricSub}>Relative Air Humidity</Text>
            </View>

            {/* 4. TDS (Mineral Conductivity) */}
            <View style={[styles.card, styles.cardFull]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>TDS (DISSOLVED SOLIDS)</Text>
                <Text style={[styles.paramBadgeText, { color: getTdsBadge(telemetry.tds).color }]}>
                  {getTdsBadge(telemetry.tds).label}
                </Text>
              </View>
              <View style={styles.bigMetricRow}>
                <Text style={[styles.bigMetricValue, { color: '#A855F7' }]}>
                  {telemetry.tds}
                  <Text style={styles.bigMetricUnit}> ppm</Text>
                </Text>
                <Text style={styles.metricSub}>Solution Mineral Index</Text>
              </View>
              <Text style={styles.tdsNote}>
                * TDS measures total dissolved mineral conductivity. Atmospheric temp compensation is used.
              </Text>
            </View>
          </View>

          {/* Current Conditions Summary Table */}
          {evaluation && (
            <View style={styles.conditionsCard}>
              <Text style={styles.sectionHeading}>CURRENT CONDITIONS SUMMARY</Text>
              <View style={styles.conditionsList}>
                <View style={styles.conditionRow}>
                  <Text style={styles.condIconLabel}>🌡 Temperature</Text>
                  <Text style={[styles.condStatus, { color: getStatusColor(evaluation.temperature.status) }]}>
                    {evaluation.temperature.status}
                  </Text>
                </View>

                <View style={styles.conditionRow}>
                  <Text style={styles.condIconLabel}>💧 Soil Moisture</Text>
                  <Text style={[styles.condStatus, { color: getStatusColor(evaluation.soilMoisture.status) }]}>
                    {evaluation.soilMoisture.status}
                  </Text>
                </View>

                <View style={styles.conditionRow}>
                  <Text style={styles.condIconLabel}>💦 TDS (Solids)</Text>
                  <Text style={[styles.condStatus, { color: getStatusColor(evaluation.tds.status) }]}>
                    {evaluation.tds.status}
                  </Text>
                </View>

                <View style={styles.conditionRow}>
                  <Text style={styles.condIconLabel}>☁ Relative Humidity</Text>
                  <Text style={[styles.condStatus, { color: getStatusColor(evaluation.humidity.status) }]}>
                    {evaluation.humidity.status}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Active Alert Banner */}
          {activeAlerts.length > 0 && (
            <View style={styles.alertBannerCard}>
              <View style={styles.alertBannerHeader}>
                <Text style={styles.alertBannerTitle}>⚠ Active Agricultural Alert</Text>
                <Text style={styles.alertCountBadge}>{activeAlerts.length} Active</Text>
              </View>
              {activeAlerts.map((alt) => (
                <View key={alt.id} style={styles.alertItem}>
                  <Text style={styles.alertItemParam}>
                    {alt.parameter === 'soilMoisture' ? 'Soil Moisture' : alt.parameter.toUpperCase()}
                  </Text>
                  <Text style={styles.alertItemMsg}>{alt.message}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Agronomic Insights Card */}
          {evaluation && evaluation.insights.length > 0 && (
            <View style={styles.insightsCard}>
              <View style={styles.insightsHeader}>
                <Text style={styles.insightsIcon}>🌱</Text>
                <Text style={styles.insightsTitle}>Agronomic Insights</Text>
              </View>
              {evaluation.insights.slice(0, 2).map((ins) => (
                <View key={ins.id} style={styles.insightItem}>
                  <Text style={styles.insightTitle}>{ins.title}</Text>
                  <Text style={styles.insightMsg}>{ins.message}</Text>
                  <Text style={styles.insightRec}>💡 {ins.recommendation}</Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}

      {/* Hardware Node Card */}
      <View style={styles.hwSection}>
        <Text style={styles.hwSectionTitle}>CONNECTED HARDWARE NODE</Text>
        <View style={styles.hwCard}>
          <View style={styles.hwRow}>
            <Text style={styles.hwLabel}>Device Model:</Text>
            <Text style={styles.hwValue}>{deviceStatus.deviceName || 'AgriMonitor-ESP32'}</Text>
          </View>
          <View style={styles.hwRow}>
            <Text style={styles.hwLabel}>Sensor Suite:</Text>
            <Text style={styles.hwValue}>DHT11, Analog Soil, Analog TDS</Text>
          </View>
          <View style={styles.hwRow}>
            <Text style={styles.hwLabel}>BLE GATT Service:</Text>
            <Text style={styles.hwValueMonospace}>189a0001-...-0a12</Text>
          </View>
        </View>
      </View>

      {/* BLE Scanner Modal */}
      <Modal visible={isScannerModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Discover BLE Devices</Text>
              <TouchableOpacity onPress={() => setIsScannerModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {connectionStatus === 'SCANNING' && (
                <View style={styles.modalScanningIndicator}>
                  <ActivityIndicator size="small" color="#10B981" />
                  <Text style={styles.modalScanningText}>Scanning for AgriMonitor ESP32...</Text>
                </View>
              )}

              {discoveredDevices.length === 0 ? (
                <Text style={styles.modalEmptyText}>
                  No devices discovered yet. Ensure your ESP32 is powered on and advertising.
                </Text>
              ) : (
                discoveredDevices.map((dev) => (
                  <TouchableOpacity
                    key={dev.id}
                    style={styles.modalDeviceItem}
                    onPress={() => handleSelectDevice(dev.id)}
                  >
                    <View>
                      <Text style={styles.modalDeviceName}>{dev.name || 'Unknown Device'}</Text>
                      <Text style={styles.modalDeviceId}>
                        {dev.id} {dev.rssi ? `(${dev.rssi} dBm)` : ''}
                      </Text>
                    </View>
                    <Text style={styles.modalConnectLabel}>Connect →</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.modalRescanBtn} onPress={startScan}>
                <Text style={styles.modalRescanBtnText}>Rescan</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsScannerModalVisible(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.5,
  },
  subTitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  updateRibbon: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  updateLeft: {
    flex: 1,
  },
  updateLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  updateValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E2E8F0',
    marginTop: 2,
  },
  staleBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginRight: 8,
  },
  staleText: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: '600',
  },
  connectButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  connectButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  errorBannerText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
  },
  noDataCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    marginVertical: 20,
  },
  noDataTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
    marginTop: 14,
  },
  noDataDesc: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  noDataBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  noDataBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardFull: {
    width: '100%',
  },
  cardHalf: {
    width: '48%',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  paramBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  paramBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  bigMetricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  bigMetricValue: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
  },
  bigMetricUnit: {
    fontSize: 18,
    fontWeight: '600',
    color: '#94A3B8',
  },
  sensorStatusText: {
    fontSize: 11,
    color: '#64748B',
  },
  metricValue: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 2,
  },
  metricUnit: {
    fontSize: 15,
    fontWeight: '600',
    color: '#94A3B8',
  },
  metricSub: {
    fontSize: 11,
    color: '#64748B',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#0F172A',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  progressLabel: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '600',
  },
  tdsNote: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 6,
    lineHeight: 14,
  },
  sectionHeading: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  conditionsCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  conditionsList: {
    gap: 8,
  },
  conditionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#0F172A',
  },
  condIconLabel: {
    fontSize: 13,
    color: '#F8FAFC',
    fontWeight: '600',
  },
  condStatus: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  alertBannerCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#F59E0B',
  },
  alertBannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F59E0B',
  },
  alertCountBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  alertItem: {
    marginBottom: 6,
  },
  alertItemParam: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  alertItemMsg: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 16,
  },
  insightsCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  insightsIcon: {
    fontSize: 16,
  },
  insightsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10B981',
  },
  insightItem: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  insightTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 2,
  },
  insightMsg: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 4,
  },
  insightRec: {
    fontSize: 11,
    color: '#38BDF8',
    lineHeight: 15,
  },
  hwSection: {
    marginTop: 4,
    marginBottom: 16,
  },
  hwSectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  hwCard: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  hwRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  hwLabel: {
    fontSize: 11,
    color: '#94A3B8',
  },
  hwValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  hwValueMonospace: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#38BDF8',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '75%',
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  modalClose: {
    fontSize: 18,
    color: '#94A3B8',
    padding: 4,
  },
  modalBody: {
    marginBottom: 16,
  },
  modalScanningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  modalScanningText: {
    fontSize: 12,
    color: '#10B981',
  },
  modalEmptyText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    paddingVertical: 20,
    lineHeight: 18,
  },
  modalDeviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalDeviceName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  modalDeviceId: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  modalConnectLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
  },
  modalRescanBtn: {
    flex: 1,
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalRescanBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#334155',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    color: '#E2E8F0',
    fontWeight: '600',
    fontSize: 13,
  },
});
