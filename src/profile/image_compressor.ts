import type { CompressOptions } from './types';

export const DEFAULT_MAX_DIMENSION = 256;
export const DEFAULT_QUALITY = 0.82;
export const DEFAULT_MIME_TYPE = 'image/jpeg';

/**
 * Comprime y recorta en formato cuadrado un archivo de imagen en el cliente.
 * Optimizado para generar avatares ultraligeros (< 30 KB) a coste cero sin Cloud Functions.
 */
export async function compressAndCropAvatar(
  file: File,
  options: CompressOptions = {}
): Promise<string> {
  const {
    maxDimension = DEFAULT_MAX_DIMENSION,
    quality = DEFAULT_QUALITY,
    mimeType = DEFAULT_MIME_TYPE,
  } = options;

  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo seleccionado no es una imagen válida.');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo de imagen.'));
    };

    reader.onload = () => {
      const img = new Image();
      img.onerror = () => {
        reject(new Error('No se pudo decodificar la imagen seleccionada.'));
      };

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('No se pudo inicializar el contexto 2D de canvas.'));
            return;
          }

          // Cálculo de recorte cuadrado centrado
          const minSide = Math.min(img.width, img.height);
          const sx = (img.width - minSide) / 2;
          const sy = (img.height - minSide) / 2;

          const targetSize = Math.min(minSide, maxDimension);
          canvas.width = targetSize;
          canvas.height = targetSize;

          // Dibujar recorte cuadrado centrado
          ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, targetSize, targetSize);

          // Exportar en formato comprimido
          const dataUrl = canvas.toDataURL(mimeType, quality);
          resolve(dataUrl);
        } catch (err) {
          reject(err instanceof Error ? err : new Error('Fallo al procesar canvas.'));
        }
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}

