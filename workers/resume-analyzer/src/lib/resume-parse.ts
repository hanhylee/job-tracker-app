import type { ResumeExtract } from './analysis-types';

const SECTION_NAMES = [
  'skills',
  'technical skills',
  'core competencies',
  'education',
  'experience',
  'work experience',
  'employment',
  'professional experience',
  'projects',
  'summary',
  'profile',
  'objective',
  'qualifications',
] as const;

type SectionName = (typeof SECTION_NAMES)[number];

const SECTION_LINE = new RegExp(
  `^\\s*(${SECTION_NAMES.join('|')})\\s*[:.]?\\s*$`,
  'i',
);

const INLINE_SECTION = new RegExp(
  `^\\s*(${SECTION_NAMES.join('|')})\\b\\s*[:.]?\\s*(.*)$`,
  'i',
);

const BULLET_PREFIX = /^[\s]*(?:[-•*◦▪●]|\d+[.)])\s+(.+)$/;

const DATE_RANGE =
  /\b(19|20)\d{2}\s*[-–—]\s*(?:present|current|(19|20)\d{2})\b/i;

const TITLE_AT_COMPANY =
  /^(.{2,80}?)\s+(?:at|@)\s+(.+?)(?:\s*[(|]|\s+(19|20)\d{2}|$)/i;

const TITLE_EMDASH =
  /^(.{2,80}?)\s*[—–|]\s*(.+?)(?:\s*[(|]|\s+(19|20)\d{2}|$)/;

const YEARS_PATTERNS = [
  /\b(\d{1,2})\+?\s*years?\s+(?:of\s+)?(?:professional\s+)?experience\b/i,
  /\bwith\s+(\d{1,2})\+?\s*years?\b/i,
  /\b(\d{1,2})\+?\s*years?\s+(?:building|working|in)\b/i,
];

const SENIORITY_PATTERN =
  /\b(intern|internship|junior|entry[- ]level|mid[- ]level|middle|senior|staff|principal|lead|manager)\b/i;

const ACTION_VERB_START =
  /^(built|developed|delivered|led|managed|increased|reduced|improved|created|designed|implemented|optimized|automated|collaborated|spearheaded|achieved|grew|launched|maintained|worked|wrote|deployed|migrated|scaled|architected|engineered|researched|analyzed|coordinated|supported|trained|mentored|presented|published|integrated|refactored|debugged|tested|documented|established|streamlined|accelerated|enhanced|facilitated|oversaw|owned|partnered|performed|produced|provided|resolved|secured|simplified|standardized|supervised|translated|upgraded|utilized|volunteered)\b/i;

/** Deterministic parse of plain resume text (no LLM). */
export function parseResumeFromText(text: string): ResumeExtract {
  const normalized = text.replace(/\r\n/g, '\n').trim();
  const sections =
    normalized.split('\n').length <= 4
      ? splitSectionsFlat(normalized)
      : splitSections(normalized);

  const skills = parseSkillsList(sections.get('skills') ?? '');
  const education = parseEducationEntries(sections.get('education') ?? '');
  const experienceText = [
    sections.get('experience'),
    sections.get('projects'),
  ]
    .filter(Boolean)
    .join('\n');

  const bullets = extractBullets(experienceText);
  const jobTitles = extractJobTitles(experienceText, normalized);
  const headline = extractHeadline(sections.get('summary') ?? '', normalized);
  const totalYearsExperience = extractYears(normalized);
  const seniority = extractSeniority(normalized, jobTitles, headline);

  return {
    skills,
    jobTitles,
    headline,
    totalYearsExperience,
    seniority,
    bullets,
    education,
  };
}

const FLAT_SECTION_MARKER = new RegExp(
  `\\b(${SECTION_NAMES.join('|')})\\b`,
  'gi',
);

/** Split single-line or PDF-flattened resumes (few newlines). */
function splitSectionsFlat(text: string): Map<string, string> {
  const sections = new Map<string, string>();
  const matches = [...text.matchAll(FLAT_SECTION_MARKER)];
  if (matches.length === 0) {
    sections.set('_preamble', text);
    return sections;
  }

  if (matches[0]!.index! > 0) {
    sections.set('_preamble', text.slice(0, matches[0]!.index!).trim());
  }

  for (let i = 0; i < matches.length; i++) {
    const key = normalizeSectionKey(matches[i]![1]!);
    const start = matches[i]!.index! + matches[i]![0].length;
    const end = matches[i + 1]?.index ?? text.length;
    const body = text.slice(start, end).trim();
    if (body) {
      const prev = sections.get(key) ?? '';
      sections.set(key, prev ? `${prev}\n${body}` : body);
    }
  }
  return sections;
}

function splitSections(text: string): Map<SectionName | string, string> {
  const sections = new Map<string, string>();
  let current: string | null = null;
  const buffer: string[] = [];

  const flush = () => {
    if (current && buffer.length > 0) {
      const prev = sections.get(current) ?? '';
      sections.set(current, prev ? `${prev}\n${buffer.join('\n')}` : buffer.join('\n'));
    }
    buffer.length = 0;
  };

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;

    const sectionOnly = line.match(SECTION_LINE);
    if (sectionOnly) {
      flush();
      current = normalizeSectionKey(sectionOnly[1]!);
      continue;
    }

    const inline = line.match(INLINE_SECTION);
    if (inline) {
      flush();
      current = normalizeSectionKey(inline[1]!);
      const rest = inline[2]?.trim();
      if (rest) buffer.push(rest);
      continue;
    }

    if (current) {
      buffer.push(line);
    } else if (!sections.has('_preamble')) {
      sections.set('_preamble', line);
    } else {
      sections.set('_preamble', `${sections.get('_preamble')}\n${line}`);
    }
  }
  flush();
  return sections;
}

function normalizeSectionKey(raw: string): SectionName | string {
  const k = raw.toLowerCase().trim();
  if (k.includes('skill') || k === 'core competencies') return 'skills';
  if (k.includes('education')) return 'education';
  if (
    k.includes('experience') ||
    k.includes('employment') ||
    k === 'work history'
  ) {
    return 'experience';
  }
  if (k.includes('project')) return 'projects';
  if (k === 'summary' || k === 'profile' || k === 'objective') return 'summary';
  return k;
}

function parseSkillsList(sectionText: string): string[] {
  if (!sectionText.trim()) return [];
  const items = new Set<string>();
  for (const line of sectionText.split('\n')) {
    const cleaned = line.replace(BULLET_PREFIX, '$1').trim();
    if (!cleaned) continue;
    const parts = /[,;|•/]/.test(cleaned)
      ? cleaned.split(/[,;|•/]/)
      : cleaned.split(/\s+/);
    for (const part of parts) {
      const skill = part.trim();
      if (skill.length >= 2 && skill.length <= 60) items.add(skill);
    }
  }
  return [...items];
}

function parseEducationEntries(sectionText: string): string[] {
  if (!sectionText.trim()) return [];
  return sectionText
    .split('\n')
    .map((l) => l.replace(BULLET_PREFIX, '$1').trim())
    .filter((l) => l.length > 2);
}

function extractBullets(experienceText: string): ResumeExtract['bullets'] {
  if (!experienceText.trim()) return [];

  const bullets: ResumeExtract['bullets'] = [];
  const lines = experienceText.split('\n').map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    const bulletMatch = line.match(BULLET_PREFIX);
    if (bulletMatch) {
      bullets.push({ section: 'Experience', text: bulletMatch[1]!.trim() });
      continue;
    }
    const sentences = splitActionSentences(line);
    if (isJobTitleLine(line) && sentences.length <= 1) continue;

    if (ACTION_VERB_START.test(line) && sentences.length <= 1) {
      bullets.push({ section: 'Experience', text: line });
      continue;
    }

    for (const sentence of sentences) {
      if (sentence.length >= 12 && !isJobTitleLine(sentence)) {
        bullets.push({ section: 'Experience', text: sentence });
      }
    }
  }

  return bullets;
}

