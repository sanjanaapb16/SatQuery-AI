import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { UploadedImage } from '../types'

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

    return {
      id: `${file.name}-${Date.now()}`,
      name: file.name,
      size: file.size,
      type: file.type || 'image/png',
      localUrl: URL.createObjectURL(file),
      imageType: 'optical',
      uploadedAt: new Date().toISOString(),
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
