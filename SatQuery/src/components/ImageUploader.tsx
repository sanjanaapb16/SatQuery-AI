import { useEffect, useState, useRef } from 'react'
import type { ImageQualityResult } from '../types'
import { checkImageQuality, checkPairCompatibility } from '../lib/imageQuality'

interface ImageUploaderProps {
  files: File[]
  fileNames: string[]
  onFilesChange: (files: File[], names: string[]) => void
  maxFiles?: 1 | 2
  onQualityResult?: (result: ImageQualityResult | null) => void
}

const DEMO_FILES = [
  { name: 'Landsat_2024_06_18.tif', meta: 'Multispectral · 10m · EPSG:32643' },
  { name: 'Landsat_2025_06_21.tif', meta: 'Multispectral · 10m · EPSG:32643' },
]

export default function ImageUploader({ files, fileNames, onFilesChange, maxFiles = 2, onQualityResult }: ImageUploaderProps) {
  const [quality, setQuality] = useState<ImageQualityResult | null>(null)
  const [checking, setChecking] = useState(false)
  const [pairIssues, setPairIssues] = useState<string[]>([])
  const [dragging, setDragging] = useState(false)
  const [demoLoaded, setDemoLoaded] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!files.length) { setQuality(null); onQualityResult?.(null); return }
    let cancelled = false
    setChecking(true)
    ;(async () => {
      const result = await checkImageQuality(files[0])
      if (cancelled) return
      setQuality(result)
      onQualityResult?.(result)
      if (files.length === 2) {
        const issues = await checkPairCompatibility(files[0], files[1])
        if (!cancelled) setPairIssues(issues)
      } else {
        setPairIssues([])
      }
      setChecking(false)
    })()
    return () => { cancelled = true }
  }, [files]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (selectedFiles: File[]) => {
    const limited = selectedFiles.slice(0, maxFiles)
    onFilesChange(limited, limited.map((f) => f.name))
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const dropped = Array.from(e.dataTransfer.files)
    handleChange(dropped)
  }

  const qualityLabel = quality?.overall ?? (checking ? 'CHECKING…' : null)
  const qualityColor = quality?.overall === 'GOOD' ? '#c7ef67' : quality?.overall === 'ACCEPTABLE' ? '#e5bb61' : '#ff9a61'

  const displayNames = demoLoaded ? DEMO_FILES.map((f) => f.name) : fileNames

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr', gap: '13px', marginTop: '20px' }}>
        {/* Drop zone */}
        <label
          className="upload-zone"
          style={{ borderColor: dragging ? '#c7ef67' : '#526367' }}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".tif,.tiff,.png,.jpg,.jpeg"
            multiple={maxFiles === 2}
            onChange={(e) => handleChange(Array.from(e.target.files ?? []))}
            style={{ display: 'none' }}
          />
          <span className="upload-icon">↥</span>
          <strong>Drop GeoTIFF or image files</strong>
          <small>TIFF, GeoTIFF, PNG, JPEG · up to 2 files · 2 GB each</small>
          <span className="browse">Browse files</span>
        </label>

        {/* File list */}
        <div className="file-list">
          <div className="file-header">
            <span>SESSION INPUTS <b>{displayNames.length}/{maxFiles}</b></span>
            {qualityLabel && (
              <span style={{ color: qualityColor, font: "9px 'DM Mono'" }}>
                {quality?.overall === 'GOOD' ? '✓ ' : quality?.overall === 'POOR' ? '✗ ' : '⚠ '}
                {qualityLabel}
              </span>
            )}
          </div>

          {displayNames.length === 0 && (
            <div className="empty-files">No imagery loaded — upload files or try demo</div>
          )}

          {displayNames.map((name, i) => {
            const isSar = /sar|risat|radar|sentinel-1/i.test(name)
            return (
              <div className="file-row" key={name + i}>
                <span className={`file-icon${isSar ? ' sar' : ''}`}>▥</span>
                <span className="file-name">
                  <strong title={name}>{name}</strong>
                  <small>{demoLoaded ? DEMO_FILES[i]?.meta : (isSar ? 'SAR · RISAT-2B' : 'Multispectral · 10m · EPSG:32643')}</small>
                </span>
                <span className="file-status">✓</span>
              </div>
            )
          })}

          <button
            className="demo-button"
            onClick={() => { setDemoLoaded(true); onFilesChange([], DEMO_FILES.map((f) => f.name)) }}
          >
            ✦ Load demo dataset
          </button>
        </div>
      </div>

      {/* Quality details */}
      {quality && (
        <div style={{ marginTop: '10px', padding: '10px 12px', background: '#172126', border: '1px solid #2a373b', borderRadius: '3px', fontSize: '10px' }}>
          <div style={{ color: '#8a9a9d', font: "9px 'DM Mono'", marginBottom: '8px' }}>INPUT QUALITY CHECK</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '4px' }}>
            {[
              ['File format', quality.format],
              ['Resolution', quality.resolution],
              ['Metadata', quality.metadata],
              ['CRS', quality.crs],
            ].map(([label, status]) => (
              <span key={label} style={{ color: status === 'ok' ? '#c7ef67' : status === 'warn' ? '#e5bb61' : '#ff9a61' }}>
                {status === 'ok' ? '✓' : status === 'warn' ? '⚠' : '✗'} {label}
              </span>
            ))}
          </div>
          {quality.warnings.map((w, i) => (
            <div key={i} style={{ color: '#e5bb61', marginTop: '5px' }}>⚠ {w}</div>
          ))}
          {quality.errors.map((e, i) => (
            <div key={i} style={{ color: '#ff9a61', marginTop: '5px' }}>✗ {e}</div>
          ))}
          {pairIssues.map((issue, i) => (
            <div key={i} style={{ color: '#ff9a61', marginTop: '5px' }}>⚠ {issue}</div>
          ))}
        </div>
      )}
    </div>
  )
}
