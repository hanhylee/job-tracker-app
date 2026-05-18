export function roundScore(score: number): number {
  return Math.round(Math.min(100, Math.max(0, score)));
}

export function scoreBadgeClass(score: number): string {
  const rounded = roundScore(score);
  if (rounded >= 80) {
    return 'bg-emerald-100 text-emerald-800 ring-emerald-200 hover:bg-emerald-200';
  }
  if (rounded >= 60) {
    return 'bg-amber-100 text-amber-800 ring-amber-200 hover:bg-amber-200';
  }
  return 'bg-red-100 text-red-700 ring-red-200 hover:bg-red-200';
}
