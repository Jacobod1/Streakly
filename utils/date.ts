export function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

export function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m) - 1]} ${parseInt(d)}, ${y}`;
}

export function shortDay(iso: string): string {
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  return days[new Date(iso + 'T12:00:00').getDay()];
}

export function last7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => daysAgo(6 - i));
}

export function last30Days(): string[] {
  return Array.from({ length: 30 }, (_, i) => daysAgo(29 - i));
}

export function getWeekStart(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1; // Monday = 0
  d.setDate(d.getDate() - diff);
  return d.toISOString().split('T')[0];
}

export function getMonthStart(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export function last6WeekRanges(): { start: string; end: string; label: string }[] {
  const result: { start: string; end: string; label: string }[] = [];
  const now = new Date();
  for (let w = 5; w >= 0; w--) {
    const pivot = new Date(now);
    pivot.setDate(pivot.getDate() - w * 7);
    const day = pivot.getDay();
    const diff = day === 0 ? 6 : day - 1;
    const start = new Date(pivot);
    start.setDate(pivot.getDate() - diff);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    result.push({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
      label: `${start.getDate()}/${start.getMonth() + 1}`,
    });
  }
  return result;
}

export function last6MonthRanges(): { start: string; end: string; label: string }[] {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const result: { start: string; end: string; label: string }[] = [];
  const now = new Date();
  for (let m = 5; m >= 0; m--) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    result.push({
      start: d.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
      label: months[d.getMonth()],
    });
  }
  return result;
}

/** Fraction of the current week elapsed (Mon–Sun, 0–1) */
export function weekProgress(): number {
  const day = new Date().getDay();
  const daysIn = day === 0 ? 6 : day - 1;
  return (daysIn + 1) / 7;
}

/** Fraction of the current month elapsed (0–1) */
export function monthProgress(): number {
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return now.getDate() / daysInMonth;
}
