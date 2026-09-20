/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Document Automation
 * ---------------------------------------------------------------------------
 * Orchestrates per-file processing : hash already done by UploadEngine,
 * here we handle metadata extraction, suggestions, constraint validation
 * and duplicate detection delegation.
 */

import { UploadApi } from '../../api/UploadApi'
import { extractMetadataFromFilename, buildSuggestions, validateConstraints } from '../../utils/automation'
import { computeFileSha256 } from '../../utils/upload'

/**
 * Process a single file through automation pipeline.
 * @param {File} file
 * @param {object} ctx - {faculties, departments, courses, semesters}
 * @param {{signal?: AbortSignal}} opts
 * @returns {Promise<{meta: object, suggestions: object, confidence: number, needsConfirmation: boolean, hash: string|null, duplicate: object|null, validation: object}>}
 */
export async function processDocumentFile(file, ctx = {}, opts = {}) {
  const meta = extractMetadataFromFilename(file?.name || '')
  const built = buildSuggestions(ctx, meta)
  const validation = validateConstraints(file)

  let hash = null
  let duplicate = null

  try {
    if (file && typeof file.slice === 'function') {
      hash = await computeFileSha256(file, { signal: opts.signal })
      if (hash) {
        try {
          const res = await UploadApi.findDuplicateByHash(hash)
          // API may return {data: doc} or doc
          const doc = res?.data ?? res
          if (doc && doc.id) duplicate = doc
        } catch (err) {
          // 404 means no duplicate — swallow
          if (err?.status !== 404) throw err
        }
      }
    }
  } catch {
    // hash/duplicate failures are non-blocking for suggestions
  }

  return {
    meta,
    suggestions: built.suggestions,
    confidence: built.confidence,
    needsConfirmation: built.needsConfirmation || !validation.valid || Boolean(duplicate),
    hash,
    duplicate,
    validation,
  }
}
