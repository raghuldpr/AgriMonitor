/**
 * AgriMonitor Alerts Hook (Phase 3)
 *
 * Exposes active alerts, alert history, telemetry evaluation, and clearance actions.
 */

import { useState, useEffect, useCallback } from 'react';
import { AlertManager } from '../services/alerts/AlertManager';
import {
  AgricultureAlert,
  TelemetryEvaluation,
  AgricultureThresholds,
} from '../services/alerts/alertTypes';

export interface UseAlertsReturn {
  evaluation: TelemetryEvaluation | null;
  activeAlerts: AgricultureAlert[];
  alertHistory: AgricultureAlert[];
  thresholds: AgricultureThresholds;
  clearAlertHistory: () => Promise<void>;
  updateThresholds: (custom: Partial<AgricultureThresholds>) => void;
}

export function useAlerts(): UseAlertsReturn {
  const alertMgr = AlertManager.getInstance();

  const [evaluation, setEvaluation] = useState<TelemetryEvaluation | null>(
    alertMgr.getCurrentEvaluation()
  );
  const [alertHistory, setAlertHistory] = useState<AgricultureAlert[]>(
    alertMgr.getAlertHistory()
  );
  const [thresholds, setThresholds] = useState<AgricultureThresholds>(
    alertMgr.getThresholds()
  );

  useEffect(() => {
    const unsub = alertMgr.subscribe((evalData, history) => {
      setEvaluation(evalData);
      setAlertHistory([...history]);
    });

    return () => unsub();
  }, []);

  const clearAlertHistory = useCallback(async () => {
    await alertMgr.clearHistory();
    setAlertHistory([]);
  }, [alertMgr]);

  const updateThresholds = useCallback(
    (custom: Partial<AgricultureThresholds>) => {
      alertMgr.setThresholds(custom);
      setThresholds(alertMgr.getThresholds());
    },
    [alertMgr]
  );

  const activeAlerts = evaluation ? evaluation.activeAlerts : [];

  return {
    evaluation,
    activeAlerts,
    alertHistory,
    thresholds,
    clearAlertHistory,
    updateThresholds,
  };
}