function splitActionSentences(line: string): string[] {
  if (line.length < 40) return [line];

  const parts = line.split(
    /\s+(?=(?:Built|Developed|Delivered|Led|Managed|Increased|Reduced|Improved|Created|Designed|Implemented|Optimized|Automated|Collaborated|Spearheaded|Achieved|Grew|Launched|Maintained|Worked|Wrote|Deployed|Migrated|Scaled|Architected|Engineered|Researched|Analyzed|Coordinated|Supported|Trained|Mentored|Presented|Published|Integrated|Refactored)\b)/,
  );

  if (parts.length > 1) return parts.map((p) => p.trim()).filter(Boolean);
  return [line];
}

function isJobTitleLine(line: string): boolean {
  if (line.length > 120) return false;
  if (DATE_RANGE.test(line)) return true;
  if (TITLE_AT_COMPANY.test(line)) return true;
  if (TITLE_EMDASH.test(line)) return true;
  if (
    /^(senior|junior|lead|staff|principal|associate)?\s*(software|data|ml|ai|backend|frontend|full[- ]?stack|devops|platform|systems|cloud|security|mobile|web|product|project|business|marketing|sales|operations|financial|research|teaching)\s+(engineer|developer|analyst|scientist|manager|intern|architect|consultant|designer|specialist)\b/i.test(
      line,
    ) &&
    !ACTION_VERB_START.test(line)
  ) {
    return true;
  }
  return false;
}

