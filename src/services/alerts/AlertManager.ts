/**
 * AgriMonitor Alert Manager (Phase 3)
 *
 * Central stateful service responsible for:
 * - Telemetry rule evaluation dispatching
 * - Alert deduplication / debouncing (prevents repeating 2-sec alerts)
 * - Parameter recovery detection (e.g. soil moisture returning to normal)
 * - Local alert history persistence (capped at MAX_HISTORY)
 */

import { AgricultureTelemetry } from '../../types/telemetry';
import {
  AgricultureAlert,
  AgricultureThresholds,
  AlertParameter,
  TelemetryEvaluation,
} from './alertTypes';
import {
  DEFAULT_THRESHOLDS,
  evaluateAgricultureTelemetry,
} from '../../lib/agricultureRules';
import { StorageService } from '../storage/storageService';

export type AlertSubscriber = (
  evaluation: TelemetryEvaluation,
  history: AgricultureAlert[]
) => void;

export class AlertManager {
  private static instance: AlertManager | null = null;

  private static readonly MAX_HISTORY = 200;

  private thresholds: AgricultureThresholds = { ...DEFAULT_THRESHOLDS };
  private previousStatuses: Map<AlertParameter, string> = new Map([
    ['temperature', 'NORMAL'],
    ['humidity', 'NORMAL'],
    ['soilMoisture', 'NORMAL'],
    ['tds', 'NORMAL'],
  ]);

  private alertHistory: AgricultureAlert[] = [];
  private currentEvaluation: TelemetryEvaluation | null = null;
  private subscribers: Set<AlertSubscriber> = new Set();
  private isLoadedFromStorage = false;

  private constructor() {
    this.initStorage();
  }

  public static getInstance(): AlertManager {
    if (!AlertManager.instance) {
      AlertManager.instance = new AlertManager();
    }
    return AlertManager.instance;
  }

  private async initStorage() {
    try {
      this.alertHistory = await StorageService.getAlertHistory();
      this.isLoadedFromStorage = true;
      this.notifySubscribers();
    } catch (e) {
      console.warn('[AlertManager] Failed to load initial alert history:', e);
    }
  }

  public getThresholds(): AgricultureThresholds {
    return this.thresholds;
  }

  public setThresholds(custom: Partial<AgricultureThresholds>) {
    this.thresholds = {
      ...this.thresholds,
      ...custom,
    };
  }

  public getAlertHistory(): AgricultureAlert[] {
    return this.alertHistory;
  }

  public getCurrentEvaluation(): TelemetryEvaluation | null {
    return this.currentEvaluation;
  }

  /**
   * Returns currently active abnormal alerts
   */
  public getActiveAlerts(): AgricultureAlert[] {
    if (!this.currentEvaluation) return [];
    const active: AgricultureAlert[] = [];
    const params: AlertParameter[] = ['temperature', 'soilMoisture', 'tds', 'humidity'];
    params.forEach((param) => {
      const evalResult = this.currentEvaluation![param];
      if (evalResult.isAbnormal && evalResult.severity !== 'INFO') {
        active.push({
          id: `active_${param}`,
          parameter: param,
          status: evalResult.status,
          severity: evalResult.severity,
          value: evalResult.value,
          message: evalResult.message,
          timestamp: Date.now(),
        });
      }
    });
    return active;
  }

  public subscribe(subscriber: AlertSubscriber): () => void {
    this.subscribers.add(subscriber);
    if (this.currentEvaluation) {
      subscriber(this.currentEvaluation, this.alertHistory);
    }
    return () => this.subscribers.delete(subscriber);
  }

  private notifySubscribers() {
    if (this.currentEvaluation) {
      this.subscribers.forEach((fn) => fn(this.currentEvaluation!, this.alertHistory));
    }
  }

  /**
   * Process new telemetry packet with deduplication & recovery logic
   */
  public processTelemetry(telemetry: AgricultureTelemetry): TelemetryEvaluation {
    const evaluation = evaluateAgricultureTelemetry(telemetry, this.thresholds);
    this.currentEvaluation = evaluation;

    const parameters: AlertParameter[] = ['temperature', 'soilMoisture', 'tds', 'humidity'];
    let historyChanged = false;

    parameters.forEach((param) => {
      const evalResult = evaluation[param];
      const prevStatus = this.previousStatuses.get(param) || 'NORMAL';
      const currentStatus = evalResult.status;

      // 1. Transition: NORMAL/OTHER -> ABNORMAL (New Alert Event)
      if (evalResult.isAbnormal && currentStatus !== prevStatus) {
        // Only trigger alerts for WARNING or CRITICAL (humidity is primarily informational)
        if (evalResult.severity !== 'INFO') {
          const newAlert: AgricultureAlert = {
            id: `alert_${param}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            parameter: param,
            status: currentStatus,
            severity: evalResult.severity,
            value: evalResult.value,
            message: evalResult.message,
            timestamp: telemetry.timestamp,
            isRecovery: false,
          };

          this.alertHistory.unshift(newAlert);
          historyChanged = true;
        }
      }

      // 2. Transition: ABNORMAL -> NORMAL (Recovery Event)
      if (prevStatus !== 'NORMAL' && currentStatus === 'NORMAL') {
        const recoveryAlert: AgricultureAlert = {
          id: `rec_${param}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          parameter: param,
          status: 'NORMAL',
          severity: 'INFO',
          value: evalResult.value,
          message: `✓ ${this.formatParameterName(param)} has returned to the configured normal range (${evalResult.value}${this.getParameterUnit(param)}).`,
          timestamp: telemetry.timestamp,
          isRecovery: true,
        };

        this.alertHistory.unshift(recoveryAlert);
        historyChanged = true;
      }

      // Update state tracking
      this.previousStatuses.set(param, currentStatus);
    });

    if (historyChanged) {
      // Enforce history cap
      if (this.alertHistory.length > AlertManager.MAX_HISTORY) {
        this.alertHistory = this.alertHistory.slice(0, AlertManager.MAX_HISTORY);
      }

      // Persist to local storage asynchronously
      StorageService.saveAlertHistory(this.alertHistory).catch(console.warn);
    }

    this.notifySubscribers();
    return evaluation;
  }

  public async clearHistory(): Promise<void> {
    this.alertHistory = [];
    await StorageService.clearAlertHistory();
    this.notifySubscribers();
  }

  // Reset internal tracking state for testing
  public resetState() {
    this.previousStatuses.set('temperature', 'NORMAL');
    this.previousStatuses.set('humidity', 'NORMAL');
    this.previousStatuses.set('soilMoisture', 'NORMAL');
    this.previousStatuses.set('tds', 'NORMAL');
    this.alertHistory = [];
    this.currentEvaluation = null;
  }

  private formatParameterName(param: AlertParameter): string {
    switch (param) {
      case 'temperature':
        return 'Temperature';
      case 'soilMoisture':
        return 'Soil moisture';
      case 'tds':
        return 'TDS (Dissolved solids)';
      case 'humidity':
        return 'Relative humidity';
    }
  }

  private getParameterUnit(param: AlertParameter): string {
    switch (param) {
      case 'temperature':
        return '°C';
      case 'soilMoisture':
        return '%';
      case 'tds':
        return ' ppm';
      case 'humidity':
        return '%';
    }
  }
}
