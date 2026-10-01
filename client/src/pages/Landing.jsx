import { Link } from 'react-router-dom';
import {
  ArrowRight, Bell, CheckCircle2, Clock, Database, History, Lock, MapPin, Navigation, Phone, QrCode, ShieldCheck, Siren, Users,
} from 'lucide-react';
import { Logo, ShieldGraphic } from '../components/Brand.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

const FEATURES = [
  { icon: Siren, tone: 'danger', title: 'Emergency SOS', text: 'Quickly access emergency actions with a cancellable countdown, your live location and one-tap calling.' },
  { icon: Navigation, tone: 'primary', title: 'Journey Safety', text: 'Monitor your journey on a live map and check in when you arrive. Overdue? LifeOS reminds you.' },
  { icon: Users, tone: 'violet', title: 'Emergency Contacts', text: 'Keep trusted contacts organised by priority, with a primary contact always one tap away.' },
  { icon: QrCode, tone: 'success', title: 'Digital Emergency Card', text: 'Share vital information through a QR code. You decide exactly which details are visible.' },
  { icon: History, tone: 'warning', title: 'Safety Timeline', text: 'Review past journeys, check-ins and alerts in a clear, filterable timeline.' },
  { icon: MapPin, tone: 'primary', title: 'Nearby Help', text: 'Find hospitals, police, fire stations and pharmacies around you using OpenStreetMap.' },
];

const STEPS = [
  { icon: Users, title: 'Add trusted contacts', text: 'Family and friends who should know when something is wrong.' },
  { icon: Navigation, title: 'Start a safe journey', text: 'Tell LifeOS where you are going and when you expect to arrive.' },
  { icon: CheckCircle2, title: 'Check in — or get help', text: 'Tap “I’m Safe” on arrival, or SOS when you need help.' },
];

export default function Landing() {
  useDocumentTitle();
  const { isAuthenticated } = useAuth();

  return (
    <div className="landing">
      <header className="landing-nav">
        <Logo />
        <nav aria-label="Landing">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#privacy">Privacy</a>
        </nav>
        <div className="landing-nav__cta">
          {isAuthenticated ? (
            <Link to="/dashboard" className="btn btn--primary btn--sm">
              Open dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className="btn btn--ghost btn--sm">
                Log in
              </Link>
              <Link to="/register" className="btn btn--primary btn--sm hide-xs">
                Get started
              </Link>
            </>
          )}
        </div>
      </header>

      <section className="hero">
        <div className="hero__text">
          <span className="hero__badge">
            <ShieldCheck size={15} aria-hidden="true" /> Personal safety, reimagined
          </span>
          <h1>
            Your Safety.
            <br />
            <span className="gradient-text">Always Within Reach.</span>
          </h1>
          <p className="hero__sub">
            LifeOS brings your emergency contacts, journeys, safety check-ins and emergency information into one intelligent safety dashboard.
          </p>
          <div className="hero__actions">
            <Link to={isAuthenticated ? '/dashboard' : '/register'} className="btn btn--primary btn--lg">
              Get Started <ArrowRight size={18} />
            </Link>
            <a href="#features" className="btn btn--ghost btn--lg">
              Explore Features
            </a>
          </div>
          <ul className="hero__trust">
            <li>
              <Lock size={15} aria-hidden="true" /> Private by default
            </li>
            <li>
              <Clock size={15} aria-hidden="true" /> 5-second SOS
            </li>
            <li>
              <Database size={15} aria-hidden="true" /> Your data, exportable
            </li>
          </ul>
        </div>

        <div className="hero__visual" aria-hidden="true">
          <div className="hero__glow" />
          <ShieldGraphic size={260} />
          <div className="float-card float-card--a">
            <span className="icon-chip icon-chip--success">
              <CheckCircle2 size={16} />
            </span>
            <div>
              <strong>Arrived safely</strong>
              <small>Home → University · 9:32 PM</small>
            </div>
          </div>
          <div className="float-card float-card--b">
            <span className="icon-chip icon-chip--primary">
              <Navigation size={16} />
            </span>
            <div>
              <strong>Journey active</strong>
              <small>18 min remaining</small>
            </div>
          </div>
          <div className="float-card float-card--c">
            <span className="icon-chip icon-chip--violet">
              <Bell size={16} />
            </span>
            <div>
              <strong>3 trusted contacts</strong>
              <small>Mother is primary</small>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="landing-section">
        <div className="section-head">
          <p className="eyebrow">Features</p>
          <h2>Everything you need when it matters most</h2>
          <p className="muted">Designed for calm, fast decisions — on any device.</p>
        </div>
        <div className="feature-grid">
          {FEATURES.map(({ icon: Icon, tone, title, text }) => (
            <article key={title} className="feature-card">
              <span className={`icon-chip icon-chip--${tone} icon-chip--lg`} aria-hidden="true">
                <Icon size={22} />
              </span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="how" className="landing-section">
        <div className="section-head">
          <p className="eyebrow">How it works</p>
          <h2>Three steps to feeling safer</h2>
        </div>
        <ol className="steps">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="step">
              <span className="step__num">{i + 1}</span>
              <Icon size={22} aria-hidden="true" className="step__icon" />
              <h3>{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="privacy" className="landing-section">
        <div className="privacy-band">
          <div>
            <p className="eyebrow">Privacy & honesty</p>
            <h2>You stay in control</h2>
            <p className="muted">
              Location is only read when you allow it. Your emergency card hides medical details until you choose to show them. LifeOS is a student
              project: SOS alerts are simulated and never claim to contact police, ambulance or your contacts automatically — calls open your own phone dialer.
            </p>
          </div>
          <ul className="privacy-list">
            <li>
              <MapPin size={18} aria-hidden="true" /> Location on request only
            </li>
            <li>
              <QrCode size={18} aria-hidden="true" /> Opt-in emergency card fields
            </li>
            <li>
              <Phone size={18} aria-hidden="true" /> Real calls via your dialer
            </li>
            <li>
              <Lock size={18} aria-hidden="true" /> Hashed passwords, JWT sessions
            </li>
          </ul>
        </div>
      </section>

      <section className="landing-section">
        <div className="cta-band">
          <h2>Ready to feel safer?</h2>
          <p>Create your free LifeOS account or explore the demo.</p>
          <div className="hero__actions">
            <Link to="/register" className="btn btn--primary btn--lg">
              Create account <ArrowRight size={18} />
            </Link>
            <Link to="/login" className="btn btn--ghost btn--lg">
              Try the demo
            </Link>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <Logo />
        <p>© {new Date().getFullYear()} LifeOS · Web Technology project. In a real emergency, call your local emergency number.</p>
      </footer>
    </div>
  );
}