function extractJobTitles(experienceText: string, fullText: string): string[] {
  const titles = new Set<string>();

  for (const line of experienceText.split('\n').map((l) => l.trim())) {
    if (!line || !isJobTitleLine(line)) continue;
    const cleaned = line
      .replace(DATE_RANGE, '')
      .replace(TITLE_AT_COMPANY, '$1')
      .replace(TITLE_EMDASH, '$1')
      .trim();
    if (cleaned.length >= 3 && cleaned.length <= 80) titles.add(cleaned);
  }

  const seniorInHead = fullText.slice(0, 600).match(
    /\b((?:senior|junior|lead|staff|principal|associate)\s+)?(?:software|data|full[- ]?stack|backend|frontend)\s+(?:engineer|developer|architect)\b/gi,
  );
  if (seniorInHead) {
    for (const m of seniorInHead) titles.add(m.trim());
  }

  return [...titles];
}

function extractHeadline(summary: string, fullText: string): string | null {
  const fromSummary = summary.split('\n')[0]?.trim();
  if (fromSummary && fromSummary.length >= 5 && fromSummary.length <= 120) {
    return fromSummary;
  }

  const preamble = fullText.split('\n')[0]?.trim();
  if (
    preamble &&
    preamble.length >= 5 &&
    preamble.length <= 120 &&
    !preamble.includes('@') &&
    !/^\(?\d{3}\)?/.test(preamble)
  ) {
    const roleMatch = preamble.match(
      /\b((?:senior|junior)?\s*(?:software|data)\s+(?:engineer|developer))\b/i,
    );
    if (roleMatch) return roleMatch[1]!;
  }

  const yearsLine = fullText.match(
    /\b(senior|junior)?\s*[\w\s]{0,30}(engineer|developer|analyst)[^.]{0,40}\d+\s*years?/i,
  );
  if (yearsLine) return yearsLine[0].slice(0, 120).trim();

  return null;
}

function extractYears(text: string): number | null {
  let best: number | null = null;
  for (const pattern of YEARS_PATTERNS) {
    const m = text.match(pattern);
    if (m?.[1]) {
      const n = parseInt(m[1], 10);
      if (!Number.isNaN(n) && (best == null || n > best)) best = n;
    }
  }
  return best;
}

function extractSeniority(
  text: string,
  jobTitles: string[],
  headline: string | null,
): string | null {
  const haystack = [headline, ...jobTitles, text.slice(0, 800)]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const m = haystack.match(SENIORITY_PATTERN);
  if (!m) return null;
  const word = m[1]!.toLowerCase();
  if (word.includes('intern')) return 'intern';
  if (word.includes('junior') || word.includes('entry')) return 'junior';
  if (word.includes('senior') || word.includes('staff') || word.includes('principal'))
    return 'senior';
  if (word.includes('lead') || word.includes('manager')) return 'lead';
  if (word.includes('mid') || word.includes('middle')) return 'mid';
  return word;
}
