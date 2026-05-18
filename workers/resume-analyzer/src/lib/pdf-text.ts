import { extractText, getDocumentProxy } from 'unpdf';

const MIN_TEXT_LENGTH = 80;

export async function extractPdfText(pdfBytes: ArrayBuffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(pdfBytes));
  const { text } = await extractText(pdf, { mergePages: true });
  const raw =
    typeof text === 'string' ? text : (text as string[]).join('\n');
  const normalized = raw.replace(/\r\n/g, '\n').trim();
  if (normalized.length < MIN_TEXT_LENGTH) {
    throw new Error(
      'Could not extract enough text from PDF. Use a text-based PDF (not a scanned image).',
    );
  }
  return normalized;
}
