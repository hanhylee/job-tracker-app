export type AnalysisStatus = 'pending' | 'running' | 'complete' | 'failed';

export type CategoryScore = {
  score: number;
  summary: string;
  matched: string[];
  missing: string[];
};

export type KeywordMatch = {
  term: string;
  found: boolean;
  locations: string[];
  matchType?: 'exact' | 'fuzzy' | 'semantic';
};

export type AnalysisAction = {
  priority: number;
  type:
    | 'add_keyword'
    | 'strengthen_bullet'
    | 'add_skill'
    | 'title_tweak'
    | 'formatting';
  message: string;
  suggestion?: string;
};

export type AnalysisResult = {
  schemaVersion: 1;
  overallScore: number;
  categories: {
    skills: CategoryScore;
    experience: CategoryScore;
    titleAlignment: CategoryScore;
    atsFormatting: {
      score: number;
      risks: string[];
    };
  };
  keywords: {
    required: KeywordMatch[];
    preferred: KeywordMatch[];
  };
  actions: AnalysisAction[];
  meta: {
    model: string;
    analyzedAt: string;
    resumeTextHash: string;
    jobDescriptionHash: string;
  };
};

export type AnalysisRecord = {
  analysisId: string;
  status: AnalysisStatus;
  overallScore: number | null;
  result?: AnalysisResult;
  error: string | null;
  resumeHash: string | null;
  jdHash: string | null;
  createdAt: string | null;
  completedAt: string | null;
  cached?: boolean;
};

export type StartAnalysisResponse = AnalysisRecord & {
  analysisId?: string;
};
