/**
 * ALPHIX V2 — UploadZone
 * Zone de depot Drag & Drop accessible (WAI-ARIA) : glisser-deposer,
 * selection clavier/souris, validation visuelle des contraintes.
 * Mobile first + compatible webview Capacitor.
 */

import { useCallback, useId, useRef, useState } from 'react'
import Button from '../ui/Button'
import { UPLOAD_ACCEPT_ATTRIBUTE, UPLOAD_CONSTRAINTS } from '../../constants/upload'
import { formatBytes } from '../../utils/upload'

const ALLOWED_EXTENSIONS_LABEL = 'PDF, Word, PowerPoint, JPEG, PNG'

/**
 * @param {object} props
 * @param {(files: File[]) => void} props.onFiles - Fichiers acceptes par la zone.
 * @param {boolean} [props.disabled=false] - Desactive les interactions.
 * @param {boolean} [props.multiple=true] - Selection multiple autorisee.
 * @param {string} [props.className] - Classe additionnelle.
 */
export default function UploadZone({
  onFiles,
  disabled = false,
  multiple = true,
  className = '',
}) {
  const inputId = useId()
  const hintId = `${inputId}-hint`
  const inputRef = useRef(null)
  /** Compteur dragenter pour eviter le scintillement des sous-elements. */
  const dragDepthRef = useRef(0)
  const [isDragActive, setIsDragActive] = useState(false)

  /**
   * Extrait les fichiers d'un evenement (drop ou input) et notifie.
   * @param {FileList|null} fileList - Liste brute du navigateur.
   */
  const emitFiles = useCallback(
    (fileList) => {
      if (disabled || !fileList || fileList.length === 0) return
      const files = Array.from(fileList)
      if (!multiple) {
        onFiles([files[0]])
        return
      }
      onFiles(files)
    },
    [disabled, multiple, onFiles],
  )

  const handleOpenPicker = useCallback(() => {
    if (disabled) return
    inputRef.current?.click()
  }, [disabled])

  const handleDragEnter = useCallback((event) => {
    event.preventDefault()
    event.stopPropagation()
    dragDepthRef.current += 1
    setIsDragActive(true)
  }, [])

  const handleDragOver = useCallback((event) => {
    event.preventDefault()
    event.stopPropagation()
  }, [])

  const handleDragLeave = useCallback((event) => {
    event.preventDefault()
    event.stopPropagation()
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
    if (dragDepthRef.current === 0) setIsDragActive(false)
  }, [])

  const handleDrop = useCallback(
    (event) => {
      event.preventDefault()
      event.stopPropagation()
      dragDepthRef.current = 0
      setIsDragActive(false)
      emitFiles(event.dataTransfer?.files ?? null)
    },
    [emitFiles],
  )

  return (
    <div
      className={[
        'ax-upload-zone',
        isDragActive ? 'ax-upload-zone--active' : '',
        disabled ? 'ax-upload-zone--disabled' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="region"
      aria-label="Zone de depôt de fichiers"
      aria-describedby={hintId}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        className="ax-visually-hidden"
        accept={UPLOAD_ACCEPT_ATTRIBUTE}
        multiple={multiple}
        disabled={disabled}
        onChange={(event) => {
          emitFiles(event.target.files)
          // Reinitialisation : reselectionner le meme fichier doit re-emettre.
          event.target.value = ''
        }}
      />

      <div className="ax-upload-zone__inner">
        <span className="ax-upload-zone__icon" aria-hidden="true">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 16V4m0 0l-5 5m5-5l5 5" />
            <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
          </svg>
        </span>
        <p className="ax-upload-zone__title">
          Glissez vos documents ici
        </p>
        <p className="ax-upload-zone__subtitle">ou</p>
        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={handleOpenPicker}
          disabled={disabled}
          aria-controls={inputId}
        >
          Parcourir les fichiers
        </Button>
        <p id={hintId} className="ax-upload-zone__hint">
          Formats acceptes : {ALLOWED_EXTENSIONS_LABEL} — Maximum{' '}
          {formatBytes(UPLOAD_CONSTRAINTS.MAX_SIZE_BYTES)} par fichier.
        </p>
      </div>
    </div>
  )
}
