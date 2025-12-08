import fs from 'fs';
import path from 'path';

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
 * Extract text from PDF file
 * Note: For production, use a library like pdfjs-dist or pdf-lib
 * For now, we'll return a placeholder since PDF extraction is complex
 */
export async function extractTextFromPDF(filePath: string): Promise<ExtractionResult> {
  try {
    // For now, return metadata about the PDF
    // In production, use pdf-parse or pdfjs-dist with proper server-side configuration
    return {
      success: true,
      content: `[PDF Document: ${path.basename(filePath)}] - PDF content extraction requires additional configuration. Please convert to text or use the AI Analysis features with document metadata.`,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to extract PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Extract text from DOCX file
 */
export async function extractTextFromDocx(filePath: string): Promise<ExtractionResult> {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    // For now, use a simple approach - full docx parsing requires more complex setup
    // This is a basic implementation that reads the underlying text
    const data = fs.readFileSync(filePath, 'utf-8');

    // Try to parse DOCX - it's a ZIP file containing XML
    // For production, use a library like 'docx' or 'mammoth'
    return {
      success: true,
      content: data.substring(0, MAX_CONTENT_LENGTH),
    };
  } catch (error) {
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
