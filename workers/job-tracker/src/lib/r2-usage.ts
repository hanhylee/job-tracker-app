import { eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { r2UsageMonthly } from "../db/r2-usage-schema";
import type { schema } from "../db";

export const R2_FREE_TIER = {
  storageBytes: 10 * 1024 * 1024 * 1024,
  classA: 1_000_000,
  classB: 10_000_000,
} as const;

export const R2_USAGE_WARNING_HEADER = "X-R2-Usage-Warning";
export const R2_USAGE_WARNING_VALUE = "approaching-free-tier-limit";

const WARN_THRESHOLD = 0.8;

type Db = DrizzleD1Database<typeof schema>;

export type R2UsageRow = {
  month: string;
  classACount: number;
  classBCount: number;
  storedBytes: number;
};

export type R2UsageSnapshot = {
  month: string;
  classA: { count: number; limit: number; percent: number };
  classB: { count: number; limit: number; percent: number };
  storageBytes: { count: number; limit: number; percent: number };
};

export class R2FreeTierError extends Error {
  constructor(
    message: string,
    public usage: R2UsageSnapshot,
  ) {
    super(message);
    this.name = "R2FreeTierError";
  }
}

export function currentMonthUtc(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function percent(count: number, limit: number): number {
  if (limit <= 0) return 0;
  return count / limit;
}

export function toUsageSnapshot(row: R2UsageRow): R2UsageSnapshot {
  return {
    month: row.month,
    classA: {
      count: row.classACount,
      limit: R2_FREE_TIER.classA,
      percent: percent(row.classACount, R2_FREE_TIER.classA),
    },
    classB: {
      count: row.classBCount,
      limit: R2_FREE_TIER.classB,
      percent: percent(row.classBCount, R2_FREE_TIER.classB),
    },
    storageBytes: {
      count: row.storedBytes,
      limit: R2_FREE_TIER.storageBytes,
      percent: percent(row.storedBytes, R2_FREE_TIER.storageBytes),
    },
  };
}

async function getOrCreateRow(db: Db, month: string): Promise<R2UsageRow> {
  const [existing] = await db
    .select()
    .from(r2UsageMonthly)
    .where(eq(r2UsageMonthly.month, month))
    .limit(1);

  if (existing) {
    return {
      month: existing.month,
      classACount: existing.classACount,
      classBCount: existing.classBCount,
      storedBytes: existing.storedBytes,
    };
  }

  await db.insert(r2UsageMonthly).values({ month }).run();
  return { month, classACount: 0, classBCount: 0, storedBytes: 0 };
}

export async function getR2Usage(
  db: Db,
  month = currentMonthUtc(),
): Promise<R2UsageSnapshot> {
  const row = await getOrCreateRow(db, month);
  return toUsageSnapshot(row);
}

function isApproaching(count: number, limit: number, delta = 0): boolean {
  return (count + delta) / limit >= WARN_THRESHOLD && count + delta < limit;
}

function wouldExceed(count: number, limit: number, delta = 1): boolean {
  return count + delta > limit;
}

export type R2UsageOp = "classA" | "classB" | "storage";

export async function assertWithinFreeTier(
  db: Db,
  op: R2UsageOp,
  deltaBytes = 0,
): Promise<{ warning: boolean; usage: R2UsageSnapshot }> {
  const month = currentMonthUtc();
  const row = await getOrCreateRow(db, month);
  const usage = toUsageSnapshot(row);
  let warning = false;

  if (op === "classA") {
    if (wouldExceed(row.classACount, R2_FREE_TIER.classA)) {
      throw new R2FreeTierError(
        "R2 free tier limit reached for this month",
        usage,
      );
    }
    warning = isApproaching(row.classACount, R2_FREE_TIER.classA);
  } else if (op === "classB") {
    if (wouldExceed(row.classBCount, R2_FREE_TIER.classB)) {
      throw new R2FreeTierError(
        "R2 free tier limit reached for this month",
        usage,
      );
    }
    warning = isApproaching(row.classBCount, R2_FREE_TIER.classB);
  } else if (op === "storage") {
    if (deltaBytes > 0 && row.storedBytes + deltaBytes > R2_FREE_TIER.storageBytes) {
      throw new R2FreeTierError(
        "R2 free tier limit reached for this month",
        usage,
      );
    }
    if (deltaBytes > 0) {
      warning = isApproaching(row.storedBytes, R2_FREE_TIER.storageBytes, deltaBytes);
    }
  }

  return { warning, usage };
}

export async function recordR2Usage(
  db: Db,
  opts: { classA?: number; classB?: number; storageDeltaBytes?: number },
): Promise<R2UsageSnapshot> {
  const month = currentMonthUtc();
  const row = await getOrCreateRow(db, month);

  const classA = opts.classA ?? 0;
  const classB = opts.classB ?? 0;
  const storageDelta = opts.storageDeltaBytes ?? 0;

  await db
    .update(r2UsageMonthly)
    .set({
      classACount: row.classACount + classA,
      classBCount: row.classBCount + classB,
      storedBytes: Math.max(0, row.storedBytes + storageDelta),
      updatedAt: new Date(),
    })
    .where(eq(r2UsageMonthly.month, month))
    .run();

  return getR2Usage(db, month);
}

export function setUsageWarningHeader(headers: Headers, warning: boolean): void {
  if (warning) {
    headers.set(R2_USAGE_WARNING_HEADER, R2_USAGE_WARNING_VALUE);
  }
}
