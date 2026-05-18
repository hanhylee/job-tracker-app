export type FormatCheckResult = {
  score: number;
  risks: string[];
  tips: string[];
  wordCount: number;
};

const SECTION_HEADERS = [
  'experience',
  'work history',
  'employment',
  'professional experience',
  'education',
  'skills',
  'summary',
  'profile',
  'qualifications',
];

const EMAIL_PATTERN = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const PHONE_PATTERN = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;

export function checkResumeFormatting(resumeText: string): FormatCheckResult {
  const risks: string[] = [];
  const tips: string[] = [];
  const text = resumeText.trim();
  const lower = text.toLowerCase();

  if (text.length < 200) {
    risks.push('Resume text is very short; ATS may not parse enough content.');
  }

  const sectionsFound = SECTION_HEADERS.filter((h) => lower.includes(h));
  if (sectionsFound.length === 0) {
    risks.push(
      'No standard section headings found — use labels like Experience, Education, and Skills.',
    );
  } else {
    if (!sectionsFound.some((s) => s.includes('experience') || s.includes('employment'))) {
      tips.push('Add a clear "Experience" or "Work History" heading so ATS can find your roles.');
    }
    if (!sectionsFound.includes('skills')) {
      tips.push('Consider a dedicated Skills section for tools the job description mentions.');
    }
  }

  if (!EMAIL_PATTERN.test(text) && !PHONE_PATTERN.test(text)) {
    risks.push('No email or phone detected — contact info helps recruiters reach you after ATS screening.');
  }

  const tabCount = (text.match(/\t/g) ?? []).length;
  const pipeRows = (text.match(/^[^\n]*\|[^\n]*$/gm) ?? []).length;
  if (tabCount > 8 || pipeRows >= 3) {
    risks.push(
      'Table or multi-column layout detected — ATS often misreads tables; use a single-column format.',
    );
  }

  if (/\b(see\s+attached|portfolio\s+link|graphic|infographic|chart|image)\b/i.test(text)) {
    risks.push(
      'Non-text elements (graphics, charts) are invisible to most ATS — put key details in plain text.',
    );
  }

  const specialRatio =
    (text.match(/[^\w\s@.,\-+()/#'"]/g) ?? []).length / Math.max(text.length, 1);
  if (specialRatio > 0.08) {
    risks.push('Unusual characters may confuse ATS parsers — stick to standard punctuation.');
  }

  const wordCount = text.split(/\s+/).filter(Boolean).length;
  if (wordCount < 300) {
    risks.push(
      `Resume is short (${wordCount} words) — aim for at least 300–400 words so ATS has enough content to parse.`,
    );
  } else if (wordCount < 500) {
    tips.push(
      `Word count is ${wordCount} — adding more detail to bullets (metrics, tools, outcomes) can strengthen parsing.`,
    );
  } else if (wordCount > 1200) {
    tips.push(
      `Resume is ${wordCount} words — consider trimming to under 1000 words for faster recruiter scanning.`,
    );
  }

  if (risks.length === 0) {
    tips.push(
      'Use a simple single-column layout with standard fonts (Arial, Calibri, Times) when saving as PDF.',
    );
  }

  const score =
    risks.length === 0 ? 95 : risks.length === 1 ? 78 : risks.length === 2 ? 62 : 45;

  return { score, risks, tips, wordCount };
}
