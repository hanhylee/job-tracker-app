import { parseResumeFromText } from './resume-parse';

/** Patterns recruiters and ATS parsers associate with measurable impact */
const METRIC_PATTERN =
  /\b(\d+%|\$\d[\d,]*|\d+\s*(million|billion|k|m|b)\b|increased|decreased|reduced|improved|saved|grew|growth|cut\s+costs?|\d+x|\d+\+)\b/i;

const NUMBER_WITH_OUTCOME =
  /\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\s*(%|users|customers|clients|team members|employees|projects|revenue|sales|requests|tickets|deals)\b/i;

const TEAM_OR_SCALE =
  /\b(team of \d+|\d+\+?\s*(engineers|developers|people|employees|direct reports|clients|customers))\b/i;

export function isQuantifiedBullet(text: string): boolean {
  if (METRIC_PATTERN.test(text)) return true;
  if (NUMBER_WITH_OUTCOME.test(text)) return true;
  if (TEAM_OR_SCALE.test(text)) return true;
  if (/\b\d{1,3}(?:,\d{3})+\b/.test(text) && /\b(by|to|from|over|within|per)\b/i.test(text)) {
    return true;
  }
  return false;
}

export type MeasurableImpactResult = {
  score: number;
  quantifiedBullets: number;
  totalBullets: number;
  tips: string[];
};

export function analyzeMeasurableImpact(resumeText: string): MeasurableImpactResult {
  const bullets = parseResumeFromText(resumeText)
    .bullets.map((b) => b.text.trim())
    .filter(Boolean);
  const tips: string[] = [];

  if (bullets.length === 0) {
    return {
      score: 40,
      quantifiedBullets: 0,
      totalBullets: 0,
      tips: [
        'Add experience bullets with numbers and outcomes (e.g. "Reduced processing time by 30%").',
      ],
    };
  }

  const quantified = bullets.filter(isQuantifiedBullet);
  const ratio = quantified.length / bullets.length;
  const score = Math.round(ratio * 100);

  if (ratio < 0.34) {
    tips.push(
      'Recruiters look for quantified results — add metrics (%, $, volume, time saved) to your bullets.',
    );
  } else if (ratio < 0.67) {
    tips.push(
      'Strengthen remaining bullets with specific numbers and outcomes to stand out in the applicant pool.',
    );
  }

  if (quantified.length > 0 && ratio < 1) {
    tips.push(
      'Use the format: action verb + what you did + measurable result (e.g. "Led migration, cutting deploy time 40%").',
    );
  }

  return {
    score,
    quantifiedBullets: quantified.length,
    totalBullets: bullets.length,
    tips,
  };
}
