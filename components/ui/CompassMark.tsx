export function CompassMark({ className = "size-8" }: { className?: string }) {
  return <svg viewBox="0 0 40 40" fill="none" aria-hidden="true" className={className}><circle cx="20" cy="20" r="15" stroke="currentColor" strokeWidth="1" opacity=".45" /><path d="M20 1v6M20 33v6M1 20h6M33 20h6" stroke="currentColor" /><path d="m26 10-3 13-13 7 7-13Z" fill="currentColor" /><path d="m26 10-9 7 6 6Z" fill="var(--background)" /><circle cx="20" cy="20" r="2" fill="currentColor" /></svg>;
}
