import { useId } from 'react';
import { Link } from 'react-router-dom';

export function LogoMark({ size = 34 }) {
  // Unique gradient id per instance: duplicate ids break when one copy is hidden (display: none).
  const gid = `lg-${useId().replace(/:/g, '')}`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="logo-mark">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--brand-a)" />
          <stop offset="1" stopColor="var(--brand-b)" />
        </linearGradient>
      </defs>
      <path d="M32 4 8 13v17c0 15 10 26 24 30 14-4 24-15 24-30V13L32 4z" fill={`url(#${gid})`} />
      <path d="M17 33h8l4-8 6 15 4-7h8" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ to = '/', compact = false }) {
  return (
    <Link to={to} className="logo" aria-label="LifeOS home">
      <LogoMark />
      {!compact && (
        <span className="logo__text">
          Life<span>OS</span>
        </span>
      )}
    </Link>
  );
}

/**
 * Animated shield used on the landing hero and the dashboard status card.
 * tone: "safe" | "alert" | "active"
 */
export function ShieldGraphic({ tone = 'safe', size = 220, label }) {
  const uid = useId().replace(/:/g, '');
  return (
    <div className={`shield-graphic shield-graphic--${tone}`} style={{ width: size, height: size }} role="img" aria-label={label || 'Safety shield'}>
      <span className="shield-graphic__ring r1" />
      <span className="shield-graphic__ring r2" />
      <span className="shield-graphic__ring r3" />
      <svg viewBox="0 0 120 120" className="shield-graphic__svg" aria-hidden="true">
        <defs>
          <linearGradient id={`sg-fill-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--sg-a)" />
            <stop offset="1" stopColor="var(--sg-b)" />
          </linearGradient>
          <linearGradient id={`sg-shine-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity=".45" />
            <stop offset=".55" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M60 8 18 24v30c0 27 18 47 42 56 24-9 42-29 42-56V24L60 8z" fill={`url(#sg-fill-${uid})`} />
        <path d="M60 8 18 24v30c0 27 18 47 42 56 24-9 42-29 42-56V24L60 8z" fill={`url(#sg-shine-${uid})`} />
        {tone === 'alert' ? (
          <g stroke="#fff" strokeWidth="9" strokeLinecap="round">
            <path d="M60 38v26" />
            <path d="M60 80h.01" />
          </g>
        ) : (
          <path className="shield-graphic__check" d="m40 60 14 14 28-30" fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
    </div>
  );
}
