/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Hook useAutomation (polling composite)
 * ---------------------------------------------------------------------------
 */

/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useRef, useState, useCallback } from 'react'
import { AUTOMATION_INTERVALS } from '../constants/automation'
import { fetchDrives, buildDriveHealthSnapshot, recommendDrive, rebalanceCandidates } from '../features/automation/driveAutomation'
import { maybeRecalculateStatistics, prefetchSearches } from '../features/automation/indexAutomation'
import { buildMaintenanceReport } from '../features/automation/maintenanceAutomation'
import { DocumentApi } from '../api/DocumentApi'
import { normalizeApiList } from '../utils/academic'

export function useAutomation({ enabled = true } = {}) {
  const [drives, setDrives] = useState([])
  const [healthSnapshot, setHealthSnapshot] = useState([])
  const [bestDrive, setBestDrive] = useState(null)
  const [rebalanceList, setRebalanceList] = useState([])
  const [maintenance, setMaintenance] = useState(null)
  const timersRef = useRef([])

  const refreshDrives = useCallback(async (signal) => {
    try {
      const list = await fetchDrives(signal)
      setDrives(list)
      const snap = buildDriveHealthSnapshot(list)
      setHealthSnapshot(snap)
      setBestDrive(recommendDrive(list))
      setRebalanceList(rebalanceCandidates(list))
    } catch {
      // silent
    }
  }, [])

  const refreshMaintenance = useCallback(async (signal) => {
    try {
      const res = await DocumentApi.list({ per_page: 200, signal: signal ? { signal } : undefined })
      const docs = normalizeApiList(res)
      const report = buildMaintenanceReport({ documents: docs, drives })
      setMaintenance(report)
    } catch {
      // silent
    }
  }, [drives])

  useEffect(() => {
    if (!enabled) return undefined
    const ctrl = new AbortController()
    refreshDrives(ctrl.signal)
    refreshMaintenance(ctrl.signal)
    // index/statistics warming (fire-and-forget)
    maybeRecalculateStatistics()
    prefetchSearches()

    const t1 = setInterval(() => refreshDrives(), AUTOMATION_INTERVALS.DRIVE_HEALTH)
    const t2 = setInterval(() => refreshMaintenance(), AUTOMATION_INTERVALS.MAINTENANCE)
    const t3 = setInterval(() => { maybeRecalculateStatistics(); prefetchSearches() }, AUTOMATION_INTERVALS.STATISTICS)
    timersRef.current = [t1, t2, t3]

    return () => {
      ctrl.abort()
      for (const t of timersRef.current) clearInterval(t)
    }
  }, [enabled, refreshDrives, refreshMaintenance])

  return { drives, healthSnapshot, bestDrive, rebalanceList, maintenance, refreshDrives, refreshMaintenance }
}
