/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Notification Automation
 * ---------------------------------------------------------------------------
 * Dispatches notifications to target audiences using NotificationApi.
 * Audience resolution is heuristic frontend-side (no backend contract change).
 */

import { NotificationApi } from '../../api/NotificationApi'

/**
 * Notify a set of users.
 * @param {Array<number|string>} userIds
 * @param {object} payload - {title, message, document_id, type}
 * @returns {Promise<Array<{userId: string, ok: boolean}>>}
 */
export async function notifyUsers(userIds, payload) {
  const ids = Array.isArray(userIds) ? userIds : []
  const results = []
  for (const uid of ids) {
    try {
      await NotificationApi.notifyUpload(uid, payload)
      results.push({ userId: String(uid), ok: true })
    } catch {
      results.push({ userId: String(uid), ok: false })
    }
  }
  return results
}

/**
 * Notify administrators (filtered from users list).
 * @param {Array<object>} users
 * @param {object} payload
 */
export async function notifyAdmins(users, payload) {
  const adminIds = (Array.isArray(users) ? users : [])
    .filter((u) => String(u.role || '').toLowerCase().includes('admin'))
    .map((u) => u.id)
  if (adminIds.length === 0) return []
  return notifyUsers(adminIds, { ...payload, audience: 'admins' })
}

/**
 * Resolve targets for a document event.
 * Simple heuristic: admins + document owner faculty/department members.
 * @param {object} doc
 * @param {Array<object>} users
 * @returns {Array<number|string>}
 */
export function resolveTargetsForDocument(doc, users) {
  const list = Array.isArray(users) ? users : []
  const set = new Set()
  // admins always
  for (const u of list) if (String(u.role || '').toLowerCase().includes('admin')) set.add(u.id)
  // faculty / department match if doc carries those ids
  if (doc?.faculty_id) {
    for (const u of list) if (String(u.faculty_id) === String(doc.faculty_id)) set.add(u.id)
  }
  if (doc?.department_id) {
    for (const u of list) if (String(u.department_id) === String(doc.department_id)) set.add(u.id)
  }
  // owner
  if (doc?.user_id) set.add(doc.user_id)
  return [...set]
}
