import { createHash } from 'node:crypto';

// A short digest shown beside the guide downloads, so two copies of a guide can
// be compared without opening them.
export function fileChecksum(bytes) {
  return createHash('md5').update(bytes).digest('hex');
}
