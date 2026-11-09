/** Geographic evidence from a title, not an assertion about on-ground implementation. */
export interface ProjectLocation {
  confidence: 'named' | 'shared' | 'review';
  note: string;
}
export type LocationDecision = ProjectLocation | { confidence: 'excluded'; note: string };
const note = {
  named: 'Tahasan na nakapangalan ang Rodriguez/Montalban, Rizal sa project title. Hindi ito independent site verification.',
  shared: 'Kasama ang Montalban sa multi-town project. Hindi maaaring i-attribute ang buong halaga sa bayan lamang.',
  review: 'May local name o route reference, pero hindi sapat ang title para italaga ang eksaktong lokasyon o bahagi sa Montalban.',
  excluded: 'Ibang lugar o namesake ang nasa title; hindi kabilang sa Montalban municipal totals.',
};
export function montalbanLocation(title: string): LocationDecision {
  const text = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ');
  // Multi-campus / multi-town projects cannot be divided using name matches.
  const shared = /\b(?:san|sn)\.? mateo\s*(?:&|\/|-)\s*(?:rodriguez|rodriquez|montalban)\s*,?\s*rizal\b/.test(text)
    || /\b(?:san|sn)\.? mateo\s+and\s+(?:rodriguez|rodriquez|montalban)\b/.test(text)
    || /\b(?:rodriguez|rodriquez|montalban)\s+and\s+(?:san|sn)\.? mateo\b/.test(text)
    || (/\bcampuses\b/.test(text) && /\brodriguez\b/.test(text));
  if (shared) return { confidence: 'shared', note: note.shared };
  // A route's name is not its project location. Prefer explicit municipal suffixes.
  const named = /\b(?:rodriguez|rodriquez|montalban)\s*(?:\(montalban\)|\(rodriguez\))?\s*,?\s*(?:montalban\s*,?\s*)?rizal\b/.test(text);
  if (named) return { confidence: 'named', note: note.named };
  // Explicit other locations override a surname, river or road-name match.
  const otherPlace = /\b(?:butuan|agusan|bulacan|caloocan|quezon city|manila|mandaluyong|marikina city|pasay|pasig city|para.?aque|taguig|malabon|navotas|cebu|davao|pampanga|cotabato|pangasinan|nueva ecija|negros occidental|aklan|bukidnon|national capital region|san juan city|mulanay|bogo|san remigio|laguna|batangas|tanay|pililla|antipolo|binangonan|angono|baras|cardona|cainta|jala.jala|morong|taytay|teresa)\b/.test(text)
    || /\b(?:san|sn)\.? mateo\s*,?\s*rizal\b/.test(text);
  const namesake = /\b(?:e\.?\s+rodriguez|amang rodriguez|b\.?\s+rodriguez|don (?:julian|pedro) rodriguez|c\.?\s*t\.?\s*montalban|col\.? (?:rafael.*)?rodriguez)\b/.test(text);
  if (otherPlace || namesake) return { confidence: 'excluded', note: note.excluded };
  const localLead = /\b(?:rodriguez|montalban|kasiglahan|macabud|mascap|puray|parawagan|lukutang|pakiing|macaingalan)\b/.test(text);
  return localLead ? { confidence: 'review', note: note.review } : { confidence: 'excluded', note: 'Walang sapat na municipality o distinctive local-name match sa title.' };
}
