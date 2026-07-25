import { rmSync } from 'fs';
import path from 'path';

export default async function globalTeardown() {
  // Clean up temp upload directory
  const uploadsDir = path.resolve(__dirname, '../.tmp-uploads');
  try {
    rmSync(uploadsDir, { recursive: true, force: true });
  } catch {
    // ignore if doesn't exist
  }

  console.log('[Integration] Cleanup complete.');
}
