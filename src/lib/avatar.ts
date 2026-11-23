const MAX_SIDE = 320

const loadImage = (file: File) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('That file is not a readable picture.'))
    }
    image.src = url
  })

/**
 * Crops a photo to a square and shrinks it to 320×320 JPEG so an avatar upload
 * is ~20 kB instead of the 4 MB a phone camera produces.
 */
export async function prepareAvatar(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose a picture (JPG, PNG or WebP).')
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new Error('That picture is larger than 15 MB. Choose a smaller one.')
  }

  const image = await loadImage(file)
  const side = Math.min(image.width, image.height)
  const canvas = document.createElement('canvas')
  canvas.width = MAX_SIDE
  canvas.height = MAX_SIDE

  const context = canvas.getContext('2d')
  if (!context) throw new Error('This browser could not prepare the picture.')

  context.imageSmoothingQuality = 'high'
  context.drawImage(
    image,
    (image.width - side) / 2,
    (image.height - side) / 2,
    side,
    side,
    0,
    0,
    MAX_SIDE,
    MAX_SIDE,
  )

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error('Could not prepare the picture.')),
      'image/jpeg',
      0.86,
    )
  })
}
