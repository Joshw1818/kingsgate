// billing.ts — pure lifecycle + due-date logic for the Client Tracker (Pillar 2.6).
//
// Ported from docs/mockups/client-tracker-mockup.html. Dependency-free and
// shared by both the server (dataSources.ts) and the client component, so a
// "mark paid" can re-compute the next due in the browser with the exact same
// rules the server uses. NOTHING here is stored — stage, next due and status
// are all derived from start_date + billing_type + billing_schedule.

export type BillingType = "rolling" | "advance_3mo" | "payment_plan";
export type Stage = "offer" | "recurring" | "churned";
export type DueStatus = "overdue" | "due_soon" | "current";
export type DueKind = "offer_fee" | "retainer" | "advance_quarter" | "installment";

export interface Installment {
  due: string; // YYYY-MM-DD
  amount: number;
  paid: boolean;
}

/** Normalised client row, shaped from `clients` + `billing_schedule`. */
export interface LedgerClient {
  id: string;
  name: string;
  /** retainer_monthly — effective £/mo. */
  mrr: number;
  start: string; // start_date
  end?: string | null; // end_date (null = active)
  type: BillingType;
  /** day-of-month a rolling retainer is due. */
  anchor?: number;
  /** current cycle settled (rolling / advance). */
  paid?: boolean;
  /** £500 offer fee paid up front (offer period). */
  paidUpfront?: boolean;
  /** post-plan monthly rate for payment_plan clients. */
  recur?: number;
  /** explicit installment rows (payment_plan). */
  plan?: Installment[];
}

export interface TrackerComputed {
  stage: Stage;
  /** day number into the 50-day offer period. */
  dayN: number;
  offerEnd: string;
  due: string;
  amount: number;
  kind: DueKind;
  status: DueStatus;
  /** days from today to due (negative = overdue). */
  daysToDue: number;
}

const DAY = 86_400_000;
const OFFER_DAYS = 50;

function parse(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function iso(dt: Date): string {
  return dt.toISOString().slice(0, 10);
}
function addDays(dt: Date, n: number): Date {
  const x = new Date(dt);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}
function addMonths(dt: Date, n: number): Date {
  const x = new Date(dt);
  x.setUTCMonth(x.getUTCMonth() + n);
  return x;
}
function anchorDate(ref: Date, day: number): Date {
  return new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), day));
}
function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / DAY);
}

/** Midnight-UTC for the current day. */
export function todayUTC(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

function quarterDues(start: Date, today: Date): { nextQ: Date; prevQ: Date } {
  let d = new Date(start);
  while (d < today) d = addMonths(d, 3);
  return { nextQ: d, prevQ: addMonths(d, -3) };
}

/** Compute stage, next due and status for one client. */
export function computeClient(c: LedgerClient, today: Date = todayUTC()): TrackerComputed {
  const start = parse(c.start);
  const offerEnd = addDays(start, OFFER_DAYS);
  const churned = c.end ? parse(c.end) < today : false;
  const inOffer = !churned && today <= offerEnd;
  const stage: Stage = churned ? "churned" : inOffer ? "offer" : "recurring";
  const dayN = daysBetween(start, today);

  let due: Date;
  let amount: number;
  let kind: DueKind;

  if (c.type === "payment_plan") {
    const unpaid = (c.plan ?? [])
      .filter((p) => !p.paid)
      .sort((a, b) => parse(a.due).getTime() - parse(b.due).getTime());
    if (unpaid.length) {
      due = parse(unpaid[0].due);
      amount = unpaid[0].amount;
      kind = "installment";
    } else {
      // Plan settled → fall into a monthly retainer anchored on the start day.
      const a = anchorDate(today, start.getUTCDate());
      due = a >= today ? a : anchorDate(addMonths(today, 1), start.getUTCDate());
      amount = c.recur ?? 400;
      kind = "retainer";
    }
  } else if (inOffer && c.paidUpfront) {
    // £500 covered the first 50 days → first retainer falls at offer end.
    due = offerEnd;
    amount = c.mrr;
    kind = "retainer";
  } else if (c.type === "rolling") {
    const anchor = c.anchor ?? start.getUTCDate();
    due = c.paid ? anchorDate(addMonths(today, 1), anchor) : anchorDate(today, anchor);
    amount = c.mrr;
    kind = "retainer";
  } else {
    // advance_3mo
    const { nextQ, prevQ } = quarterDues(start, today);
    due = c.paid ? nextQ : prevQ;
    amount = c.mrr * 3;
    kind = "advance_quarter";
  }

  const daysToDue = daysBetween(today, due);
  const status: DueStatus = due < today ? "overdue" : daysToDue <= 7 ? "due_soon" : "current";

  return { stage, dayN, offerEnd: iso(offerEnd), due: iso(due), amount, kind, status, daysToDue };
}

/** Human-readable billing arrangement label parts. */
export function arrangement(c: LedgerClient): { label: string; sub?: string } {
  if (c.type === "rolling") return { label: `Monthly retainer · £${c.mrr}` };
  if (c.type === "advance_3mo")
    return { label: `Quarterly advance · £${c.mrr * 3}`, sub: `£${c.mrr}/mo` };
  return { label: `Payment plan · £250 × 2`, sub: `→ £${c.recur ?? 400}/mo` };
}

/** Mutate-free "mark paid": returns a new client with the current due settled. */
export function applyMarkPaid(c: LedgerClient): LedgerClient {
  if (c.type === "payment_plan") {
    const plan = (c.plan ?? []).map((p) => ({ ...p }));
    const next = plan
      .filter((p) => !p.paid)
      .sort((a, b) => parse(a.due).getTime() - parse(b.due).getTime())[0];
    if (next) next.paid = true;
    return { ...c, plan };
  }
  return { ...c, paid: true };
}
