import type { CloudflareBindings } from '../types';
import type {
  JdRequirements,
  AllCategoryScores,
  ScoreBreakdown,
  AnalysisResult,
  CoachingOutput,
} from './analysis-types';
import { SCORE_WEIGHTS } from './analysis-types';
import {
  resumeCorpus,
  matchPhrases,
  scoreFromMatches,
  scoreFromMatchesWeighted,
  placementBonus,
  titleMatchScore,
} from './match';
import { parseResumeFromText } from './resume-parse';
import type { FormatCheckResult } from './format-check';
import { analyzeMeasurableImpact } from './impact';
import type { MeasurableImpactResult } from './impact';

const EXPERIENCE_FIT_WEIGHT = 0.75;
const EXPERIENCE_IMPACT_WEIGHT = 0.25;
const SENIORITY_ORDER: Record<string, number> = {
  intern: 0,
  junior: 1,
  entry: 1,
  mid: 2,
  middle: 2,
  senior: 3,
  staff: 4,
  principal: 4,
  lead: 5,
  manager: 5,
};

function normalizeSeniority(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.toLowerCase().trim();
  for (const key of Object.keys(SENIORITY_ORDER)) {
    if (v.includes(key)) return key;
  }
  return v;
}

function seniorityScore(
  jdSeniority: string | null,
  resumeSeniority: string | null,
): number {
  if (!jdSeniority) return 100;
  const jdKey = normalizeSeniority(jdSeniority);
  const resKey = normalizeSeniority(resumeSeniority);
  if (!jdKey) return 100;
  if (!resKey) return 50;
  const jdOrd = SENIORITY_ORDER[jdKey] ?? 2;
  const resOrd = SENIORITY_ORDER[resKey] ?? 2;
  if (resOrd >= jdOrd) return 100;
  if (resOrd === jdOrd - 1) return 80;
  return Math.max(40, 100 - (jdOrd - resOrd) * 20);
}

function yearsScore(
  minYears: number | null,
  totalYears: number | null,
): number {
  if (minYears == null || minYears <= 0) return 100;
  if (totalYears == null) return 50;
  if (totalYears >= minYears) return 100;
  const ratio = totalYears / minYears;
  if (ratio >= 0.7) return Math.round(70 + (ratio - 0.7) * (29 / 0.3));
  if (ratio >= 0.5) return Math.round(50 + (ratio - 0.5) * (19 / 0.2));
  return Math.max(40, Math.round(ratio * 80));
}

function hasExperienceSignals(jd: JdRequirements): boolean {
  return (
    jd.experience.minYears != null ||
    jd.experience.seniority != null ||
    jd.experience.requiredPhrases.length > 0
  );
}

function toCategoryResult(
  score: number,
  matches: { term: string; found: boolean }[],
): {
  score: number;
  matched: string[];
  missing: string[];
  keywordMatches: import('./analysis-types').KeywordMatch[];
} {
  const matched = matches.filter((m) => m.found).map((m) => m.term);
  const missing = matches.filter((m) => !m.found).map((m) => m.term);
  return {
    score: Math.min(100, Math.max(0, Math.round(score))),
    matched,
    missing,
    keywordMatches: matches as import('./analysis-types').KeywordMatch[],
  };
}

