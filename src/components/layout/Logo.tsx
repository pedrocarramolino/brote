export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="shrink-0">
      <rect width="64" height="64" rx="15" fill="rgb(var(--accent))" />
      <path d="M32 50V30" stroke="rgb(var(--accent-ink))" strokeWidth="4" strokeLinecap="round" />
      <path d="M32 32c0-9 7-15 16-15 0 9-7 15-16 15Z" fill="rgb(var(--accent-ink))" />
      <path d="M32 36c0-7-5.5-12-13-12 0 7 5.5 12 13 12Z" fill="rgb(var(--accent-ink))" opacity=".7" />
    </svg>
  );
}
