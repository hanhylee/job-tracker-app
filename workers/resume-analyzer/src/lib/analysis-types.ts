import { z } from 'zod';

export const jdRequirementsSchema = z.object({
  skills: z.object({
    requiredPhrases: z.array(z.string()).max(25).default([]),
    preferredPhrases: z.array(z.string()).max(25).default([]),
  }),
  experience: z.object({
    minYears: z.number().nullable().default(null),
    seniority: z.string().nullable().default(null),
    requiredPhrases: z.array(z.string()).max(25).default([]),
  }),
  title: z.object({
    targetPhrases: z.array(z.string()).max(15).default([]),
  }),
});

export const resumeExtractSchema = z.object({
  skills: z.array(z.string()).default([]),
  jobTitles: z.array(z.string()).default([]),
  headline: z.string().nullable().default(null),
  totalYearsExperience: z.number().nullable().default(null),
  seniority: z.string().nullable().default(null),
  bullets: z
    .array(
      z.object({
        section: z.string().optional(),
        text: z.string(),
      }),
    )
    .default([]),
  education: z.array(z.string()).default([]),
});

export const categoryScoreSchema = z.object({
  score: z.number().min(0).max(100),
  summary: z.string(),
  matched: z.array(z.string()).default([]),
  missing: z.array(z.string()).default([]),
});

export const keywordMatchSchema = z.object({
  term: z.string(),
  found: z.boolean(),
  locations: z.array(z.string()).default([]),
  matchType: z.enum(['exact', 'fuzzy', 'semantic']).optional(),
});

export const scoreBreakdownSchema = z.object({
  skills: z.number().min(0).max(100),
  experience: z.number().min(0).max(100),
  titleAlignment: z.number().min(0).max(100),
  weights: z.object({
    skills: z.number(),
    experience: z.number(),
    titleAlignment: z.number(),
  }),
});

export const coachingOutputSchema = z.object({
  categories: z.object({
    skills: z.object({
      summary: z.string(),
      matched: z.array(z.string()).default([]),
      missing: z.array(z.string()).default([]),
    }),
    experience: z.object({
      summary: z.string(),
      matched: z.array(z.string()).default([]),
      missing: z.array(z.string()).default([]),
    }),
    titleAlignment: z.object({
      summary: z.string(),
      matched: z.array(z.string()).default([]),
      missing: z.array(z.string()).default([]),
    }),
  }),
  actions: z.array(
    z.object({
      priority: z.number(),
      type: z.enum([
        'add_keyword',
        'strengthen_bullet',
        'add_skill',
        'title_tweak',
        'formatting',
      ]),
      message: z.string(),
      suggestion: z.string().optional(),
    }),
  ),
});

export const analysisResultSchema = z.object({
  overallScore: z.number().min(0).max(100),
  scoreBreakdown: scoreBreakdownSchema,
  categories: z.object({
    skills: categoryScoreSchema,
    experience: categoryScoreSchema,
    titleAlignment: categoryScoreSchema,
    atsFormatting: z.object({
      score: z.number().min(0).max(100),
      risks: z.array(z.string()).default([]),
      tips: z.array(z.string()).default([]),
      wordCount: z.number().int().min(0).default(0),
    }),
    measurableImpact: z.object({
      score: z.number().min(0).max(100),
      quantifiedBullets: z.number().int().min(0),
      totalBullets: z.number().int().min(0),
      tips: z.array(z.string()).default([]),
    }),
  }),
  keywords: z.object({
    required: z.array(keywordMatchSchema),
    preferred: z.array(keywordMatchSchema),
  }),
  actions: z.array(
    z.object({
      priority: z.number(),
      type: z.enum([
        'add_keyword',
        'strengthen_bullet',
        'add_skill',
        'title_tweak',
        'formatting',
      ]),
      message: z.string(),
      suggestion: z.string().optional(),
    }),
  ),
  meta: z.object({
    model: z.string(),
    analyzedAt: z.string(),
    resumeTextHash: z.string(),
    jobDescriptionHash: z.string(),
  }),
});

/** Overall job-fit weights (must sum to 1). Tuned for 2026 semantic ATS + intern/early-career roles. */
export const SCORE_WEIGHTS = {
  skills: 0.55,
  experience: 0.4,
  titleAlignment: 0.05,
} as const;

export type JdRequirements = z.infer<typeof jdRequirementsSchema>;
export type ResumeExtract = z.infer<typeof resumeExtractSchema>;
export type AnalysisResult = z.infer<typeof analysisResultSchema>;
export type CoachingOutput = z.infer<typeof coachingOutputSchema>;
export type KeywordMatch = z.infer<typeof keywordMatchSchema>;
export type ScoreBreakdown = z.infer<typeof scoreBreakdownSchema>;

export type CategoryScoreResult = {
  score: number;
  matched: string[];
  missing: string[];
  keywordMatches: KeywordMatch[];
};

export type MeasurableImpact = {
  score: number;
  quantifiedBullets: number;
  totalBullets: number;
  tips: string[];
};

export type AllCategoryScores = {
  skills: CategoryScoreResult;
  experience: CategoryScoreResult;
  titleAlignment: CategoryScoreResult;
  measurableImpact: MeasurableImpact;
  keywords: {
    required: KeywordMatch[];
    preferred: KeywordMatch[];
  };
};
