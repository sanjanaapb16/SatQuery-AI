import type { ImageQualityResult } from '../types'

// ─────────────────────────────────────────────────────────────────────────────
// SatQuery AI — Image Quality Checker
// Validates files client-side before sending to the agent.
// ─────────────────────────────────────────────────────────────────────────────

const SUPPORTED_FORMATS = ['image/tiff', 'image/geotiff', 'image/png', 'image/jpeg', 'image/jpg', 'application/octet-stream']
const TIFF_SIGNATURES = [
  [0x49, 0x49, 0x2A, 0x00], // Little-endian TIFF
  [0x4D, 0x4D, 0x00, 0x2A], // Big-endian TIFF
]

async function readFirstBytes(file: File, count = 8): Promise<Uint8Array> {
  const slice = file.slice(0, count)
  const buffer = await slice.arrayBuffer()
  return new Uint8Array(buffer)
}

function isTiff(bytes: Uint8Array): boolean {
  return TIFF_SIGNATURES.some((sig) => sig.every((byte, i) => bytes[i] === byte))
}

function isPng(bytes: Uint8Array): boolean {
  return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47
}

function isJpeg(bytes: Uint8Array): boolean {
  return bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF
}

async function getImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  if (!file.type.startsWith('image/') && !file.name.endsWith('.tif') && !file.name.endsWith('.tiff')) return null
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve({ width: img.naturalWidth, height: img.naturalHeight }) }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
    img.src = url
  })
}

export async function checkImageQuality(file: File): Promise<ImageQualityResult> {
  const warnings: string[] = []
  const errors: string[] = []
  let format: ImageQualityResult['format'] = 'ok'
  let resolution: ImageQualityResult['resolution'] = 'ok'
  let metadata: ImageQualityResult['metadata'] = 'ok'
  let crs: ImageQualityResult['crs'] = 'warn'
  let georeferenced = false

  // File size check
  if (file.size > 2_000_000_000) {
    errors.push('File exceeds 2 GB limit')
    format = 'error'
  }
  if (file.size < 1024) {
    errors.push('File appears empty or corrupt')
    format = 'error'
  }

  // Format check via magic bytes
  try {
    const bytes = await readFirstBytes(file, 8)
    const isTifFile = isTiff(bytes)
    const isPngFile = isPng(bytes)
    const isJpgFile = isJpeg(bytes)

    if (!isTifFile && !isPngFile && !isJpgFile) {
      if (!SUPPORTED_FORMATS.includes(file.type)) {
        errors.push('Unsupported file format — please use GeoTIFF, TIFF, PNG, or JPEG')
        format = 'error'
      } else {
        warnings.push('File format could not be confirmed from file signature')
        format = 'warn'
      }
    }

    // GeoTIFF is preferred
    if (isTifFile) {
      georeferenced = true
      crs = 'warn' // We can't parse full GeoTIFF metadata client-side; assume georef present
      warnings.push('CRS cannot be verified client-side — will be checked server-side')
    } else if (isPngFile || isJpgFile) {
      warnings.push('PNG/JPEG detected — geospatial metadata may be absent. Area calculations will be estimates.')
      crs = 'missing'
      metadata = 'warn'
    }
  } catch {
    warnings.push('Could not read file header — file may be corrupt')
    format = 'warn'
  }

  // Resolution / dimension check
  const dims = await getImageDimensions(file)
  if (dims) {
    if (dims.width < 64 || dims.height < 64) {
      errors.push(`Image is too small (${dims.width}×${dims.height}px) for meaningful analysis`)
      resolution = 'error'
    } else if (dims.width < 256 || dims.height < 256) {
      warnings.push(`Low resolution image (${dims.width}×${dims.height}px) — analysis quality may be reduced`)
      resolution = 'warn'
    }
  }

  const valid = errors.length === 0
  let overall: ImageQualityResult['overall'] = 'GOOD'
  if (!valid) overall = 'POOR'
  else if (warnings.length >= 2) overall = 'ACCEPTABLE'

  return { valid, format, resolution, metadata, crs, georeferenced, warnings, errors, overall }
}

export async function checkPairCompatibility(fileA: File, fileB: File): Promise<string[]> {
  const issues: string[] = []
  const dimA = await getImageDimensions(fileA)
  const dimB = await getImageDimensions(fileB)
  if (dimA && dimB) {
    const ratiow = Math.abs(dimA.width - dimB.width) / Math.max(dimA.width, dimB.width)
    const ratioh = Math.abs(dimA.height - dimB.height) / Math.max(dimA.height, dimB.height)
    if (ratiow > 0.3 || ratioh > 0.3) {
      issues.push('Image dimensions differ significantly — images may not be co-registered')
    }
  }
  return issues
}
