import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';

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
 * Extract text from PDF file using pdf2json library
 * pdf2json is pure JavaScript with no canvas/DOM dependencies
 */
export async function extractTextFromPDF(filePath: string): Promise<ExtractionResult> {
  try {
    const { default: PDFParser } = await import('pdf2json');

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
            resolve({
              success: true,
              content: `[PDF Document: ${path.basename(filePath)}] - No readable text content found in PDF (may be scanned/image-based).`,
            });
            return;
          }

          // Clean up extracted text
          const cleanedText = text
            .replace(/\r\n/g, '\n')
            .replace(/[ \t]+/g, ' ')
            .replace(/\n{3,}/g, '\n\n')
            .trim();

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

      pdfParser.loadPDF(filePath);
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
 */
export async function extractTextFromDocx(filePath: string): Promise<ExtractionResult> {
  try {
    const fileBuffer = fs.readFileSync(filePath);

    const result = await mammoth.extractRawText({ buffer: fileBuffer });

    if (!result.value || result.value.trim().length === 0) {
      return {
        success: true,
        content: `[Word Document: ${path.basename(filePath)}] - No readable text content found in document.`,
      };
    }

    // Log any warnings from mammoth (useful for debugging)
    if (result.messages && result.messages.length > 0) {
      console.warn(`[extractTextFromDocx] Warnings during DOCX processing.`);
    }

    return {
      success: true,
      content: result.value.substring(0, MAX_CONTENT_LENGTH),
    };
  } catch (error) {
    console.error(`[extractTextFromDocx] Error extracting DOCX`);
    return {
      success: false,
      error: `Failed to extract DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Extract text from plain text files
 */
export async function extractTextFromText(filePath: string): Promise<ExtractionResult> {
  try {
    const text = fs.readFileSync(filePath, 'utf-8');

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
export async function extractTextFromExcel(filePath: string): Promise<ExtractionResult> {
  try {
    // For now, return a simple message indicating Excel support
    // Full implementation would use xlsx library
    return {
      success: true,
      content: `[Excel file: ${path.basename(filePath)}] - Excel files require special parsing library. Please use PDF export from Excel for full content extraction.`,
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
 */
export async function safeExtractFileContent(
  filePath: string,
  fileType: string
): Promise<ExtractionResult> {
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return {
      success: false,
      error: `File not found: ${filePath}`,
    };
  }

  const ext = path.extname(filePath).toLowerCase();

  try {
    switch (ext) {
      case '.pdf':
        return await extractTextFromPDF(filePath);
      case '.docx':
      case '.doc':
        return await extractTextFromDocx(filePath);
      case '.txt':
        return await extractTextFromText(filePath);
      case '.xlsx':
      case '.xls':
        return await extractTextFromExcel(filePath);
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
 */
export async function extractMultipleFiles(
  filePaths: Array<{ path: string; fileName: string; fileType: string }>
): Promise<DocumentContent[]> {
  const results: DocumentContent[] = [];

  for (const file of filePaths) {
    const extraction = await safeExtractFileContent(file.path, file.fileType);

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
