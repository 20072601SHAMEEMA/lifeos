import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, CheckCircle2, Clock, History as HistoryIcon, LocateFixed, MapPin, Navigation, ShieldCheck, Siren, Users,
} from 'lucide-react';
import { ShieldGraphic } from '../components/Brand.jsx';
import MapView from '../components/MapView.jsx';
import { Avatar, Card, CardHeader, EmptyState, ErrorState, Skeleton, Spinner, StatusPill } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useUserLocation } from '../context/LocationContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { useNow } from '../hooks/useNow.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { contactService, emergencyService, historyService, journeyService } from '../services/index.js';
import { formatCoord, formatDuration, formatTime, greeting, relativeTime } from '../utils/format.js';
import { EVENT_META } from '../data/eventTypes.js';

export default function Dashboard() {
  useDocumentTitle('Dashboard');
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const now = useNow(15_000);
  const loc = useUserLocation();
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkedInAt, setCheckedInAt] = useState(null);

  const { data, loading, error, reload, setData } = useAsync(async () => {
    const [contacts, journey, sos, history] = await Promise.all([
      contactService.list(),
      journeyService.getActive(),
      emergencyService.getActive(),
      historyService.list(),
    ]);
    return { contacts, journey, sos, history: history.events.slice(0, 5) };
  });

  const journey = data?.journey;
  const remainingMs = journey ? new Date(journey.expectedArrival).getTime() - now : 0;
  const overdue = journey && remainingMs < 0;

  const status = data?.sos
    ? { tone: 'alert', title: 'SOS ACTIVE', text: 'Emergency mode is on. Open it to manage or mark yourself safe.' }
    : overdue
      ? { tone: 'alert', title: 'CHECK-IN NEEDED', text: `You were expected at ${journey.destination.label} ${formatDuration(-remainingMs)} ago.` }
      : journey
        ? { tone: 'active', title: 'JOURNEY IN PROGRESS', text: `Heading to ${journey.destination.label}. We’ll remind you to check in.` }
        : { tone: 'safe', title: 'YOU ARE SAFE ✓', text: 'No active alerts. Your safety tools are ready when you need them.' };

  async function checkIn() {
    setCheckingIn(true);
    const pos = loc.position ? { lat: loc.position.lat, lng: loc.position.lng } : undefined;
    try {
      if (journey) {
        const updated = await journeyService.checkIn(journey.id, pos);
        setData((d) => ({ ...d, journey: updated }));
      } else {
        await historyService.log('checkin', 'Daily check-in from dashboard', pos);
      }
      setCheckedInAt(new Date().toISOString());
      toast.success('Check-in successful ✓ Saved to your safety history.');
      reload({ silent: true });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCheckingIn(false);
    }
  }

  return (
    <div className="page">
      <header className="dash-hero">
        <div>
          <h1 className="page-title">
            {greeting()}, {user?.name?.split(' ')[0]} <span aria-hidden="true">👋</span>
          </h1>
          <p className="page-subtitle">Your personal safety center</p>
        </div>
        <Link to="/journey" className="btn btn--ghost hide-xs">
          <Navigation size={17} /> {journey ? 'View journey' : 'Start journey'}
        </Link>
      </header>

      {error && <ErrorState error={error} onRetry={reload} />}

      <div className="dash-grid">
        {/* Safety status */}
        <Card className={`status-card status-card--${status.tone} span-2`} aria-live="polite">
          <ShieldGraphic tone={status.tone} size={150} label={status.title} />
          <div className="status-card__text">
            <p className="eyebrow">Safety status</p>
            {loading ? <Skeleton height={34} width="70%" /> : <h2 className="status-card__title">{status.title}</h2>}
            <p className="muted">{loading ? 'Checking your status…' : status.text}</p>
            <div className="status-card__meta">
              <StatusPill tone={loc.position ? 'success' : 'neutral'}>{loc.position ? 'Location available' : 'Location off'}</StatusPill>
              <StatusPill tone={data?.contacts?.length ? 'success' : 'warning'}>
                {data?.contacts?.length ?? 0} trusted contact{data?.contacts?.length === 1 ? '' : 's'}
              </StatusPill>
              {data?.sos && (
                <Link to="/emergency" className="btn btn--danger btn--sm">
                  Open emergency mode
                </Link>
              )}
            </div>
          </div>
        </Card>

        {/* SOS */}
        <Card className="sos-card">
          <CardHeader icon={Siren} title="Emergency SOS" tone="danger" />
          <button className="sos-button" onClick={() => navigate('/emergency')} aria-label="Open emergency SOS mode">
            <span className="sos-button__ring" aria-hidden="true" />
            <span className="sos-button__ring sos-button__ring--2" aria-hidden="true" />
            <span className="sos-button__label">SOS</span>
          </button>
          <p className="muted center small">Press to open emergency mode. You’ll get a countdown to cancel.</p>
        </Card>

        {/* Location */}
        <Card className="span-2 location-card">
          <CardHeader
            icon={MapPin}
            title="Current Location"
            action={
              <button className="btn btn--ghost btn--sm" onClick={loc.locate} disabled={loc.status === 'loading'}>
                {loc.status === 'loading' ? <Spinner size={15} /> : <LocateFixed size={15} />}
                {loc.position ? 'Refresh' : 'Locate me'}
              </button>
            }
          />
          {loc.position ? (
            <div className="location-card__body">
              <dl className="kv">
                <div>
                  <dt>Location</dt>
                  <dd>{loc.address?.short || 'Resolving address…'}</dd>
                </div>
                <div>
                  <dt>Latitude</dt>
                  <dd className="mono">{formatCoord(loc.position.lat)}</dd>
                </div>
                <div>
                  <dt>Longitude</dt>
                  <dd className="mono">{formatCoord(loc.position.lng)}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>
                    <StatusPill tone={loc.status === 'error' ? 'warning' : 'success'}>
                      {loc.status === 'error' ? 'Last known' : `Accurate to ±${loc.position.accuracy ?? '?'} m`}
                    </StatusPill>
                  </dd>
                </div>
              </dl>
              <MapView center={loc.position} accuracy={loc.position.accuracy} markers={[{ id: 'me', ...loc.position, kind: 'me', title: 'You are here' }]} height={200} zoom={15} label="Your current location" />
            </div>
          ) : (
            <EmptyState
              icon={MapPin}
              title={loc.status === 'error' ? 'Location unavailable' : 'Location is off'}
              text={loc.error || 'LifeOS only reads your location when you ask. It is never tracked in the background.'}
              action={
                loc.status !== 'unsupported' && (
                  <button className="btn btn--primary btn--sm" onClick={loc.locate} disabled={loc.status === 'loading'}>
                    {loc.status === 'loading' ? <Spinner size={15} /> : <LocateFixed size={15} />} Share my location
                  </button>
                )
              }
            />
          )}
        </Card>

        {/* Contacts */}
        <Card>
          <CardHeader icon={Users} title="Emergency Contacts" tone="violet" />
          {loading ? (
            <Skeleton height={60} />
          ) : (
            <>
              <p className="big-stat">
                {data?.contacts?.length ?? 0}
                <span>trusted contact{data?.contacts?.length === 1 ? '' : 's'}</span>
              </p>
              {data?.contacts?.length ? (
                <div className="avatar-stack" aria-label={data.contacts.map((c) => c.name).join(', ')}>
                  {data.contacts.slice(0, 5).map((c) => (
                    <Avatar key={c.id} name={c.name} size={36} />
                  ))}
                </div>
              ) : (
                <p className="muted small">Add at least one person who should know when you need help.</p>
              )}
            </>
          )}
          <Link to="/contacts" className="btn btn--ghost btn--block mt-auto">
            Manage Contacts <ArrowRight size={16} />
          </Link>
        </Card>

        {/* Journey */}
        <Card className="span-2">
          <CardHeader
            icon={Navigation}
            title="Current Journey"
            action={journey && <StatusPill tone={overdue ? 'danger' : 'primary'} pulse>{overdue ? 'Overdue' : 'Journey Active'}</StatusPill>}
          />
          {loading ? (
            <Skeleton height={90} />
          ) : journey ? (
            <div className="journey-mini">
              <p className="journey-mini__route">
                {journey.start.label} <ArrowRight size={18} aria-label="to" /> {journey.destination.label}
              </p>
              <dl className="kv kv--row">
                <div>
                  <dt>Started</dt>
                  <dd>{formatTime(journey.startedAt)}</dd>
                </div>
                <div>
                  <dt>Expected arrival</dt>
                  <dd>{formatTime(journey.expectedArrival)}</dd>
                </div>
                <div>
                  <dt>{overdue ? 'Overdue by' : 'Remaining'}</dt>
                  <dd className={overdue ? 'text-danger' : ''}>{formatDuration(remainingMs)}</dd>
                </div>
                <div>
                  <dt>Trusted contact</dt>
                  <dd>{journey.contact?.name || '—'}</dd>
                </div>
              </dl>
              <Link to="/journey" className="btn btn--ghost btn--sm">
                Open journey <ArrowRight size={15} />
              </Link>
            </div>
          ) : (
            <EmptyState
              icon={Navigation}
              title="No active journey"
              text="Heading somewhere? Start a safe journey and check in when you arrive."
              action={
                <Link to="/journey" className="btn btn--primary btn--sm">
                  Start Safe Journey
                </Link>
              }
            />
          )}
        </Card>

        {/* Check-in */}
        <Card className="checkin-card">
          <CardHeader icon={ShieldCheck} title="Safety Check-In" tone="success" />
          {checkedInAt ? (
            <div className="checkin-success" role="status">
              <span className="checkin-success__icon">
                <CheckCircle2 size={40} />
              </span>
              <strong>Check-in successful ✓</strong>
              <small className="muted">at {formatTime(checkedInAt)}</small>
            </div>
          ) : (
            <p className="muted">
              {journey
                ? overdue
                  ? 'You’ve passed your expected arrival time. Let us know you’re okay.'
                  : `You should arrive in approximately ${formatDuration(remainingMs)}.`
                : 'Let your safety log know you’re okay right now.'}
            </p>
          )}
          <button className="btn btn--success btn--lg btn--block mt-auto" onClick={checkIn} disabled={checkingIn || loading}>
            {checkingIn ? <Spinner /> : <CheckCircle2 size={19} />} I’m Safe
          </button>
        </Card>

        {/* Recent activity */}
        <Card className="span-3">
          <CardHeader
            icon={HistoryIcon}
            title="Recent Activity"
            tone="warning"
            action={
              <Link to="/history" className="link-btn">
                View all <ArrowRight size={14} />
              </Link>
            }
          />
          {loading ? (
            <Skeleton height={120} />
          ) : data?.history?.length ? (
            <ul className="activity-list">
              {data.history.map((e) => {
                const meta = EVENT_META[e.type] || EVENT_META.default;
                return (
                  <li key={e.id}>
                    <span className={`icon-chip icon-chip--${meta.tone}`} aria-hidden="true">
                      <meta.icon size={16} />
                    </span>
                    <div>
                      <strong>{e.title}</strong>
                      {e.detail && <small>{e.detail}</small>}
                    </div>
                    <time dateTime={e.createdAt} title={new Date(e.createdAt).toLocaleString()}>
                      <Clock size={13} aria-hidden="true" /> {relativeTime(e.createdAt, now)}
                    </time>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState icon={HistoryIcon} title="No activity yet" text="Check-ins, journeys and alerts will appear here." />
          )}
        </Card>
      </div>
    </div>
  );
}