export async function scoreAllCategories(
  env: Pick<CloudflareBindings, 'AI'>,
  jd: JdRequirements,
  resumeText: string,
): Promise<AllCategoryScores> {
  const resume = parseResumeFromText(resumeText);
  const corpus = resumeCorpus(resumeText);

  const requiredPhrases = jd.skills.requiredPhrases;
  const preferredPhrases = jd.skills.preferredPhrases;

  const [requiredMatch, preferredMatch] = await Promise.all([
    matchPhrases(env, requiredPhrases, resume, corpus),
    matchPhrases(env, preferredPhrases, resume, corpus, {
      applySemantic: false,
    }),
  ]);

  const requiredBase = scoreFromMatchesWeighted(requiredMatch.keywordMatches);
  const preferredBase =
    preferredPhrases.length > 0
      ? scoreFromMatches(preferredMatch.keywordMatches)
      : 0;
  const bonus = placementBonus(requiredMatch.keywordMatches);
  const skillsScore = Math.min(
    100,
    preferredPhrases.length > 0
      ? Math.round(requiredBase * 0.8 + preferredBase * 0.2 + bonus)
      : Math.round(requiredBase + bonus),
  );

  const skills = toCategoryResult(skillsScore, [
    ...requiredMatch.keywordMatches,
    ...preferredMatch.keywordMatches,
  ]);

  const measurableImpact = analyzeMeasurableImpact(resumeText);

  let experienceFitScore: number;
  let experienceMatches: import('./analysis-types').KeywordMatch[] = [];

  if (!hasExperienceSignals(jd)) {
    experienceFitScore = 85;
  } else {
    const phraseResult = await matchPhrases(
      env,
      jd.experience.requiredPhrases,
      resume,
      corpus,
      { applySemantic: false },
    );
    experienceMatches = phraseResult.keywordMatches;
    const phraseSub = scoreFromMatchesWeighted(phraseResult.keywordMatches);
    const yearsSub = yearsScore(jd.experience.minYears, resume.totalYearsExperience);
    const senioritySub = seniorityScore(jd.experience.seniority, resume.seniority);
    experienceFitScore = Math.round(phraseSub * 0.4 + yearsSub * 0.4 + senioritySub * 0.2);
  }

  const experienceScore = Math.round(
    experienceFitScore * EXPERIENCE_FIT_WEIGHT +
      measurableImpact.score * EXPERIENCE_IMPACT_WEIGHT,
  );
  const experience = toCategoryResult(experienceScore, experienceMatches);

  const titleScore = titleMatchScore(jd.title.targetPhrases, resume);
  const titleMatched = jd.title.targetPhrases.filter((p) =>
    titleMatchScore([p], resume) >= 70,
  );
  const titleMissing = jd.title.targetPhrases.filter(
    (p) => !titleMatched.includes(p),
  );

  const titleAlignment = {
    score: titleScore,
    matched: titleMatched,
    missing: titleMissing,
    keywordMatches: jd.title.targetPhrases.map((term) => ({
      term,
      found: titleMatched.includes(term),
      locations: titleMatched.includes(term) ? ['Title'] : [],
    })),
  };

  return {
    skills,
    experience,
    titleAlignment,
    measurableImpact,
    keywords: {
      required: requiredMatch.keywordMatches,
      preferred: preferredMatch.keywordMatches,
    },
  };
}

export function synthesizeOverallScore(categories: AllCategoryScores): {
  overallScore: number;
  scoreBreakdown: ScoreBreakdown;
} {
  const skills = categories.skills.score;
  const experience = categories.experience.score;
  const titleAlignment = categories.titleAlignment.score;

  const overallScore = Math.round(
    SCORE_WEIGHTS.skills * skills +
      SCORE_WEIGHTS.experience * experience +
      SCORE_WEIGHTS.titleAlignment * titleAlignment,
  );

  return {
    overallScore: Math.min(100, Math.max(0, overallScore)),
    scoreBreakdown: {
      skills,
      experience,
      titleAlignment,
      weights: { ...SCORE_WEIGHTS },
    },
  };
}

export function buildAnalysisResult(params: {
  categories: AllCategoryScores;
  coaching: CoachingOutput;
  format: FormatCheckResult;
  overallScore: number;
  scoreBreakdown: ScoreBreakdown;
  model: string;
  resumeTextHash: string;
  jobDescriptionHash: string;
}): AnalysisResult {
  const { categories, coaching, format } = params;

  // Keyword lists come from deterministic matching — coaching only writes summaries.
  const pickMatched = (_coached: string[], computed: string[]) => computed;
  const pickMissing = (_coached: string[], computed: string[]) => computed;

  return {
    overallScore: params.overallScore,
    scoreBreakdown: params.scoreBreakdown,
    categories: {
      skills: {
        score: categories.skills.score,
        summary: coaching.categories.skills.summary,
        matched: pickMatched(
          coaching.categories.skills.matched,
          categories.skills.matched,
        ),
        missing: pickMissing(
          coaching.categories.skills.missing,
          categories.skills.missing,
        ),
      },
      experience: {
        score: categories.experience.score,
        summary: coaching.categories.experience.summary,
        matched: pickMatched(
          coaching.categories.experience.matched,
          categories.experience.matched,
        ),
        missing: pickMissing(
          coaching.categories.experience.missing,
          categories.experience.missing,
        ),
      },
      titleAlignment: {
        score: categories.titleAlignment.score,
        summary: coaching.categories.titleAlignment.summary,
        matched: pickMatched(
          coaching.categories.titleAlignment.matched,
          categories.titleAlignment.matched,
        ),
        missing: pickMissing(
          coaching.categories.titleAlignment.missing,
          categories.titleAlignment.missing,
        ),
      },
      atsFormatting: {
        score: format.score,
        risks: format.risks,
        tips: format.tips,
        wordCount: format.wordCount,
      },
      measurableImpact: {
        score: categories.measurableImpact.score,
        quantifiedBullets: categories.measurableImpact.quantifiedBullets,
        totalBullets: categories.measurableImpact.totalBullets,
        tips: categories.measurableImpact.tips,
      },
    },
    keywords: {
      required: categories.keywords.required,
      preferred: categories.keywords.preferred,
    },
    actions: params.coaching.actions,
    meta: {
      model: params.model,
      analyzedAt: new Date().toISOString(),
      resumeTextHash: params.resumeTextHash,
      jobDescriptionHash: params.jobDescriptionHash,
    },
  };
}
