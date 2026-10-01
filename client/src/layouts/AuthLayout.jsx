import { CheckCircle2 } from 'lucide-react';
import { Logo, ShieldGraphic } from '../components/Brand.jsx';

const POINTS = [
  'One-tap SOS with a cancellable countdown',
  'Safe journeys with arrival check-ins',
  'Trusted contacts always one tap away',
  'A QR emergency card you fully control',
];

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="auth">
      <div className="auth__aside" aria-hidden="true">
        <Logo />
        <div className="auth__visual">
          <ShieldGraphic size={200} />
        </div>
        <h2>Your safety, always within reach.</h2>
        <ul className="auth__points">
          {POINTS.map((p) => (
            <li key={p}>
              <CheckCircle2 size={18} /> {p}
            </li>
          ))}
        </ul>
      </div>
      <main className="auth__main">
        <div className="auth__card">
          <div className="auth__mobile-logo">
            <Logo />
          </div>
          <h1>{title}</h1>
          <p className="muted">{subtitle}</p>
          {children}
        </div>
      </main>
    </div>
  );
}
