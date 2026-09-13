import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { UploadedImage } from '../types'

const readUInt16 = (bytes: Uint8Array, offset: number, littleEndian: boolean) => {
  if (offset + 2 > bytes.length) {
    return 0
  }

  return littleEndian
    ? bytes[offset] | (bytes[offset + 1] << 8)
    : (bytes[offset] << 8) | bytes[offset + 1]
}

const readUInt32 = (bytes: Uint8Array, offset: number, littleEndian: boolean) => {
  if (offset + 4 > bytes.length) {
    return 0
  }

  return littleEndian
    ? bytes[offset] |
        (bytes[offset + 1] << 8) |
        (bytes[offset + 2] << 16) |
        (bytes[offset + 3] << 24)
    : (bytes[offset] << 24) |
        (bytes[offset + 1] << 16) |
        (bytes[offset + 2] << 8) |
        bytes[offset + 3]
}

const readRational = (bytes: Uint8Array, offset: number, littleEndian: boolean) => {
  const numerator = readUInt32(bytes, offset, littleEndian)
  const denominator = readUInt32(bytes, offset + 4, littleEndian)

  if (denominator === 0) {
    return 0
  }

  return numerator / denominator
}

const getExifSegments = (bytes: Uint8Array) => {
  const segments: Uint8Array[] = []

  for (let i = 0; i < bytes.length - 4; i += 1) {
    if (bytes[i] === 0xff && bytes[i + 1] === 0xe1) {
      const segmentLength = (bytes[i + 2] << 8) | bytes[i + 3]
      const segmentStart = i + 4
      const segmentEnd = segmentStart + segmentLength - 2

      if (segmentEnd <= bytes.length) {
        segments.push(bytes.slice(segmentStart, segmentEnd))
      }
    }
  }

  return segments
}

const parseExifGpsMetadata = async (file: File) => {
  if (!file.type.includes('jpeg') && !file.type.includes('jpg') && !/\.(jpg|jpeg)$/i.test(file.name)) {
    return null
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer())
    const exifSegment = getExifSegments(bytes).find((segment) => {
      if (segment.length < 6) {
        return false
      }

      return (
        segment[0] === 0x45 &&
        segment[1] === 0x78 &&
        segment[2] === 0x69 &&
        segment[3] === 0x66 &&
        segment[4] === 0x00 &&
        segment[5] === 0x00
      )
    })

    if (!exifSegment) {
      return null
    }

    const tiffBytes = exifSegment.slice(6)

    if (tiffBytes.length < 8) {
      return null
    }

    const littleEndian = tiffBytes[0] === 0x49 && tiffBytes[1] === 0x49
    const firstIfdOffset = readUInt32(tiffBytes, 4, littleEndian)

    if (firstIfdOffset < 2 || firstIfdOffset + 2 > tiffBytes.length) {
      return null
    }

    const ifdCount = readUInt16(tiffBytes, firstIfdOffset, littleEndian)
    const directoryEntries: Array<{ entryOffset: number; tag: number; type: number; count: number; valueOffset: number }> = []

    for (let i = 0; i < ifdCount; i += 1) {
      const entryOffset = firstIfdOffset + 2 + i * 12

      if (entryOffset + 12 > tiffBytes.length) {
        break
      }

      const tag = readUInt16(tiffBytes, entryOffset, littleEndian)
      const type = readUInt16(tiffBytes, entryOffset + 2, littleEndian)
      const count = readUInt32(tiffBytes, entryOffset + 4, littleEndian)
      const valueOffset = readUInt32(tiffBytes, entryOffset + 8, littleEndian)

      directoryEntries.push({ entryOffset, tag, type, count, valueOffset })
    }

    const gpsIfdEntry = directoryEntries.find((entry) => entry.tag === 0x8825)

    if (!gpsIfdEntry) {
      return null
    }

    const gpsOffset = gpsIfdEntry.valueOffset
    const gpsCount = readUInt16(tiffBytes, gpsOffset, littleEndian)
    const gpsEntries: Array<{ entryOffset: number; tag: number; type: number; count: number; valueOffset: number }> = []

    for (let i = 0; i < gpsCount; i += 1) {
      const entryOffset = gpsOffset + 2 + i * 12

      if (entryOffset + 12 > tiffBytes.length) {
        break
      }

      const tag = readUInt16(tiffBytes, entryOffset, littleEndian)
      const type = readUInt16(tiffBytes, entryOffset + 2, littleEndian)
      const count = readUInt32(tiffBytes, entryOffset + 4, littleEndian)
      const valueOffset = readUInt32(tiffBytes, entryOffset + 8, littleEndian)

      gpsEntries.push({ entryOffset, tag, type, count, valueOffset })
    }

    const latRefEntry = gpsEntries.find((entry) => entry.tag === 0x0001)
    const latEntry = gpsEntries.find((entry) => entry.tag === 0x0002)
    const longRefEntry = gpsEntries.find((entry) => entry.tag === 0x0003)
    const longEntry = gpsEntries.find((entry) => entry.tag === 0x0004)

    if (!latRefEntry || !latEntry || !longRefEntry || !longEntry) {
      return null
    }

    const readAsciiEntry = (entry: { entryOffset: number; type: number; count: number }) => {
      const content = tiffBytes.slice(entry.entryOffset + 8, entry.entryOffset + 8 + Math.min(4, entry.count))
      return new TextDecoder().decode(content).replace(/\0+$/, '')
    }

    const readRationals = (entry: { valueOffset: number; count: number }) => {
      const values: number[] = []

      for (let i = 0; i < entry.count; i += 1) {
        const offset = entry.valueOffset + i * 8
        values.push(readRational(tiffBytes, offset, littleEndian))
      }

      return values
    }

    const latRef = readAsciiEntry(latRefEntry).trim().toUpperCase()
    const latitude = readRationals(latEntry).reduce((sum, part, index) => {
      if (index === 0) {
        return sum + part
      }

      if (index === 1) {
        return sum + part / 60
      }

      return sum + part / 3600
    }, 0)

    const longRef = readAsciiEntry(longRefEntry).trim().toUpperCase()
    const longitude = readRationals(longEntry).reduce((sum, part, index) => {
      if (index === 0) {
        return sum + part
      }

      if (index === 1) {
        return sum + part / 60
      }

      return sum + part / 3600
    }, 0)

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return null
    }

    return {
      latitude: (latRef === 'S' ? -1 : 1) * latitude,
      longitude: (longRef === 'W' ? -1 : 1) * longitude,
      zoom: 8,
      regionName: 'EXIF GeoTag',
      geospatialSource: 'auto' as const,
    }
  } catch {
    return null
  }
}

