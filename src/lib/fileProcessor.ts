import mammoth from 'mammoth';
import { downloadFile } from './supabase';

interface DocumentContent {
  fileName: string;
  content: string;
  type: string;
}

interface ExtractionResult {
  success: boolean;
  content?: string;
  error?: string;
}

const MAX_CONTENT_LENGTH = 50000; // 50KB limit to avoid token overflow

/**
 * Download file buffer from Supabase Storage
 */
async function getFileBuffer(storagePath: string): Promise<Buffer | null> {
  return await downloadFile(storagePath);
}

/**
 * Get file extension from storage path
 */
function getExtension(storagePath: string): string {
  const lastDotIndex = storagePath.lastIndexOf('.');
  if (lastDotIndex === -1) return '';
  return storagePath.substring(lastDotIndex).toLowerCase();
}

/**
 * Get filename from storage path
 */
function getFileName(storagePath: string): string {
  const parts = storagePath.split('/');
  return parts[parts.length - 1] || storagePath;
}

/**
 * Extract text from PDF file using pdf2json library
 * Now accepts a Buffer instead of file path
 */
export async function extractTextFromPDF(buffer: Buffer, fileName: string): Promise<ExtractionResult> {
  console.log(`[extractTextFromPDF] Starting extraction for: ${fileName}`);
  try {
    console.log('[extractTextFromPDF] Loading pdf2json library...');
    const { default: PDFParser } = await import('pdf2json');
    console.log('[extractTextFromPDF] pdf2json loaded successfully');

    return new Promise((resolve) => {
      const pdfParser = new PDFParser();

      pdfParser.on('pdfParser_dataError', (errData: Error | { parserError: Error }) => {
        const errorMessage = errData instanceof Error
          ? errData.message
          : errData.parserError.message;
        resolve({
          success: false,
          error: `Failed to parse PDF: ${errorMessage}`,
        });
      });

      pdfParser.on('pdfParser_dataReady', (pdfData: { Pages: Array<{ Texts: Array<{ R: Array<{ T: string }> }> }> }) => {
        try {
          // Extract text from all pages
          let text = '';
          for (const page of pdfData.Pages || []) {
            for (const textItem of page.Texts || []) {
              for (const textRun of textItem.R || []) {
                // Decode URI-encoded text
                text += decodeURIComponent(textRun.T) + ' ';
              }
            }
            text += '\n\n'; // Page separator
          }

          text = text.trim();

          if (!text || text.length === 0) {
            console.log(`[extractTextFromPDF] No text found in PDF: ${fileName}`);
            resolve({
              success: true,
              content: `[PDF Document: ${fileName}] - No readable text content found in PDF (may be scanned/image-based).`,
            });
            return;
          }

          // Clean up extracted text
          const cleanedText = text
            .replace(/\r\n/g, '\n')
            .replace(/[ \t]+/g, ' ')
            .replace(/\n{3,}/g, '\n\n')
            .trim();

          console.log(`[extractTextFromPDF] Successfully extracted ${cleanedText.length} characters from PDF`);
          console.log(`[extractTextFromPDF] First 500 chars: ${cleanedText.substring(0, 500)}...`);

          resolve({
            success: true,
            content: cleanedText.substring(0, MAX_CONTENT_LENGTH),
          });
        } catch (parseError) {
          resolve({
            success: false,
            error: `Failed to process PDF text: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
          });
        }
      });

      // Parse from buffer instead of file path
      pdfParser.parseBuffer(buffer);
    });
  } catch (error) {
    return {
      success: false,
      error: `Failed to extract PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Extract text from DOCX file using mammoth library
 * Now accepts a Buffer instead of file path
 */
export async function extractTextFromDocx(buffer: Buffer, fileName: string): Promise<ExtractionResult> {
  console.log(`[extractTextFromDocx] Starting extraction for: ${fileName}`);
  try {
    console.log(`[extractTextFromDocx] Buffer size: ${buffer.length} bytes`);

    const result = await mammoth.extractRawText({ buffer });

    if (!result.value || result.value.trim().length === 0) {
      console.log(`[extractTextFromDocx] No text found in DOCX: ${fileName}`);
      return {
        success: true,
        content: `[Word Document: ${fileName}] - No readable text content found in document.`,
      };
    }

    // Log any warnings from mammoth (useful for debugging)
    if (result.messages && result.messages.length > 0) {
      console.log(`[extractTextFromDocx] Warnings for ${fileName}:`, result.messages);
    }

    console.log(`[extractTextFromDocx] Successfully extracted ${result.value.length} characters from DOCX`);
    console.log(`[extractTextFromDocx] First 500 chars: ${result.value.substring(0, 500)}...`);

    return {
      success: true,
      content: result.value.substring(0, MAX_CONTENT_LENGTH),
    };
  } catch (error) {
    console.error(`[extractTextFromDocx] Error extracting DOCX:`, error);
    return {
      success: false,
      error: `Failed to extract DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Extract text from plain text files
 * Now accepts a Buffer instead of file path
 */
export async function extractTextFromText(buffer: Buffer): Promise<ExtractionResult> {
  try {
    const text = buffer.toString('utf-8');

    return {
      success: true,
      content: text.substring(0, MAX_CONTENT_LENGTH),
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to extract text file: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Extract text from Excel files (XLSX)
 */
export async function extractTextFromExcel(fileName: string): Promise<ExtractionResult> {
  try {
    // For now, return a simple message indicating Excel support
    // Full implementation would use xlsx library
    return {
      success: true,
      content: `[Excel file: ${fileName}] - Excel files require special parsing library. Please use PDF export from Excel for full content extraction.`,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to extract Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Extract file content based on file type
 * Now accepts Supabase storage path instead of local file path
 */
export async function safeExtractFileContent(
  storagePath: string,
  fileType: string
): Promise<ExtractionResult> {
  const ext = getExtension(storagePath);
  const fileName = getFileName(storagePath);

  // For Excel files, we don't need to download
  if (ext === '.xlsx' || ext === '.xls') {
    return await extractTextFromExcel(fileName);
  }

  // Download file from Supabase Storage
  const buffer = await getFileBuffer(storagePath);

  if (!buffer) {
    return {
      success: false,
      error: `Failed to download file from storage: ${storagePath}`,
    };
  }

  try {
    switch (ext) {
      case '.pdf':
        return await extractTextFromPDF(buffer, fileName);
      case '.docx':
      case '.doc':
        return await extractTextFromDocx(buffer, fileName);
      case '.txt':
        return await extractTextFromText(buffer);
      default:
        return {
          success: false,
          error: `Unsupported file type: ${ext}. Supported types: PDF, DOCX, TXT, XLSX`,
        };
    }
  } catch (error) {
    return {
      success: false,
      error: `Error processing file: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Extract content from multiple files
 * Now accepts Supabase storage paths instead of local file paths
 */
export async function extractMultipleFiles(
  files: Array<{ storagePath: string; fileName: string; fileType: string }>
): Promise<DocumentContent[]> {
  const results: DocumentContent[] = [];

  for (const file of files) {
    const extraction = await safeExtractFileContent(file.storagePath, file.fileType);

    if (extraction.success && extraction.content) {
      results.push({
        fileName: file.fileName,
        content: extraction.content,
        type: file.fileType,
      });
    } else {
      // Still include failed files in results with error message
      results.push({
        fileName: file.fileName,
        content: `[Error: ${extraction.error}]`,
        type: file.fileType,
      });
    }
  }

  return results;
}
