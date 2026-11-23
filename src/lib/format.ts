/**
 * Format a rupee amount with Indian digit grouping (e.g. ₹1,25,000.50).
 * Implemented by hand so it behaves identically on every JS engine.
 */
export function formatRupees(amount: number, opts: { decimals?: boolean } = {}): string {
  const showDecimals = opts.decimals ?? !Number.isInteger(Math.round(amount * 100) / 100);
  const negative = amount < 0;
  const abs = Math.abs(amount);
  const fixed = abs.toFixed(showDecimals ? 2 : 0);
  const [intPart, decPart] = fixed.split('.');

  let grouped = intPart;
  if (intPart.length > 3) {
    const last3 = intPart.slice(-3);
    const rest = intPart.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    grouped = `${rest},${last3}`;
  }
  return `${negative ? '−' : ''}₹${grouped}${decPart ? `.${decPart}` : ''}`;
}

/** Spoken form for screen readers, e.g. "1,250 rupees". */
export function rupeesA11y(amount: number): string {
  return `${formatRupees(amount).replace('₹', '')} rupees`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "9:05 am" — 12-hour time, as commonly written in India. */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h % 12 || 12}:${m} ${h < 12 ? 'am' : 'pm'}`;
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Day heading for grouped lists: "Today", "Yesterday" or "Mon, 17 Nov 2026". */
export function formatDayLabel(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const diff = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return `${DAYS[d.getDay()]}, ${formatDate(iso)}`;
}

/** Stable key for grouping by calendar day (local time). */
export function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function formatPercent(rate: number): string {
  return `${Number.isInteger(rate) ? rate : rate.toFixed(2).replace(/0+$/, '')}%`;
}

export function isSameMonth(iso: string, ref: Date = new Date()): boolean {
  const d = new Date(iso);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

/** Up to two initials from a display name, e.g. "Priya Rao" → "PR". */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}

let counter = 0;
export function makeId(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}
