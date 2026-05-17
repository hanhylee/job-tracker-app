const UNSAFE_CHARS = /[\\/:*?"<>|\x00-\x1f]/g;
const WHITESPACE = /\s+/g;
const MAX_LENGTH = 120;

function sanitizePart(value: string): string {
  return value
    .replace(UNSAFE_CHARS, '')
    .replace(WHITESPACE, ' ')
    .trim();
}

export function resumeDownloadFilename(company: string, title: string): string {
  const companyPart = sanitizePart(company);
  const titlePart = sanitizePart(title);
  const base =
    companyPart && titlePart
      ? `${companyPart}-${titlePart}`
      : companyPart || titlePart;

  if (!base) {
    return 'resume.pdf';
  }

  const truncated =
    base.length > MAX_LENGTH ? base.slice(0, MAX_LENGTH).trim() : base;

  return `${truncated || 'resume'}.pdf`;
}
