import Tesseract from 'tesseract.js';

interface OCRResult {
  text: string;
  confidence: number;
}

interface OCRProcessingResult {
  pageTexts: OCRResult[];
  combinedText: string;
  averageConfidence: number;
}

/**
 * Performs OCR on a single image
 * Returns extracted text and confidence score
 */
export async function extractTextFromImage(imageBuffer: Buffer): Promise<OCRResult> {
  try {
    const result = await Tesseract.recognize(
      imageBuffer,
      'eng', // English language - can be extended to support multiple languages
      {
        logger: (m) => {
          // Optional: Log progress for debugging
          if (process.env.NODE_ENV === 'development' && m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        },
      }
    );

    return {
      text: result.data.text.trim(),
      confidence: result.data.confidence,
    };
  } catch (error) {
    console.error('OCR extraction failed:', error);
    return {
      text: '',
      confidence: 0,
    };
  }
}

/**
 * Performs OCR on multiple images
 * Combines all extracted text with page separators
 */
export async function extractTextFromImages(imageBuffers: Buffer[]): Promise<OCRProcessingResult> {
  const pageTexts: OCRResult[] = [];
  let totalConfidence = 0;

  for (let i = 0; i < imageBuffers.length; i++) {
    console.log(`Processing OCR for page ${i + 1} of ${imageBuffers.length}...`);

    const result = await extractTextFromImage(imageBuffers[i]);
    pageTexts.push(result);
    totalConfidence += result.confidence;
  }

  // Combine all text with page separators
  const combinedText = pageTexts
    .map((result, index) => {
      if (result.text) {
        return `--- Page ${index + 1} ---\n${result.text}`;
      }
      return `--- Page ${index + 1} ---\n[No text detected]`;
    })
    .join('\n\n');

  const averageConfidence = pageTexts.length > 0
    ? totalConfidence / pageTexts.length
    : 0;

  return {
    pageTexts,
    combinedText,
    averageConfidence,
  };
}

/**
 * Cleans up extracted OCR text
 * - Removes excessive whitespace
 * - Fixes common OCR errors
 * - Normalizes line breaks
 */
export function cleanOCRText(text: string): string {
  return text
    // Normalize line breaks
    .replace(/\r\n/g, '\n')
    // Remove excessive blank lines (more than 2)
    .replace(/\n{3,}/g, '\n\n')
    // Remove leading/trailing whitespace from lines
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    // Remove excessive spaces
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/**
 * Checks if the extracted text meets minimum quality threshold
 * Returns true if OCR was successful enough to be useful
 */
export function isOCRResultUsable(result: OCRResult, minConfidence: number = 30): boolean {
  // Check confidence threshold
  if (result.confidence < minConfidence) {
    return false;
  }

  // Check if there's meaningful text (at least 10 characters)
  const cleanText = result.text.replace(/\s/g, '');
  if (cleanText.length < 10) {
    return false;
  }

  return true;
}
