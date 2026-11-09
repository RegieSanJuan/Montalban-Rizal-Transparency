/**
 * The portal's mark: an "M" drawn as two peaks over a river line, for
 * Montalban's twin mountains and the Marikina River. A citizen portal's own
 * sign, not the municipal seal. Decorative here: the brand name sits beside it.
 */
export default function BrandMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" width="40" height="40" aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="8" fill="#1546d4" />
      <path d="M6.5 21.5 12.2 9.5 16 16.8 19.8 9.5 25.5 21.5" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 25.6c3.1-1.9 6.4 1.9 9.5 0s6.4 1.9 9.5 0" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" opacity="0.82" />
    </svg>
  );
}
