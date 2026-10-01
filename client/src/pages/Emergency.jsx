import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, ArrowLeft, Clock, FlaskConical, LocateFixed, MapPin, MessageSquare, Phone, PhoneCall, Share2, ShieldCheck, Siren, Users, X,
} from 'lucide-react';
import MapView from '../components/MapView.jsx';
import { Avatar, ConfirmDialog, LoadingState, Modal, Notice, Spinner, StatusPill } from '../components/ui.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { useUserLocation } from '../context/LocationContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useNow } from '../hooks/useNow.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { contactService, emergencyService, historyService } from '../services/index.js';
import { formatCoord, formatDuration, formatTime, mapsLink, smsHref, telHref } from '../utils/format.js';

function notify(title, body) {
  try {
    if ('Notification' in window && Notification.permission === 'granted') new Notification(title, { body, icon: '/favicon.svg' });
  } catch {
    /* notifications unsupported */
  }
}

export default function Emergency() {
  useDocumentTitle('Emergency');
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const { settings } = useSettings();
  const loc = useUserLocation();
  const now = useNow(1000);

  const [stage, setStage] = useState('loading'); // loading | choose | countdown | activating | active
  const [count, setCount] = useState(settings.countdownSeconds);
  const [sos, setSos] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [alertOpen, setAlertOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(null); // 'resolve' | 'cancel'
  const cancelBtn = useRef(null);

  useEffect(() => {
    Promise.all([emergencyService.getActive(), contactService.list()])
      .then(([active, list]) => {
        setContacts(list);
        setSos(active);
        setStage(active ? 'active' : 'choose');
      })
      .catch((err) => {
        toast.error(err.message);
        setStage('choose');
      });
    if (settings.shareLocationOnSos && loc.permission !== 'denied') loc.locate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const position = loc.position;
  const posPayload = position && settings.shareLocationOnSos ? { lat: position.lat, lng: position.lng, accuracy: position.accuracy } : undefined;
  const alertList = settings.alertMode === 'all' ? contacts : contacts.filter((c) => c.isPrimary).slice(0, 1);

  const activate = useCallback(async () => {
    setBusy(true);
    try {
      const created = await emergencyService.trigger(posPayload);
      setSos(created);
      setStage('active');
      if (navigator.vibrate) navigator.vibrate([300, 120, 300]);
      if (settings.notifications) notify('LifeOS SOS activated (simulation)', 'Emergency mode is on. Use the buttons to call or message your contacts.');
    } catch (err) {
      toast.error(err.message);
      setStage('choose');
    } finally {
      setBusy(false);
    }
  }, [posPayload, settings.notifications, toast]);

  // Countdown: 5 → 4 → 3 → 2 → 1 → activate
  useEffect(() => {
    if (stage !== 'countdown') return;
    if (count <= 0) {
      setStage('activating'); // guard so activation runs exactly once
      activate();
      return;
    }
    if (navigator.vibrate) navigator.vibrate(80);
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [stage, count, activate]);

  useEffect(() => {
    if (stage === 'countdown') cancelBtn.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape' && stage === 'countdown') setStage('choose');
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [stage]);

  const startCountdown = () => {
    setCount(settings.countdownSeconds);
    setStage('countdown');
  };

  async function shareLocation() {
    const pos = position || (await loc.locate());
    if (!pos) {
      toast.error(loc.error || 'Location is unavailable. Please allow location access.');
      return;
    }
    const url = mapsLink(pos);
    const text = `${user?.name || 'I'} may need help. My current location: ${url}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'My location — LifeOS', text, url });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success('Location link copied. Paste it into any chat or message.');
      }
      historyService.log('location_shared', 'Shared location link from emergency mode', { lat: pos.lat, lng: pos.lng }).catch(() => {});
    } catch (err) {
      if (err.name !== 'AbortError') toast.error('Could not share your location. Try copying the coordinates instead.');
    }
  }

  function logCall() {
    historyService.log('call', `Opened dialer for ${settings.emergencyNumber}`, posPayload).catch(() => {});
  }

  function logAlerted() {
    historyService.log('contacts_alerted', `Opened messages to ${alertList.map((c) => c.name).join(', ')} (sent from your device)`, posPayload).catch(() => {});
  }

  async function endSos(action) {
    setBusy(true);
    try {
      await (action === 'resolve' ? emergencyService.resolve(sos.id) : emergencyService.cancel(sos.id));
      toast.success(action === 'resolve' ? 'Glad you’re safe. Emergency mode ended.' : 'SOS cancelled.');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
      setConfirmEnd(null);
    }
  }

  const smsBody = `EMERGENCY: ${user?.name || 'I'} need${user?.name ? 's' : ''} help.${position ? ` My location: ${mapsLink(position)}` : ''} (sent via LifeOS)`;

  if (stage === 'loading') {
    return (
      <div className="emergency">
        <LoadingState label="Opening emergency mode…" />
      </div>
    );
  }

  return (
    <div className={`emergency emergency--${stage}`}>
      <div className="emergency__bg" aria-hidden="true" />
      <header className="emergency__top">
        <button className="icon-btn icon-btn--glass" onClick={() => navigate(-1)} aria-label="Leave emergency mode screen">
          <ArrowLeft size={20} />
        </button>
        <span className="badge badge--sim">
          <FlaskConical size={12} aria-hidden="true" /> Student project · SOS is simulated
        </span>
      </header>

      {stage === 'choose' && (
        <section className="emergency__panel" aria-labelledby="em-title">
          <span className="emergency__icon" aria-hidden="true">
            <AlertTriangle size={34} />
          </span>
          <h1 id="em-title">ARE YOU IN AN EMERGENCY?</h1>
          <p className="emergency__sub">Choose an action. Emergency SOS starts a {settings.countdownSeconds}-second countdown you can cancel.</p>

          <div className="em-actions">
            <button className="em-action em-action--sos" onClick={startCountdown}>
              <Siren size={26} aria-hidden="true" />
              <span>
                <strong>Emergency SOS</strong>
                <small>Activate emergency mode</small>
              </span>
            </button>
            <a className="em-action" href={telHref(settings.emergencyNumber)} onClick={logCall}>
              <PhoneCall size={24} aria-hidden="true" />
              <span>
                <strong>Call Emergency Services</strong>
                <small>Opens your dialer · {settings.emergencyNumber}</small>
              </span>
            </a>
            <button className="em-action" onClick={() => setAlertOpen(true)}>
              <Users size={24} aria-hidden="true" />
              <span>
                <strong>Alert Emergency Contacts</strong>
                <small>{contacts.length ? `${alertList.length} contact${alertList.length === 1 ? '' : 's'} · via your phone` : 'No contacts saved yet'}</small>
              </span>
            </button>
            <button className="em-action" onClick={shareLocation}>
              <MapPin size={24} aria-hidden="true" />
              <span>
                <strong>Share My Location</strong>
                <small>{loc.status === 'loading' ? 'Getting location…' : position ? 'Share a maps link' : 'Requires location permission'}</small>
              </span>
            </button>
            <button className="em-action em-action--cancel" onClick={() => navigate('/dashboard')}>
              <X size={24} aria-hidden="true" />
              <span>
                <strong>Cancel</strong>
                <small>I’m okay — go back</small>
              </span>
            </button>
          </div>
        </section>
      )}

      {(stage === 'countdown' || stage === 'activating') && (
        <section className="emergency__panel emergency__panel--center" aria-live="assertive">
          <p className="eyebrow eyebrow--light">Activating SOS in</p>
          <div className="countdown" role="timer" aria-label={`${count} seconds`}>
            <svg viewBox="0 0 200 200" aria-hidden="true">
              <circle cx="100" cy="100" r="90" className="countdown__track" />
              <circle
                cx="100"
                cy="100"
                r="90"
                className="countdown__progress"
                style={{ strokeDashoffset: 565.48 * (1 - count / settings.countdownSeconds) }}
              />
            </svg>
            <span key={count} className="countdown__num">
              {stage === 'activating' ? <Spinner size={40} /> : count}
            </span>
          </div>
          <p className="emergency__sub">Tap cancel if this was a mistake.</p>
          <button ref={cancelBtn} className="btn btn--white btn--xl" onClick={() => setStage('choose')} disabled={stage === 'activating'}>
            <X size={22} /> Cancel SOS
          </button>
        </section>
      )}

      {stage === 'active' && sos && (
        <section className="emergency__panel emergency__panel--active" aria-labelledby="em-active-title">
          <div className="sos-active-head">
            <span className="sos-beacon" aria-hidden="true">
              <Siren size={34} />
            </span>
            <div>
              <h1 id="em-active-title">SOS ACTIVATED</h1>
              <p className="emergency__sub">
                Active for {formatDuration(now - new Date(sos.createdAt).getTime())} · since {formatTime(sos.createdAt)}
              </p>
            </div>
          </div>

          <Notice tone="warning" icon={FlaskConical} title="Simulation">
            This is a demonstration. No police, ambulance or contacts have been notified automatically. Use the buttons below to call or message
            for real from your own phone.
          </Notice>

          <div className="sos-grid">
            <div className="sos-tile">
              <h2>
                <Clock size={16} aria-hidden="true" /> Status
              </h2>
              <StatusPill tone="danger" pulse>
                Emergency active (simulated)
              </StatusPill>
              <p className="small muted">Triggered at {new Date(sos.createdAt).toLocaleString()}</p>
            </div>

            <div className="sos-tile">
              <h2>
                <MapPin size={16} aria-hidden="true" /> Current location
              </h2>
              {position ? (
                <>
                  <p className="mono small">
                    {formatCoord(position.lat)}, {formatCoord(position.lng)} · ±{position.accuracy ?? '?'} m
                  </p>
                  {loc.address?.short && <p className="small">{loc.address.short}</p>}
                </>
              ) : (
                <>
                  <p className="small muted">{loc.error || 'Location not shared.'}</p>
                  <button className="btn btn--white btn--sm" onClick={loc.locate} disabled={loc.status === 'loading'}>
                    {loc.status === 'loading' ? <Spinner size={15} /> : <LocateFixed size={15} />} Get location
                  </button>
                </>
              )}
            </div>

            {position && (
              <div className="sos-tile sos-tile--map">
                <MapView center={position} accuracy={position.accuracy} markers={[{ id: 'me', ...position, kind: 'sos', title: 'Your location' }]} height={220} zoom={16} label="Your SOS location" />
              </div>
            )}

            <div className="sos-tile sos-tile--contacts">
              <h2>
                <Users size={16} aria-hidden="true" /> Emergency contacts
              </h2>
              {contacts.length ? (
                <ul className="sos-contacts">
                  {contacts.map((c) => (
                    <li key={c.id}>
                      <Avatar name={c.name} size={36} />
                      <span>
                        <strong>{c.name}</strong>
                        <small>
                          {c.relationship}
                          {c.isPrimary ? ' · Primary' : ''}
                        </small>
                      </span>
                      <a className="icon-btn icon-btn--glass" href={smsHref(c.phone, smsBody)} onClick={logAlerted} aria-label={`Message ${c.name}`}>
                        <MessageSquare size={17} />
                      </a>
                      <a className="icon-btn icon-btn--glass" href={telHref(c.phone)} aria-label={`Call ${c.name}`}>
                        <Phone size={17} />
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="small muted">No emergency contacts saved. Add them from the Contacts page.</p>
              )}
            </div>
          </div>

          <div className="sos-actions">
            <a className="btn btn--white btn--lg" href={telHref(settings.emergencyNumber)} onClick={logCall}>
              <PhoneCall size={19} /> Call {settings.emergencyNumber}
            </a>
            <button className="btn btn--glass btn--lg" onClick={shareLocation}>
              <Share2 size={19} /> Share location
            </button>
            <button className="btn btn--success btn--lg" onClick={() => setConfirmEnd('resolve')}>
              <ShieldCheck size={19} /> I’m safe now
            </button>
            <button className="btn btn--glass btn--lg" onClick={() => setConfirmEnd('cancel')}>
              <X size={19} /> False alarm
            </button>
          </div>
        </section>
      )}

      <Modal open={alertOpen} onClose={() => setAlertOpen(false)} title="Alert emergency contacts">
        <Notice tone="info" icon={FlaskConical}>
          LifeOS does not send messages automatically in this version. Each button opens your phone’s messaging app with a prefilled message
          {position ? ' including your location' : ''} — you press send.
        </Notice>
        {alertList.length ? (
          <ul className="alert-list">
            {alertList.map((c) => (
              <li key={c.id}>
                <Avatar name={c.name} size={40} />
                <span>
                  <strong>{c.name}</strong>
                  <small>
                    {c.relationship} · {c.phone}
                  </small>
                </span>
                <a className="btn btn--primary btn--sm" href={smsHref(c.phone, smsBody)} onClick={logAlerted}>
                  <MessageSquare size={15} /> Message
                </a>
                <a className="btn btn--ghost btn--sm" href={telHref(c.phone)}>
                  <Phone size={15} /> Call
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">You haven’t added any emergency contacts yet.</p>
        )}
        <p className="small muted">
          Alert mode: <strong>{settings.alertMode === 'all' ? 'all contacts' : 'primary contact only'}</strong> (change in Settings).
        </p>
        <div className="message-preview">
          <small>Message preview</small>
          <p>{smsBody}</p>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirmEnd)}
        title={confirmEnd === 'resolve' ? 'Confirm you are safe' : 'Cancel this SOS?'}
        message={confirmEnd === 'resolve' ? 'Emergency mode will end and this will be recorded in your safety history.' : 'This SOS will be marked as a false alarm.'}
        confirmLabel={confirmEnd === 'resolve' ? 'Yes, I’m safe' : 'Cancel SOS'}
        tone={confirmEnd === 'resolve' ? 'success' : 'danger'}
        busy={busy}
        onConfirm={() => endSos(confirmEnd)}
        onCancel={() => setConfirmEnd(null)}
      />
    </div>
  );
}
