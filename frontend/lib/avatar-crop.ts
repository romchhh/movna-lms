export const AVATAR_CROP_FRAME = 280
export const AVATAR_OUTPUT_SIZE = 512

export interface AvatarCropTransform {
  scale: number
  x: number
  y: number
}

export function avatarCropBaseScale(
  imageWidth: number,
  imageHeight: number,
  frameSize = AVATAR_CROP_FRAME,
): number {
  if (!imageWidth || !imageHeight) return 1
  return Math.max(frameSize / imageWidth, frameSize / imageHeight)
}

export function clampAvatarCropTransform(
  imageWidth: number,
  imageHeight: number,
  transform: AvatarCropTransform,
  frameSize = AVATAR_CROP_FRAME,
): AvatarCropTransform {
  const base = avatarCropBaseScale(imageWidth, imageHeight, frameSize)
  const scale = Math.min(3, Math.max(1, transform.scale))
  const total = base * scale
  const drawW = imageWidth * total
  const drawH = imageHeight * total
  const minX = frameSize - drawW
  const minY = frameSize - drawH
  return {
    scale,
    x: Math.min(0, Math.max(minX, transform.x)),
    y: Math.min(0, Math.max(minY, transform.y)),
  }
}

export function renderAvatarCropBlob(
  image: HTMLImageElement,
  transform: AvatarCropTransform,
  frameSize = AVATAR_CROP_FRAME,
  outputSize = AVATAR_OUTPUT_SIZE,
): Promise<Blob> {
  const clamped = clampAvatarCropTransform(image.naturalWidth, image.naturalHeight, transform, frameSize)
  const base = avatarCropBaseScale(image.naturalWidth, image.naturalHeight, frameSize)
  const total = base * clamped.scale
  const drawW = image.naturalWidth * total
  const drawH = image.naturalHeight * total
  const left = (frameSize - drawW) / 2 + clamped.x
  const top = (frameSize - drawH) / 2 + clamped.y

  const sx = -left / total
  const sy = -top / total
  const sw = frameSize / total
  const sh = frameSize / total

  const canvas = document.createElement('canvas')
  canvas.width = outputSize
  canvas.height = outputSize
  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.reject(new Error('Canvas недоступний'))

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, outputSize, outputSize)
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, outputSize, outputSize)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => {
        if (!blob) {
          reject(new Error('Не вдалося обробити зображення'))
          return
        }
        resolve(blob)
      },
      'image/jpeg',
      0.92,
    )
  })
}

export function withAvatarCacheBust(url: string): string {
  if (!url) return ''
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}v=${Date.now()}`
}
