import { z } from 'zod';

export const jdExtractSchema = z.object({
  requiredSkills: z.array(z.string()).default([]),
  preferredSkills: z.array(z.string()).default([]),
  mustHaveKeywords: z.array(z.string()).default([]),
  yearsExperience: z.number().nullable().optional(),
  seniority: z.string().nullable().optional(),
  titleSignals: z.array(z.string()).default([]),
  tools: z.array(z.string()).default([]),
  softSkills: z.array(z.string()).default([]),
});

export const resumeExtractSchema = z.object({
  skills: z.array(z.string()).default([]),
  jobTitles: z.array(z.string()).default([]),
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

export const analysisResultSchema = z.object({
  schemaVersion: z.literal(1),
  overallScore: z.number().min(0).max(100),
  categories: z.object({
    skills: categoryScoreSchema,
    experience: categoryScoreSchema,
    titleAlignment: categoryScoreSchema,
    atsFormatting: z.object({
      score: z.number().min(0).max(100),
      risks: z.array(z.string()).default([]),
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

export type JdExtract = z.infer<typeof jdExtractSchema>;
export type ResumeExtract = z.infer<typeof resumeExtractSchema>;
export type AnalysisResult = z.infer<typeof analysisResultSchema>;
export type MatchContext = {
  jd: JdExtract;
  resume: ResumeExtract;
  keywordMatches: {
    required: z.infer<typeof keywordMatchSchema>[];
    preferred: z.infer<typeof keywordMatchSchema>[];
  };
  semanticMatches: Array<{ jdTerm: string; resumeSnippet: string; score: number }>;
};
