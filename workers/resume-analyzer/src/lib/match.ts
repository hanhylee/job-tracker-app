import type { CloudflareBindings } from '../types';
import { cosineSimilarity, embedTexts } from './ai';
import type { JdExtract, ResumeExtract } from './analysis-types';
import type { z } from 'zod';
import { keywordMatchSchema } from './analysis-types';

type KeywordMatch = z.infer<typeof keywordMatchSchema>;

const SEMANTIC_THRESHOLD = 0.75;

function normalizeTerm(term: string): string {
  return term.toLowerCase().replace(/[^a-z0-9+#.\s-]/g, '').trim();
}

function resumeCorpus(resume: ResumeExtract): string {
  const parts = [
    ...resume.skills,
    ...resume.jobTitles,
    ...resume.bullets.map((b) => b.text),
    ...resume.education,
  ];
  return parts.join('\n').toLowerCase();
}

function fuzzyIncludes(corpus: string, term: string): boolean {
  const n = normalizeTerm(term);
  if (!n) return false;
  if (corpus.includes(n)) return true;
  const tokens = n.split(/\s+/).filter((t) => t.length > 2);
  if (tokens.length === 0) return false;
  return tokens.every((t) => corpus.includes(t));
}

function findLocations(
  resume: ResumeExtract,
  term: string,
): string[] {
  const locations: string[] = [];
  const n = normalizeTerm(term);
  for (const skill of resume.skills) {
    if (normalizeTerm(skill).includes(n) || n.includes(normalizeTerm(skill))) {
      locations.push('Skills');
      break;
    }
  }
  resume.bullets.forEach((bullet, i) => {
    if (fuzzyIncludes(bullet.text.toLowerCase(), term)) {
      locations.push(
        bullet.section
          ? `${bullet.section} bullet ${i + 1}`
          : `Experience bullet ${i + 1}`,
      );
    }
  });
  for (const title of resume.jobTitles) {
    if (fuzzyIncludes(title.toLowerCase(), term)) {
      locations.push(`Title: ${title}`);
    }
  }
  return [...new Set(locations)];
}

function matchTerms(
  terms: string[],
  resume: ResumeExtract,
  corpus: string,
): KeywordMatch[] {
  return terms.map((term) => {
    const exact = corpus.includes(normalizeTerm(term));
    const fuzzy = !exact && fuzzyIncludes(corpus, term);
    const found = exact || fuzzy;
    return {
      term,
      found,
      locations: found ? findLocations(resume, term) : [],
      matchType: exact ? 'exact' : fuzzy ? 'fuzzy' : undefined,
    };
  });
}

export async function buildMatchContext(
  env: Pick<CloudflareBindings, 'AI'>,
  jd: JdExtract,
  resume: ResumeExtract,
): Promise<{
  keywordMatches: { required: KeywordMatch[]; preferred: KeywordMatch[] };
  semanticMatches: Array<{
    jdTerm: string;
    resumeSnippet: string;
    score: number;
  }>;
}> {
  const corpus = resumeCorpus(resume);
  const requiredTerms = [
    ...jd.mustHaveKeywords,
    ...jd.requiredSkills,
    ...jd.tools,
  ];
  const preferredTerms = [...jd.preferredSkills, ...jd.softSkills];

  const required = matchTerms([...new Set(requiredTerms)], resume, corpus);
  const preferred = matchTerms([...new Set(preferredTerms)], resume, corpus);

  const missingRequired = required.filter((m) => !m.found).slice(0, 12);
  const bulletSnippets = resume.bullets.map((b) => b.text).slice(0, 20);
  const semanticMatches: Array<{
    jdTerm: string;
    resumeSnippet: string;
    score: number;
  }> = [];

  if (missingRequired.length > 0 && bulletSnippets.length > 0) {
    const jdTexts = missingRequired.map((m) => m.term);
    const allTexts = [...jdTexts, ...bulletSnippets];
    try {
      const vectors = await embedTexts(env, allTexts);
      const jdVectors = vectors.slice(0, jdTexts.length);
      const bulletVectors = vectors.slice(jdTexts.length);
      for (let i = 0; i < jdTexts.length; i++) {
        const jdVec = jdVectors[i];
        if (!jdVec) continue;
        let bestScore = 0;
        let bestSnippet = '';
        for (let j = 0; j < bulletVectors.length; j++) {
          const bVec = bulletVectors[j];
          if (!bVec) continue;
          const score = cosineSimilarity(jdVec, bVec);
          if (score > bestScore) {
            bestScore = score;
            bestSnippet = bulletSnippets[j] ?? '';
          }
        }
        if (bestScore >= SEMANTIC_THRESHOLD) {
          semanticMatches.push({
            jdTerm: jdTexts[i]!,
            resumeSnippet: bestSnippet.slice(0, 200),
            score: Math.round(bestScore * 100) / 100,
          });
          const req = required.find((r) => r.term === jdTexts[i]);
          if (req && !req.found) {
            req.found = true;
            req.matchType = 'semantic';
            req.locations = ['Semantic match in experience'];
          }
        }
      }
    } catch (err) {
      console.error('[semantic match]', err);
    }
  }

  return {
    keywordMatches: { required, preferred },
    semanticMatches,
  };
}

export function scoreFromMatches(
  matches: KeywordMatch[],
  weight = 1,
): number {
  if (matches.length === 0) return 100;
  const found = matches.filter((m) => m.found).length;
  return Math.round((found / matches.length) * 100 * weight);
}
