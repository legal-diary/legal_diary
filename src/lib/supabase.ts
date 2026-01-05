import { createClient } from '@supabase/supabase-js';

// Validate required environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Supabase environment variables not configured. File storage will not work.');
}

// Server-side client with service role (for API routes)
// This client has full access to storage and bypasses RLS
export const supabaseAdmin = createClient(
  supabaseUrl || '',
  supabaseServiceKey || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Storage bucket name
export const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'case-documents';

/**
 * Generate a storage path for a file
 * Format: caseId/timestamp-sanitizedFileName
 */
export function getStoragePath(caseId: string, fileName: string): string {
  const timestamp = Date.now();
  const sanitizedFileName = sanitizeFileName(fileName);
  return `${caseId}/${timestamp}-${sanitizedFileName}`;
}

/**
 * Sanitize filename to remove potentially dangerous characters
 */
function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9._\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .substring(0, 255); // Limit length
}

/**
 * Generate a signed URL for secure file access
 * @param storagePath - The path to the file in Supabase Storage
 * @param expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns Signed URL or null if error
 */
export async function getSignedUrl(
  storagePath: string,
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(storagePath, expiresIn);

    if (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Error creating signed URL:', error);
    return null;
  }
}

/**
 * Upload a file to Supabase Storage
 * @param storagePath - The path where the file will be stored
 * @param buffer - The file content as a Buffer
 * @param contentType - The MIME type of the file
 * @returns Upload result with path or error
 */
export async function uploadFile(
  storagePath: string,
  buffer: Buffer,
  contentType: string
): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, buffer, {
        contentType,
        upsert: false, // Don't overwrite existing files
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, path: data.path };
  } catch (error) {
    console.error('Error uploading file:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Download a file from Supabase Storage
 * @param storagePath - The path to the file in storage
 * @returns File buffer or null if error
 */
export async function downloadFile(storagePath: string): Promise<Buffer | null> {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .download(storagePath);

    if (error) {
      console.error('Error downloading file:', error);
      return null;
    }

    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('Error downloading file:', error);
    return null;
  }
}

/**
 * Delete a file from Supabase Storage
 * @param storagePath - The path to the file in storage
 * @returns Success status
 */
export async function deleteFile(storagePath: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .remove([storagePath]);

    if (error) {
      console.error('Error deleting file:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
}

/**
 * Delete multiple files from Supabase Storage
 * @param storagePaths - Array of file paths to delete
 * @returns Number of successfully deleted files
 */
export async function deleteFiles(storagePaths: string[]): Promise<number> {
  if (storagePaths.length === 0) return 0;

  try {
    const { error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .remove(storagePaths);

    if (error) {
      console.error('Error deleting files:', error);
      return 0;
    }

    return storagePaths.length;
  } catch (error) {
    console.error('Error deleting files:', error);
    return 0;
  }
}
