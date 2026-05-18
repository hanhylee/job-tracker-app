import type { CloudflareBindings } from '../types';
import { cosineSimilarity, embedTexts } from './ai';
import type { ResumeExtract, KeywordMatch } from './analysis-types';

export const SEMANTIC_THRESHOLD = 0.75;
export const SEMANTIC_CAP_RATIO = 0.3;

export function normalizeTerm(term: string): string {
  return term.toLowerCase().replace(/[^a-z0-9+#.\s-]/g, '').trim();
}

/**
 * Lightweight English verb/noun stemming for resume skill matching.
 * Returns a set of surface-form variants (stem + common inflections) so that
 * "troubleshoot" ↔ "troubleshooting", "automate" ↔ "automation", etc.
 */
export function stemVariants(word: string): string[] {
  const w = word.toLowerCase().trim();
  const out = new Set<string>([w]);

  // Noun/adjective → verb forms (forward direction: JD has verb, resume has derived noun)
  // automate → automation, automating, automated
  if (w.endsWith('ate') && w.length > 5) {
    const base = w.slice(0, -1); // automat
    out.add(base + 'ion');       // automation
    out.add(base + 'ing');       // automating  (drop e)
    out.add(base + 'ed');        // automated   (drop e)
  }
  // troubleshoot → troubleshooting, troubleshooted
  if (!w.endsWith('ing') && !w.endsWith('ed') && !w.endsWith('ion')) {
    out.add(w + 'ing');
    out.add(w + 'ed');
    out.add(w + 's');
  }

  // -ation → bare verb stem and inflections (backward: resume has noun, JD has verb)
  if (w.endsWith('ation')) {
    const base = w.slice(0, -3); // automat  (remove "ion")
    out.add(base);               // automat
    out.add(base + 'e');         // automate
    out.add(base + 'ing');       // automating
    out.add(base + 'ed');        // automated
  } else if (w.endsWith('sion')) {
    const base = w.slice(0, -3);
    out.add(base + 'e');
    out.add(base + 'ing');
    out.add(base + 'ed');
  }

  // -ing → bare stem
  if (w.endsWith('ing') && w.length > 5) {
    const base = w.slice(0, -3);
    out.add(base);           // troubleshoot
    out.add(base + 'e');     // manage
    out.add(base + 'ed');
    // double-consonant: running → run
    if (base.length >= 3) {
      const last = base[base.length - 1];
      const secondLast = base[base.length - 2];
      if (last === secondLast && /[bcdfghjklmnpqrstvwxyz]/.test(last!)) {
        out.add(base.slice(0, -1));
      }
    }
  }

  // -ed → bare stem
  if (w.endsWith('ed') && w.length > 4) {
    const base = w.slice(0, -2);
    out.add(base);
    out.add(base + 'ing');
    if (base.endsWith('e')) {
      out.add(base.slice(0, -1) + 'ing');
    }
  }

  // -s / -es → bare
  if (w.endsWith('es') && w.length > 4) {
    out.add(w.slice(0, -2));
    out.add(w.slice(0, -1));
  } else if (w.endsWith('s') && w.length > 3 && !w.endsWith('ss')) {
    out.add(w.slice(0, -1));
  }

  // -ment → base verb
  if (w.endsWith('ment') && w.length > 6) {
    const base = w.slice(0, -4);
    out.add(base);
    out.add(base + 'ing');
  }

  // -er / -or → base verb
  if ((w.endsWith('er') || w.endsWith('or')) && w.length > 4) {
    const base = w.slice(0, -2);
    out.add(base);
    out.add(base + 'ing');
    out.add(base + 'ed');
  }

  return [...out];
}

export function expandTermVariants(term: string): string[] {
  const variants = new Set<string>();
  const add = (value: string) => {
    const n = normalizeTerm(value);
    if (n) variants.add(n);
  };

  add(term);

  // C/C++ → ["c", "c++"]
  if (term.includes('/')) {
    for (const part of term.split('/')) add(part);
  }

  const normalized = normalizeTerm(term);

  // Hyphen variants: multi-threading → multithreading, multi threading
  if (normalized.includes('-')) {
    add(normalized.replace(/-/g, ''));
    add(normalized.replace(/-/g, ' '));
  }

  // Dot variants: node.js → nodejs, node js
  if (normalized.includes('.')) {
    add(normalized.replace(/\./g, ''));
    add(normalized.replace(/\./g, ' '));
  }

  // Morphological stem variants (single-word terms only)
  if (!normalized.includes(' ') && !normalized.includes('-')) {
    for (const sv of stemVariants(normalized)) add(sv);
  }

  return [...variants];
}

export function resumeCorpus(resumeText: string): string {
  return resumeText.toLowerCase();
}

export function fuzzyIncludes(corpus: string, term: string): boolean {
  const variants = expandTermVariants(term);
  for (const n of variants) {
    if (!n) continue;
    if (corpus.includes(n)) return true;
    const tokens = n.split(/\s+/).filter((t) => t.length > 2);
    if (tokens.length > 0 && tokens.every((t) => corpus.includes(t))) return true;
  }
  return false;
}

export function findLocations(resume: ResumeExtract, term: string): string[] {
  const locations: string[] = [];
  const n = normalizeTerm(term);
  for (const skill of resume.skills) {
    if (fuzzyIncludes(skill.toLowerCase(), term)) {
      locations.push('Skills');
      break;
    }
  }
  for (const entry of resume.education) {
    if (fuzzyIncludes(entry.toLowerCase(), term)) {
      locations.push('Education');
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
  if (resume.headline && fuzzyIncludes(resume.headline.toLowerCase(), term)) {
    locations.push(`Headline: ${resume.headline}`);
  }
  return [...new Set(locations)];
}

export function hasExperiencePlacement(locations: string[]): boolean {
  return locations.some(
    (l) => l.includes('bullet') || l.startsWith('Title:') || l.startsWith('Headline:'),
  );
}

export function matchTerms(
  terms: string[],
  resume: ResumeExtract,
  corpus: string,
): KeywordMatch[] {
  const unique = [...new Set(terms.map((t) => t.trim()).filter(Boolean))];
  return unique.map((term) => {
    const variants = expandTermVariants(term);
    let exact = false;
    let fuzzy = false;
    for (const v of variants) {
      if (corpus.includes(v)) {
        exact = true;
        break;
      }
    }
    if (!exact) fuzzy = fuzzyIncludes(corpus, term);
    const found = exact || fuzzy;
    return {
      term,
      found,
      locations: found ? findLocations(resume, term) : [],
      matchType: exact ? 'exact' : fuzzy ? 'fuzzy' : undefined,
    };
  });
}

export async function applySemanticMatches(
  env: Pick<CloudflareBindings, 'AI'>,
  required: KeywordMatch[],
  resume: ResumeExtract,
): Promise<{
  matches: KeywordMatch[];
  semanticMatches: Array<{ jdTerm: string; resumeSnippet: string; score: number }>;
}> {
  const missingRequired = required.filter((m) => !m.found);
  const maxSemantic = Math.floor(required.length * SEMANTIC_CAP_RATIO);
  let semanticUsed = required.filter((m) => m.matchType === 'semantic').length;

  // Embed skills + education entries + experience bullets so the LLM can resolve
  // acronym aliases (K8s ↔ Kubernetes, JS ↔ JavaScript) and paraphrases.
  const resumeSnippets = [
    ...resume.skills,
    ...resume.education,
    ...resume.bullets.map((b) => b.text),
  ].filter(Boolean).slice(0, 30);

  const semanticMatches: Array<{
    jdTerm: string;
    resumeSnippet: string;
    score: number;
  }> = [];

  if (
    missingRequired.length === 0 ||
    resumeSnippets.length === 0 ||
    maxSemantic === 0
  ) {
    return { matches: required, semanticMatches };
  }

  const toTry = missingRequired.slice(0, 12);
  const jdTexts = toTry.map((m) => m.term);

  try {
    const vectors = await embedTexts(env, [...jdTexts, ...resumeSnippets]);
    const jdVectors = vectors.slice(0, jdTexts.length);
    const resumeVectors = vectors.slice(jdTexts.length);

    for (let i = 0; i < jdTexts.length; i++) {
      if (semanticUsed >= maxSemantic) break;
      const jdVec = jdVectors[i];
      if (!jdVec) continue;
      let bestScore = 0;
      let bestSnippet = '';
      for (let j = 0; j < resumeVectors.length; j++) {
        const rVec = resumeVectors[j];
        if (!rVec) continue;
        const score = cosineSimilarity(jdVec, rVec);
        if (score > bestScore) {
          bestScore = score;
          bestSnippet = resumeSnippets[j] ?? '';
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
          req.locations = ['Semantic match'];
          semanticUsed++;
        }
      }
    }
  } catch (err) {
    console.error('[semantic match]', err);
  }

  return { matches: required, semanticMatches };
}

export async function matchPhrases(
  env: Pick<CloudflareBindings, 'AI'>,
  phrases: string[],
  resume: ResumeExtract,
  corpus: string,
  options?: { applySemantic?: boolean },
): Promise<{
  keywordMatches: KeywordMatch[];
  semanticMatches: Array<{ jdTerm: string; resumeSnippet: string; score: number }>;
}> {
  const required = matchTerms(phrases, resume, corpus);
  if (options?.applySemantic === false) {
    return { keywordMatches: required, semanticMatches: [] };
  }
  const { matches, semanticMatches } = await applySemanticMatches(
    env,
    required,
    resume,
  );
  return { keywordMatches: matches, semanticMatches };
}

export function scoreFromMatches(matches: KeywordMatch[], weight = 1): number {
  if (matches.length === 0) return 100;
  const found = matches.filter((m) => m.found).length;
  return Math.round((found / matches.length) * 100 * weight);
}

/** ATS/recruiter-aligned: exact JD wording counts full; paraphrase counts less */
export function scoreFromMatchesWeighted(matches: KeywordMatch[]): number {
  if (matches.length === 0) return 100;
  let earned = 0;
  for (const m of matches) {
    if (!m.found) continue;
    if (m.matchType === 'exact') earned += 1;
    else if (m.matchType === 'fuzzy') earned += 0.85;
    else if (m.matchType === 'semantic') earned += 0.65;
    else earned += 0.85;
  }
  return Math.round((earned / matches.length) * 100);
}

export function placementBonus(matches: KeywordMatch[]): number {
  let bonus = 0;
  for (const m of matches) {
    if (m.found && hasExperiencePlacement(m.locations)) bonus += 5;
  }
  return Math.min(bonus, 15);
}

export function titleMatchScore(
  targetPhrases: string[],
  resume: ResumeExtract,
): number {
  if (targetPhrases.length === 0) return 100;
  const titles = [
    ...resume.jobTitles,
    ...(resume.headline ? [resume.headline] : []),
  ];
  if (titles.length === 0) return 0;

  let best = 0;
  for (const target of targetPhrases) {
    const targetNorm = normalizeTerm(target);
    const targetTokens = targetNorm.split(/\s+/).filter((t) => t.length > 2);
    for (const title of titles) {
      const titleLower = title.toLowerCase();
      if (fuzzyIncludes(titleLower, target)) {
        best = Math.max(best, 100);
        continue;
      }
      if (targetTokens.length > 0) {
        const matched = targetTokens.filter((t) => titleLower.includes(t)).length;
        const ratio = matched / targetTokens.length;
        best = Math.max(best, Math.round(ratio * 100));
      }
    }
  }
  return best;
}
