import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useAlerts } from '../../hooks/useAlerts';
import { AgricultureAlert, AlertSeverity } from '../../services/alerts/alertTypes';

export const AlertsScreen: React.FC = () => {
  const { evaluation, activeAlerts, alertHistory, thresholds, clearAlertHistory } = useAlerts();

  const getSeverityBadge = (severity: AlertSeverity, isRecovery?: boolean) => {
    if (isRecovery) {
      return { label: '✓ RECOVERED', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' };
    }
    switch (severity) {
      case 'CRITICAL':
        return { label: '⚠ CRITICAL', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' };
      case 'WARNING':
        return { label: '⚠ WARNING', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' };
      default:
        return { label: 'ℹ INFO', color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.15)' };
    }
  };

  const getParamIcon = (param: string) => {
    switch (param) {
      case 'temperature':
        return '🌡';
      case 'soilMoisture':
        return '💧';
      case 'tds':
        return '💦';
      case 'humidity':
        return '☁';
      default:
        return '🌱';
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Screen Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Agriculture Alerts</Text>
          <Text style={styles.subtitle}>Deterministic Rule Engine & History Log</Text>
        </View>

        {alertHistory.length > 0 && (
          <TouchableOpacity style={styles.clearBtn} onPress={clearAlertHistory}>
            <Text style={styles.clearBtnText}>Clear Log</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Active Alerts Banner */}
      {activeAlerts.length > 0 ? (
        <View style={styles.activeAlertsSection}>
          <Text style={styles.sectionHeading}>ACTIVE THRESHOLD ALERTS ({activeAlerts.length})</Text>
          {activeAlerts.map((alert) => {
            const badge = getSeverityBadge(alert.severity);
            return (
              <View key={alert.id} style={[styles.activeAlertCard, { borderColor: badge.color }]}>
                <View style={styles.alertCardHeader}>
                  <View style={styles.iconTitleRow}>
                    <Text style={styles.paramIcon}>{getParamIcon(alert.parameter)}</Text>
                    <Text style={styles.alertParamName}>
                      {alert.parameter === 'soilMoisture'
                        ? 'Soil Moisture'
                        : alert.parameter.toUpperCase()}
                    </Text>
                  </View>
                  <View style={[styles.severityBadge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.severityBadgeText, { color: badge.color }]}>
                      {badge.label}
                    </Text>
                  </View>
                </View>

                <Text style={styles.alertMessage}>{alert.message}</Text>
                <Text style={styles.alertTimestamp}>
                  Triggered: {new Date(alert.timestamp).toLocaleTimeString()}
                </Text>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.emptyActiveCard}>
          <Text style={styles.emptyActiveIcon}>✓</Text>
          <Text style={styles.emptyActiveTitle}>No Active Alerts</Text>
          <Text style={styles.emptyActiveDesc}>
            All monitored sensor conditions are currently within the configured prototype ranges.
          </Text>
        </View>
      )}

      {/* Chronological Alert History */}
      <View style={styles.historySection}>
        <Text style={styles.sectionHeading}>
          EVENT & RECOVERY HISTORY ({alertHistory.length})
        </Text>

        {alertHistory.length === 0 ? (
          <View style={styles.emptyHistoryCard}>
            <Text style={styles.emptyHistoryText}>
              No alert or recovery events recorded yet.
            </Text>
          </View>
        ) : (
          alertHistory.map((item: AgricultureAlert) => {
            const badge = getSeverityBadge(item.severity, item.isRecovery);
            return (
              <View
                key={item.id}
                style={[
                  styles.historyCard,
                  item.isRecovery && styles.historyCardRecovery,
                ]}
              >
                <View style={styles.alertCardHeader}>
                  <View style={styles.iconTitleRow}>
                    <Text style={styles.paramIcon}>{getParamIcon(item.parameter)}</Text>
                    <Text style={styles.historyParam}>
                      {item.parameter === 'soilMoisture'
                        ? 'Soil Moisture'
                        : item.parameter.charAt(0).toUpperCase() + item.parameter.slice(1)}
                    </Text>
                  </View>

                  <View style={[styles.severityBadge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.severityBadgeText, { color: badge.color }]}>
                      {badge.label}
                    </Text>
                  </View>
                </View>

                <Text style={styles.historyMessage}>{item.message}</Text>

                <View style={styles.historyFooter}>
                  <Text style={styles.historyTimestamp}>
                    {new Date(item.timestamp).toLocaleDateString()} at{' '}
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </Text>
                  <Text style={styles.historyValueBadge}>
                    Reading: {item.value}
                    {item.parameter === 'temperature'
                      ? '°C'
                      : item.parameter === 'tds'
                      ? ' ppm'
                      : '%'}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* Configured Thresholds Reference */}
      <View style={styles.thresholdsRefCard}>
        <Text style={styles.thresholdsTitle}>CONFIGURED PROTOTYPE THRESHOLDS</Text>
        <Text style={styles.thresholdsDisclaimer}>
          * Note: Thresholds are prototype defaults and vary by crop, soil, and season.
        </Text>

        <View style={styles.threshRow}>
          <Text style={styles.threshLabel}>Soil Moisture:</Text>
          <Text style={styles.threshVal}>
            Very Low: &lt;{thresholds.soilMoisture.veryLow}% | Low: &lt;{thresholds.soilMoisture.low}% | Optimal: 30–70% | Sat: &gt;{thresholds.soilMoisture.saturated}%
          </Text>
        </View>

        <View style={styles.threshRow}>
          <Text style={styles.threshLabel}>Temperature:</Text>
          <Text style={styles.threshVal}>
            Low: &lt;{thresholds.temperature.low}°C | Optimal: 15–35°C | High: &gt;{thresholds.temperature.high}°C
          </Text>
        </View>

        <View style={styles.threshRow}>
          <Text style={styles.threshLabel}>TDS (Solids):</Text>
          <Text style={styles.threshVal}>
            Low: &lt;{thresholds.tds.low} ppm | Optimal: 200–1200 ppm | High: &gt;{thresholds.tds.high} ppm
          </Text>
        </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  clearBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  clearBtnText: {
    fontSize: 11,
    color: '#F8FAFC',
    fontWeight: '600',
  },
  sectionHeading: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  activeAlertsSection: {
    marginBottom: 16,
  },
  activeAlertCard: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
  },
  alertCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paramIcon: {
    fontSize: 16,
  },
  alertParamName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  severityBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  alertMessage: {
    fontSize: 13,
    color: '#E2E8F0',
    lineHeight: 18,
    marginBottom: 8,
  },
  alertTimestamp: {
    fontSize: 11,
    color: '#94A3B8',
  },
  emptyActiveCard: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    marginBottom: 16,
  },
  emptyActiveIcon: {
    fontSize: 24,
    color: '#10B981',
    fontWeight: '800',
    marginBottom: 4,
  },
  emptyActiveTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 4,
  },
  emptyActiveDesc: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 16,
  },
  historySection: {
    marginBottom: 16,
  },
  emptyHistoryCard: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  emptyHistoryText: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
  },
  historyCard: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  historyCardRecovery: {
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  historyParam: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  historyMessage: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 16,
    marginBottom: 8,
  },
  historyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyTimestamp: {
    fontSize: 10,
    color: '#64748B',
  },
  historyValueBadge: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },
  thresholdsRefCard: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginTop: 8,
  },
  thresholdsTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  thresholdsDisclaimer: {
    fontSize: 10,
    color: '#64748B',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  threshRow: {
    marginBottom: 4,
  },
  threshLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  threshVal: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
  },
});
