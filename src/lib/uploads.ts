import path from 'path';
import fs from 'fs';

const UPLOADS_ROOT = path.join(process.cwd(), 'uploads');

export function getUploadsRoot(): string {
  return UPLOADS_ROOT;
}

export function normalizeStoredPath(fileUrl: string): string {
  const trimmed = fileUrl.replace(/^\/+/, '');
  if (trimmed.startsWith('uploads/')) {
    return trimmed.replace(/^uploads\//, '');
  }
  return trimmed;
}

export function resolveStoredPath(fileUrl: string): string {
  const normalized = normalizeStoredPath(fileUrl);
  const primaryPath = path.join(UPLOADS_ROOT, normalized);
  if (fs.existsSync(primaryPath)) {
    return primaryPath;
  }

  return path.join(process.cwd(), 'public', 'uploads', normalized);
}

export function buildStoredPath(caseId: string, fileName: string): string {
  return path.posix.join(caseId, fileName);
}
