import PDFDocument from 'pdfkit';
import sharp from 'sharp';

interface ImageData {
  buffer: Buffer;
  mimeType: string;
}

interface PDFGenerationResult {
  pdfBuffer: Buffer;
  pageCount: number;
}

/**
 * Optimizes an image for PDF inclusion
 * - Resizes to fit A4 page dimensions
 * - Compresses to reduce file size
 * - Converts to JPEG for consistency
 */
export async function optimizeImage(imageBuffer: Buffer): Promise<Buffer> {
  // A4 dimensions at 150 DPI (good balance of quality and size)
  const MAX_WIDTH = 1240;  // ~210mm at 150 DPI
  const MAX_HEIGHT = 1754; // ~297mm at 150 DPI

  try {
    const optimized = await sharp(imageBuffer)
      .resize(MAX_WIDTH, MAX_HEIGHT, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({
        quality: 85,
        progressive: true,
      })
      .toBuffer();

    return optimized;
  } catch (error) {
    console.error('Error optimizing image:', error);
    // Return original if optimization fails
    return imageBuffer;
  }
}

/**
 * Gets image dimensions using sharp
 */
export async function getImageDimensions(imageBuffer: Buffer): Promise<{ width: number; height: number }> {
  const metadata = await sharp(imageBuffer).metadata();
  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
  };
}

/**
 * Generates a multi-page PDF from an array of images
 * Each image becomes one page in the PDF
 */
export async function generatePDFFromImages(images: ImageData[]): Promise<PDFGenerationResult> {
  return new Promise(async (resolve, reject) => {
    try {
      // A4 dimensions in points (72 points per inch)
      const PAGE_WIDTH = 595.28;  // 210mm
      const PAGE_HEIGHT = 841.89; // 297mm
      const MARGIN = 20;

      const doc = new PDFDocument({
        autoFirstPage: false,
        size: 'A4',
        margin: 0,
      });

      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve({
          pdfBuffer,
          pageCount: images.length,
        });
      });
      doc.on('error', reject);

      // Process each image and add as a page
      for (let i = 0; i < images.length; i++) {
        const image = images[i];

        // Optimize the image
        const optimizedBuffer = await optimizeImage(image.buffer);
        const dimensions = await getImageDimensions(optimizedBuffer);

        // Add a new page
        doc.addPage();

        // Calculate scaling to fit page while maintaining aspect ratio
        const availableWidth = PAGE_WIDTH - (MARGIN * 2);
        const availableHeight = PAGE_HEIGHT - (MARGIN * 2);

        const scaleX = availableWidth / dimensions.width;
        const scaleY = availableHeight / dimensions.height;
        const scale = Math.min(scaleX, scaleY, 1); // Don't upscale

        const scaledWidth = dimensions.width * scale;
        const scaledHeight = dimensions.height * scale;

        // Center the image on the page
        const x = (PAGE_WIDTH - scaledWidth) / 2;
        const y = (PAGE_HEIGHT - scaledHeight) / 2;

        // Add the image to the page
        doc.image(optimizedBuffer, x, y, {
          width: scaledWidth,
          height: scaledHeight,
        });

        // Add page number at the bottom
        doc.fontSize(10)
          .fillColor('#666666')
          .text(
            `Page ${i + 1} of ${images.length}`,
            0,
            PAGE_HEIGHT - 30,
            { align: 'center', width: PAGE_WIDTH }
          );
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Validates that the buffer is a valid image
 */
export async function validateImage(buffer: Buffer): Promise<boolean> {
  try {
    const metadata = await sharp(buffer).metadata();
    const validFormats = ['jpeg', 'jpg', 'png', 'webp'];
    return metadata.format ? validFormats.includes(metadata.format) : false;
  } catch {
    return false;
  }
}
