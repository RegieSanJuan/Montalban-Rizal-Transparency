/**
 * Compact pesos with three significant figures: ₱6.31B, ₱47.8M, ₱400M, ₱850K.
 * null is "—", never zero. Exact amounts use phpFull.
 */
export function php(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  const a = Math.abs(n);
  const [div, suffix] = a >= 1e12 ? [1e12, 'T'] : a >= 1e9 ? [1e9, 'B'] : a >= 1e6 ? [1e6, 'M'] : a >= 1e3 ? [1e3, 'K'] : [1, ''];
  if (div === 1) return '₱' + Math.round(n).toLocaleString('en-US');
  // Round first, so 999.6M becomes ₱1.00B rather than ₱1,000M.
  const sig = Number((n / div).toPrecision(3));
  if (Math.abs(sig) >= 1000 && suffix !== 'T') return php(sig * div);
  const digits = Math.abs(sig) >= 100 ? 0 : Math.abs(sig) >= 10 ? 1 : 2;
  return '₱' + sig.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits }) + suffix;
}

/** Exact pesos: ₱4,744,932,000. */
export function phpFull(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return '₱' + Math.round(n).toLocaleString('en-US');
}

/** A signed change: +₱150.0M, −₱14.00B, or "no change". */
export function phpDelta(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  if (n === 0) return 'walang pagbabago';
  return (n > 0 ? '+' : '−') + php(Math.abs(n));
}

export function count(n: number): string {
  return n.toLocaleString('en-US');
}

/** "1 project", "433 projects". */
export function plural(n: number, one: string, many = one + 's'): string {
  return `${count(n)} ${n === 1 ? one : many}`;
}

const DAY = (() => {
  const opts: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Manila' };
  try { return new Intl.DateTimeFormat('fil-PH', opts); } catch { return new Intl.DateTimeFormat('en-PH', opts); }
})();

/** One date format across the portal: "Hulyo 23, 2026", Philippine time. Unparseable input is shown as given. */
export function date(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : DAY.format(d);
}
