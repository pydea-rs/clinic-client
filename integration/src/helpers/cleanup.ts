import { rmSync } from 'fs';
import path from 'path';

export function cleanUploads(): void {
  const uploadsDir = path.resolve(__dirname, '../../.tmp-uploads');
  try {
    rmSync(uploadsDir, { recursive: true, force: true });
  } catch {
    // ignore
  }
}
