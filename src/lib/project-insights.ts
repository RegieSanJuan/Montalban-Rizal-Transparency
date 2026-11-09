/** Presentation categories inferred from titles, not official agency classifications. */
export const CATEGORIES = [
  { id: 'roads', label: 'Kalsada at tulay', icon: '↗', color: '#729aff' },
  { id: 'flood', label: 'Flood control at drainage', icon: '≈', color: '#5bdbd0' },
  { id: 'buildings', label: 'Gusali at pasilidad', icon: '⌂', color: '#c2adff' },
  { id: 'agriculture', label: 'Agrikultura at irigasyon', icon: '↟', color: '#bddb88' },
  { id: 'other', label: 'Iba pang proyekto', icon: '＋', color: '#f5c582' },
] as const;
export type Category = (typeof CATEGORIES)[number]['id'];
export function categoryOf(title: string): Category {
  if (/road|bridge|highway|overpass/i.test(title)) return 'roads';
  if (/flood|drainage|riverwall|revetment|dike|culvert/i.test(title)) return 'flood';
  if (/building|school|hospital|health|facility|facilities|evacuation|court/i.test(title)) return 'buildings';
  if (/irrigation|farm|agricultur/i.test(title)) return 'agriculture';
  return 'other';
}
export function categoryTotals(rows: { title: string; house_php: number | null }[]) {
  return CATEGORIES.map(category => {
    const matches = rows.filter(row => categoryOf(row.title) === category.id);
    return { ...category, rows: matches.length, funded: matches.filter(row => row.house_php !== null).length,
      amount: matches.reduce((sum, row) => sum + (row.house_php ?? 0), 0) };
  }).filter(category => category.rows > 0).sort((a, b) => b.amount - a.amount);
}
