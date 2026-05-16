export function formatAppliedDate(
  value: Date | string | number | null | undefined,
): string {
  if (value == null) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function truncateText(text: string | null | undefined, max = 42): string {
  if (!text?.trim()) return '—';
  const t = text.trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}