export const imageService = {
  validateFile(file: File) {
    const validTypes = ['image/jpeg', 'image/png', 'image/tiff', 'image/tif', 'image/webp']
    const maxSize = 20 * 1024 * 1024

    if (!validTypes.includes(file.type) && !file.name.match(/\.(tif|tiff|png|jpg|jpeg)$/i)) {
      throw new Error('Unsupported image format. Please upload JPG, PNG, or TIFF files.')
    }

    if (file.size > maxSize) {
      throw new Error('File is too large. Please upload images under 20 MB for the demo environment.')
    }

    return true
  },

  async createUploadedImage(file: File): Promise<UploadedImage> {
    this.validateFile(file)

    const metadata = await parseExifGpsMetadata(file)

    return {
      id: `${file.name}-${Date.now()}`,
      name: file.name,
      size: file.size,
      type: file.type || 'image/png',
      localUrl: URL.createObjectURL(file),
      imageType: 'optical',
      uploadedAt: new Date().toISOString(),
      latitude: metadata?.latitude ?? 20.5937,
      longitude: metadata?.longitude ?? 78.9629,
      zoom: metadata?.zoom ?? 2,
      regionName: metadata?.regionName ?? 'Scene Overview',
      geospatialSource: metadata?.geospatialSource ?? 'manual',
    }
  },

  async uploadFiles(files: FileList | File[] | null, userId?: string): Promise<UploadedImage[]> {
    if (!files) {
      return []
    }

    const fileArray = Array.from(files)
    const uploadedImages: UploadedImage[] = []

    for (const file of fileArray) {
      const uploadedImage = await this.createUploadedImage(file)

      if (isSupabaseConfigured && userId) {
        try {
          const storagePath = `${userId}/${Date.now()}-${file.name.replace(/\s+/g, '-')}`
          const { data, error } = await supabase.storage.from('satquery-images').upload(storagePath, file, {
            upsert: true,
            contentType: file.type || 'application/octet-stream',
          })

          if (!error && data?.path) {
            const supabaseBaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '')
            uploadedImage.localUrl = `${supabaseBaseUrl}/storage/v1/object/public/satquery-images/${data.path}`
          } else {
            console.warn('Supabase Storage upload failed, falling back to local preview.', error)
          }
        } catch (error) {
          console.warn('Supabase Storage upload failed, falling back to local preview.', error)
        }
      }

      uploadedImages.push(uploadedImage)
    }

    return uploadedImages
  },
}
