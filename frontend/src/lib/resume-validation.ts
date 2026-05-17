export const MAX_RESUME_BYTES = 5 * 1024 * 1024;

export async function validateResumeFile(file: File): Promise<string | null> {
  if (
    !file.type.includes('pdf') &&
    !file.name.toLowerCase().endsWith('.pdf')
  ) {
    return 'File must be a PDF';
  }

  if (file.size > MAX_RESUME_BYTES) {
    return 'Resume must be at most 5 MB';
  }

  if (file.size < 5) {
    return 'Invalid PDF file';
  }

  const header = await file.slice(0, 4).arrayBuffer();
  const bytes = new Uint8Array(header);
  if (
    bytes[0] !== 0x25 ||
    bytes[1] !== 0x50 ||
    bytes[2] !== 0x44 ||
    bytes[3] !== 0x46
  ) {
    return 'Invalid PDF file';
  }

  return null;
}
