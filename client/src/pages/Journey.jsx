import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown, CheckCircle2, Clock, Flag, History as HistoryIcon, LocateFixed, MapPin, Navigation, Phone, Radio, Search, Timer, User, XCircle,
} from 'lucide-react';
import MapView from '../components/MapView.jsx';
import { Card, CardHeader, ConfirmDialog, EmptyState, ErrorState, Field, LoadingState, Notice, PageHeader, Spinner, StatusPill, Toggle } from '../components/ui.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useUserLocation } from '../context/LocationContext.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { useNow } from '../hooks/useNow.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { contactService, journeyService } from '../services/index.js';
import { searchPlaces, watchPosition } from '../services/locationService.js';
import { formatDate, formatDuration, formatTime, nextOccurrence, telHref, timeInputValue } from '../utils/format.js';
import { validateJourney } from '../utils/validators.js';

const QUICK_MINUTES = [15, 30, 45, 60];

/* ---------------- Destination search with suggestions ---------------- */

function PlaceInput({ value, onChange, onSelect, near, inputProps }) {
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const timer = useRef(null);
  const listId = 'place-suggestions';

  useEffect(() => {
    clearTimeout(timer.current);
    if (value.trim().length < 3) {
      setResults([]);
      return;
    }
    timer.current = setTimeout(async () => {
      setLoading(true);
      const found = await searchPlaces(value, near);
      setResults(found);
      setLoading(false);
      setActive(-1);
    }, 450);
    return () => clearTimeout(timer.current);
  }, [value, near]);

  const choose = (p) => {
    onSelect(p);
    setOpen(false);
  };

  return (
    <div className="combo">
      <div className="input-group">
        <input
          {...inputProps}
          className="input"
          value={value}
          autoComplete="off"
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          placeholder="Search a place or type a name, e.g. University"
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (!open || !results.length) return;
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, results.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === 'Enter' && active >= 0) {
              e.preventDefault();
              choose(results[active]);
            } else if (e.key === 'Escape') setOpen(false);
          }}
        />
        <span className="input-group__icon" aria-hidden="true">
          {loading ? <Spinner size={15} /> : <Search size={15} />}
        </span>
      </div>
      {open && results.length > 0 && (
        <ul className="combo__list" id={listId} role="listbox">
          {results.map((p, i) => (
            <li key={p.id} role="option" aria-selected={i === active} className={i === active ? 'is-active' : ''} onMouseDown={() => choose(p)}>
              <MapPin size={15} aria-hidden="true" />
              <span>
                <strong>{p.label}</strong>
                <small>{p.address}</small>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------------- Start journey form ---------------- */

function StartJourney({ contacts, onStarted }) {
  const toast = useToast();
  const loc = useUserLocation();
  const [start, setStart] = useState({ label: 'Home', lat: null, lng: null });
  const [dest, setDest] = useState({ label: '', lat: null, lng: null });
  const [time, setTime] = useState(() => timeInputValue(new Date(Date.now() + 30 * 60_000)));
  const [contactId, setContactId] = useState(() => contacts.find((c) => c.isPrimary)?.id || '');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const arrival = nextOccurrence(time);
  const minutesAway = arrival ? Math.round((arrival.getTime() - Date.now()) / 60_000) : null;

  async function useCurrentLocation() {
    const pos = loc.position || (await loc.locate());
    if (!pos) {
      toast.error(loc.error || 'Could not get your location.');
      return;
    }
    setStart({ label: loc.address?.short || 'Current location', lat: pos.lat, lng: pos.lng });
    setErrors((e) => ({ ...e, start: undefined }));
  }

  async function submit(e) {
    e.preventDefault();
    const errs = validateJourney({ start: start.label, destination: dest.label, arrival });
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const startPos = start.lat != null ? start : loc.position ? { ...start, lat: loc.position.lat, lng: loc.position.lng } : start;
      const journey = await journeyService.start({
        start: { label: start.label.trim(), lat: startPos.lat, lng: startPos.lng },
        destination: { label: dest.label.trim(), lat: dest.lat, lng: dest.lng },
        expectedArrival: arrival.toISOString(),
        contactId: contactId ? Number(contactId) : null,
      });
      toast.success('Safe journey started. Check in when you arrive.');
      onStarted(journey);
    } catch (err) {
      if (err.fields) setErrors({ ...err.fields, arrival: err.fields.expectedArrival });
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  const previewMarkers = [
    start.lat != null && { id: 's', lat: start.lat, lng: start.lng, kind: 'start', title: start.label },
    dest.lat != null && { id: 'd', lat: dest.lat, lng: dest.lng, kind: 'dest', title: dest.label },
  ].filter(Boolean);

  return (
    <div className="journey-layout">
      <Card>
        <CardHeader icon={Navigation} title="Plan a safe journey" />
        <form className="form" noValidate onSubmit={submit}>
          <Field label="Starting location" error={errors.start} required>
            {(p) => (
              <div className="input-group">
                <input {...p} className="input" value={start.label} onChange={(e) => setStart({ label: e.target.value, lat: null, lng: null })} placeholder="e.g. Home" />
                <button type="button" className="input-group__btn input-group__btn--text" onClick={useCurrentLocation} disabled={loc.status === 'loading'}>
                  {loc.status === 'loading' ? <Spinner size={15} /> : <LocateFixed size={15} />} <span className="hide-xs">Use current</span>
                </button>
              </div>
            )}
          </Field>

          <Field label="Destination" error={errors.destination} required hint={dest.lat != null ? 'Location found on map ✓' : 'Pick a suggestion to show it on the map (optional).'}>
            {(p) => (
              <PlaceInput
                value={dest.label}
                near={loc.position}
                inputProps={p}
                onChange={(label) => setDest({ label, lat: null, lng: null })}
                onSelect={(place) => {
                  setDest({ label: place.label, lat: place.lat, lng: place.lng });
                  setErrors((er) => ({ ...er, destination: undefined }));
                }}
              />
            )}
          </Field>

          <Field label="Expected arrival time" error={errors.arrival} required hint={minutesAway != null ? `In about ${formatDuration(minutesAway * 60_000)}${arrival.getDate() !== new Date().getDate() ? ' (tomorrow)' : ''}` : undefined}>
            {(p) => (
              <div className="time-row">
                <input {...p} type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
                <div className="chips" role="group" aria-label="Quick arrival times">
                  {QUICK_MINUTES.map((m) => (
                    <button type="button" key={m} className="chip" onClick={() => setTime(timeInputValue(new Date(Date.now() + m * 60_000)))}>
                      +{m}m
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Field>

          <Field label="Trusted contact" hint={contacts.length ? 'Who should know about this journey?' : 'Add contacts to choose one here.'}>
            {(p) => (
              <select {...p} className="input" value={contactId} onChange={(e) => setContactId(e.target.value)}>
                <option value="">No contact</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.relationship}
                    {c.isPrimary ? ' (primary)' : ''}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <button className="btn btn--primary btn--lg btn--block" disabled={busy}>
            {busy ? <Spinner /> : <Navigation size={18} />} Start Safe Journey
          </button>
        </form>
      </Card>

      <Card className="journey-map-card">
        <CardHeader icon={MapPin} title="Route preview" />
        {previewMarkers.length || loc.position ? (
          <MapView
            center={previewMarkers[0] || loc.position}
            markers={previewMarkers.length ? previewMarkers : [{ id: 'me', ...loc.position, kind: 'me', title: 'You' }]}
            path={previewMarkers.length === 2 ? previewMarkers.map((m) => [m.lat, m.lng]) : null}
            fit
            height={380}
            label="Journey route preview"
          />
        ) : (
          <EmptyState icon={MapPin} title="Map preview" text="Use your current location or pick a destination suggestion to see the route here." />
        )}
      </Card>
    </div>
  );
}

/* ---------------- Active journey ---------------- */

function ActiveJourney({ journey, setJourney, onEnded }) {
  const toast = useToast();
  const loc = useUserLocation();
  const { settings } = useSettings();
  const now = useNow(1000);
  const [busy, setBusy] = useState(null);
  const [tracking, setTracking] = useState(false);
  const [live, setLive] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const lastSent = useRef(0);
  const notified = useRef(false);

  const total = new Date(journey.expectedArrival) - new Date(journey.startedAt);
  const remaining = new Date(journey.expectedArrival).getTime() - now;
  const overdue = remaining < 0;
  const progress = Math.min(100, Math.max(0, ((total - remaining) / total) * 100));
  const current = live || journey.lastLocation || loc.position;

  // Live tracking only while the user has switched it on, and only on this page.
  useEffect(() => {
    if (!tracking) return;
    const stop = watchPosition(
      (pos) => {
        setLive(pos);
        if (Date.now() - lastSent.current > 60_000) {
          lastSent.current = Date.now();
          journeyService.updateLocation(journey.id, { lat: pos.lat, lng: pos.lng }).catch(() => {});
        }
      },
      (err) => {
        toast.error(err.message);
        setTracking(false);
      },
    );
    return stop;
  }, [tracking, journey.id, toast]);

  // One reminder when the journey becomes overdue.
  useEffect(() => {
    if (!overdue || notified.current) return;
    notified.current = true;
    if (settings.checkinReminders) {
      toast.info('You’ve reached your expected arrival time. Please check in.', 8000);
      try {
        if (settings.notifications && 'Notification' in window && Notification.permission === 'granted') {
          new Notification('LifeOS check-in', { body: `Have you arrived at ${journey.destination.label}? Tap “I’m Safe”.`, icon: '/favicon.svg' });
        }
      } catch {
        /* ignore */
      }
    }
  }, [overdue, settings, toast, journey.destination.label]);

  const pos = current ? { lat: current.lat, lng: current.lng } : undefined;

  async function act(kind, fn, message) {
    setBusy(kind);
    try {
      const j = await fn();
      toast.success(message);
      if (j.status === 'active') setJourney(j);
      else onEnded(j);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  }

  const markers = [
    journey.start.lat != null && { id: 's', lat: journey.start.lat, lng: journey.start.lng, kind: 'start', title: `Start: ${journey.start.label}` },
    current && { id: 'c', lat: current.lat, lng: current.lng, kind: 'me', title: 'Current location' },
    journey.destination.lat != null && { id: 'd', lat: journey.destination.lat, lng: journey.destination.lng, kind: 'dest', title: `Destination: ${journey.destination.label}` },
  ].filter(Boolean);

  return (
    <div className="journey-layout">
      <Card className={`journey-active ${overdue ? 'journey-active--overdue' : ''}`}>
        <div className="journey-active__head">
          <StatusPill tone={overdue ? 'danger' : 'primary'} pulse>
            {overdue ? 'CHECK-IN OVERDUE' : 'JOURNEY ACTIVE'}
          </StatusPill>
          <span className="muted small">Started {formatTime(journey.startedAt)}</span>
        </div>

        <ol className="route-steps" aria-label="Journey route">
          <li className="route-steps__item route-steps__item--start">
            <span className="route-steps__dot" aria-hidden="true" />
            <div>
              <small>From</small>
              <strong>{journey.start.label}</strong>
            </div>
          </li>
          <li className="route-steps__arrow" aria-hidden="true">
            <ArrowDown size={16} />
          </li>
          <li className="route-steps__item route-steps__item--current">
            <span className="route-steps__dot" aria-hidden="true" />
            <div>
              <small>Now</small>
              <strong>{current ? (tracking ? 'Live location' : 'Current location') : 'Location not shared'}</strong>
            </div>
          </li>
          <li className="route-steps__arrow" aria-hidden="true">
            <ArrowDown size={16} />
          </li>
          <li className="route-steps__item route-steps__item--dest">
            <span className="route-steps__dot" aria-hidden="true" />
            <div>
              <small>To</small>
              <strong>{journey.destination.label}</strong>
            </div>
          </li>
        </ol>

        <div className="journey-times">
          <div>
            <small>Expected arrival</small>
            <strong>{formatTime(journey.expectedArrival)}</strong>
          </div>
          <div>
            <small>{overdue ? 'Overdue by' : 'Time remaining'}</small>
            <strong className={overdue ? 'text-danger' : 'text-primary'} aria-live="off">
              {formatDuration(remaining)}
            </strong>
          </div>
        </div>
        <div className="progress" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label="Journey progress">
          <span style={{ width: `${progress}%` }} />
        </div>

        {overdue && (
          <Notice tone="danger" title="Are you okay?">
            You’ve passed your expected arrival time. Check in, extend your time, or use SOS if you need help.
          </Notice>
        )}

        {journey.contact && (
          <div className="journey-contact">
            <User size={16} aria-hidden="true" />
            <span>
              Trusted contact: <strong>{journey.contact.name}</strong> ({journey.contact.relationship})
            </span>
            <a className="btn btn--ghost btn--sm" href={telHref(journey.contact.phone)}>
              <Phone size={14} /> Call
            </a>
          </div>
        )}

        <div className="journey-actions">
          <button className="btn btn--success btn--lg" disabled={Boolean(busy)} onClick={() => act('checkin', () => journeyService.checkIn(journey.id, pos), 'Check-in successful ✓')}>
            {busy === 'checkin' ? <Spinner /> : <CheckCircle2 size={19} />} I’m Safe
          </button>
          <button className="btn btn--primary btn--lg" disabled={Boolean(busy)} onClick={() => act('complete', () => journeyService.complete(journey.id, pos), 'Arrived safely ✓ Journey completed.')}>
            {busy === 'complete' ? <Spinner /> : <Flag size={19} />} End Journey
          </button>
        </div>
        <div className="journey-secondary">
          <button className="btn btn--ghost btn--sm" disabled={Boolean(busy)} onClick={() => act('extend', () => journeyService.extend(journey.id, 15), 'Arrival time extended by 15 minutes.')}>
            <Timer size={15} /> +15 min
          </button>
          <button className="btn btn--ghost btn--sm" disabled={Boolean(busy)} onClick={() => setConfirmCancel(true)}>
            <XCircle size={15} /> Cancel journey
          </button>
          <span className="muted small">
            <CheckCircle2 size={13} aria-hidden="true" /> {journey.checkins} check-in{journey.checkins === 1 ? '' : 's'}
          </span>
        </div>
      </Card>

      <Card className="journey-map-card">
        <CardHeader icon={MapPin} title="Live map" />
        <Toggle
          checked={tracking}
          onChange={setTracking}
          label="Share live location on map"
          description="Uses your browser’s location only while this page is open. Turn off anytime."
        />
        {markers.length ? (
          <MapView
            center={current || markers[0]}
            markers={markers}
            path={markers.length > 1 ? markers.map((m) => [m.lat, m.lng]) : null}
            accuracy={live?.accuracy}
            fit={!tracking}
            height={380}
            label="Journey map"
          />
        ) : (
          <EmptyState
            icon={Radio}
            title="No map data yet"
            text="Turn on live location or start journeys from a searched destination to see them on the map."
            action={
              <button className="btn btn--primary btn--sm" onClick={() => setTracking(true)}>
                <LocateFixed size={15} /> Show my location
              </button>
            }
          />
        )}
      </Card>

      <ConfirmDialog
        open={confirmCancel}
        title="Cancel this journey?"
        message="The journey will end without an arrival check-in. This is recorded in your safety history."
        confirmLabel="Cancel journey"
        busy={busy === 'cancel'}
        onCancel={() => setConfirmCancel(false)}
        onConfirm={async () => {
          await act('cancel', () => journeyService.cancel(journey.id, pos), 'Journey cancelled.');
          setConfirmCancel(false);
        }}
      />
    </div>
  );
}

/* ---------------- Page ---------------- */

export default function Journey() {
  useDocumentTitle('Journey');
  const { data, loading, error, reload, setData } = useAsync(async () => {
    const [journey, contacts, recent] = await Promise.all([journeyService.getActive(), contactService.list(), journeyService.list(6)]);
    return { journey, contacts, recent };
  });

  const recent = useMemo(() => (data?.recent || []).filter((j) => j.status !== 'active'), [data]);

  return (
    <div className="page">
      <PageHeader
        eyebrow="Journey safety"
        title={data?.journey ? 'Journey in progress' : 'Start a safe journey'}
        subtitle="Tell LifeOS where you’re going and when you expect to arrive. Check in when you get there."
      />

      {loading ? (
        <LoadingState label="Loading your journey…" />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : data.journey ? (
        <ActiveJourney
          journey={data.journey}
          setJourney={(j) => setData((d) => ({ ...d, journey: j }))}
          onEnded={() => reload({ silent: true })}
        />
      ) : (
        <StartJourney contacts={data.contacts} onStarted={(j) => setData((d) => ({ ...d, journey: j }))} />
      )}

      {!loading && !error && recent.length > 0 && (
        <Card className="mt-lg">
          <CardHeader icon={HistoryIcon} title="Recent journeys" tone="warning" />
          <ul className="journey-history">
            {recent.map((j) => (
              <li key={j.id}>
                <span className={`icon-chip icon-chip--${j.status === 'completed' ? 'success' : 'neutral'}`} aria-hidden="true">
                  {j.status === 'completed' ? <Flag size={15} /> : <XCircle size={15} />}
                </span>
                <div>
                  <strong>
                    {j.start.label} → {j.destination.label}
                  </strong>
                  <small>
                    {formatDate(j.startedAt)} · {formatTime(j.startedAt)}–{formatTime(j.endedAt)}
                  </small>
                </div>
                <span className={`badge ${j.status === 'completed' ? 'badge--success' : ''}`}>{j.status === 'completed' ? 'Arrived safely' : 'Cancelled'}</span>
                <span className="muted small hide-xs">
                  <Clock size={13} aria-hidden="true" /> {formatDuration(new Date(j.endedAt) - new Date(j.startedAt))}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
