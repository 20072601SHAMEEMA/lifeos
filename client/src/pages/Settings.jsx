import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Database, Download, Eye, LocateFixed, LogOut, MapPin, Moon, Phone, ShieldCheck, Sun, Timer, Trash2, Users } from 'lucide-react';
import { Card, CardHeader, ConfirmDialog, Field, Notice, PageHeader, Segmented, Spinner, StatusPill, Toggle } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { useUserLocation } from '../context/LocationContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { historyService, userService } from '../services/index.js';
import { isEmergencyNumber } from '../utils/validators.js';

const PERMISSION_LABEL = {
  granted: { tone: 'success', text: 'Allowed' },
  denied: { tone: 'danger', text: 'Blocked' },
  prompt: { tone: 'warning', text: 'Ask each time' },
  unknown: { tone: 'neutral', text: 'Unknown' },
};

export default function Settings() {
  useDocumentTitle('Settings');
  const { settings, update } = useSettings();
  const { logout } = useAuth();
  const loc = useUserLocation();
  const toast = useToast();
  const navigate = useNavigate();
  const [notifPermission, setNotifPermission] = useState(() => ('Notification' in window ? Notification.permission : 'unsupported'));
  const [number, setNumber] = useState(settings.emergencyNumber);
  const [numberError, setNumberError] = useState('');
  const [confirm, setConfirm] = useState(null); // 'history' | 'account'
  const [busy, setBusy] = useState(false);

  useEffect(() => setNumber(settings.emergencyNumber), [settings.emergencyNumber]);

  const save = (patch, message = 'Settings saved.') =>
    update(patch)
      .then(() => toast.success(message))
      .catch((err) => toast.error(err.message));

  async function toggleNotifications(on) {
    if (on && 'Notification' in window && Notification.permission === 'default') {
      const result = await Notification.requestPermission();
      setNotifPermission(result);
      if (result !== 'granted') toast.info('Browser notifications are blocked. LifeOS will show in-app alerts instead.');
    }
    save({ notifications: on });
  }

  function saveNumber(e) {
    e.preventDefault();
    if (!isEmergencyNumber(number)) {
      setNumberError('Enter a valid number, e.g. 112, 911 or 999.');
      return;
    }
    setNumberError('');
    save({ emergencyNumber: number.trim() }, 'Emergency number updated.');
  }

  async function exportData() {
    try {
      const data = await userService.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `lifeos-data-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success('Your data export has been downloaded.');
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function runConfirm() {
    setBusy(true);
    try {
      if (confirm === 'history') {
        await historyService.clear();
        toast.success('Safety history cleared.');
      } else {
        await userService.deleteAccount();
        logout();
        toast.success('Your account and all data were deleted.');
        navigate('/');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  const perm = PERMISSION_LABEL[loc.permission] || PERMISSION_LABEL.unknown;

  return (
    <div className="page">
      <PageHeader eyebrow="Preferences" title="Settings" subtitle="Control how LifeOS behaves in an emergency and what it can access." />

      <div className="settings-grid">
        <Card>
          <CardHeader icon={Timer} title="Emergency" tone="danger" />
          <Field label="SOS countdown" group hint="Time you have to cancel before emergency mode activates.">
            {() => (
              <Segmented
                label="SOS countdown"
                value={settings.countdownSeconds}
                onChange={(v) => save({ countdownSeconds: v })}
                options={[
                  { value: 3, label: '3 s' },
                  { value: 5, label: '5 s' },
                  { value: 10, label: '10 s' },
                ]}
              />
            )}
          </Field>
          <form className="inline-form" onSubmit={saveNumber} noValidate>
            <Field label="Emergency services number" error={numberError} hint="Used by “Call Emergency Services”. India: 112 · US: 911 · UK: 999">
              {(p) => <input {...p} className="input" type="tel" value={number} onChange={(e) => setNumber(e.target.value)} />}
            </Field>
            <button className="btn btn--ghost" disabled={number === settings.emergencyNumber}>
              <Phone size={15} /> Save
            </button>
          </form>
          <Toggle
            checked={settings.shareLocationOnSos}
            onChange={(v) => save({ shareLocationOnSos: v })}
            label="Include location in SOS"
            description="Attach your current coordinates to SOS events and contact messages."
          />
        </Card>

        <Card>
          <CardHeader icon={Users} title="Emergency contact preferences" tone="violet" />
          <Field label="When alerting contacts, include" group hint="Messages open in your phone’s messaging app — you always press send.">
            {() => (
              <Segmented
                label="Alert mode"
                value={settings.alertMode}
                onChange={(v) => save({ alertMode: v })}
                options={[
                  { value: 'primary', label: 'Primary contact' },
                  { value: 'all', label: 'All contacts' },
                ]}
              />
            )}
          </Field>
        </Card>

        <Card>
          <CardHeader icon={Bell} title="Notifications" tone="warning" />
          <Toggle
            checked={settings.notifications}
            onChange={toggleNotifications}
            label="Browser notifications"
            description={
              notifPermission === 'unsupported'
                ? 'Your browser does not support notifications.'
                : notifPermission === 'denied'
                  ? 'Blocked in your browser settings — in-app alerts will be used.'
                  : 'Show a system notification for SOS and overdue journeys.'
            }
            disabled={notifPermission === 'unsupported'}
          />
          <Toggle
            checked={settings.checkinReminders}
            onChange={(v) => save({ checkinReminders: v })}
            label="Check-in reminders"
            description="Remind me when I pass my expected arrival time."
          />
        </Card>

        <Card>
          <CardHeader icon={MapPin} title="Location" />
          <div className="perm-row">
            <span>Browser permission</span>
            <StatusPill tone={perm.tone}>{perm.text}</StatusPill>
          </div>
          <Toggle
            checked={settings.autoLocate}
            onChange={(v) => save({ autoLocate: v })}
            label="Locate automatically on dashboard"
            description="Reads your position once when you open LifeOS. Off means location is read only when you tap a button."
          />
          <Notice tone="info" icon={Eye}>
            LifeOS never tracks you in the background. Live tracking only runs on the Journey page while you switch it on. Coordinates are saved
            only with events you create (check-ins, SOS, journeys).
          </Notice>
          {loc.permission === 'denied' && (
            <p className="small muted">To re-enable, click the lock icon in your browser’s address bar and allow Location for this site.</p>
          )}
          <button className="btn btn--ghost btn--sm" onClick={loc.locate} disabled={loc.status === 'loading'}>
            {loc.status === 'loading' ? <Spinner size={15} /> : <LocateFixed size={15} />} Test location access
          </button>
        </Card>

        <Card>
          <CardHeader icon={settings.theme === 'dark' ? Moon : Sun} title="Appearance" tone="primary" />
          <Segmented
            label="Theme"
            value={settings.theme}
            onChange={(v) => save({ theme: v }, `${v === 'dark' ? 'Dark' : 'Light'} theme on.`)}
            options={[
              { value: 'dark', label: 'Dark', icon: Moon },
              { value: 'light', label: 'Light', icon: Sun },
            ]}
          />
        </Card>

        <Card className="span-2">
          <CardHeader icon={ShieldCheck} title="Privacy & data" tone="success" />
          <ul className="privacy-points">
            <li>
              <Database size={16} aria-hidden="true" /> Your data is stored in the LifeOS database on the server you run, linked only to your account.
            </li>
            <li>
              <ShieldCheck size={16} aria-hidden="true" /> Passwords are hashed with bcrypt; sessions use signed JWT tokens that expire after 7 days.
            </li>
            <li>
              <Eye size={16} aria-hidden="true" /> Your emergency card shares only the fields you switch on, and sharing can be turned off at any time.
            </li>
            <li>
              <Phone size={16} aria-hidden="true" /> SOS is a simulation: LifeOS does not contact police, ambulance or your contacts on its own. Calls and messages
              use your device.
            </li>
          </ul>
          <div className="btn-row">
            <button className="btn btn--ghost" onClick={exportData}>
              <Download size={16} /> Export my data
            </button>
            <button className="btn btn--ghost" onClick={() => setConfirm('history')}>
              <Trash2 size={16} /> Clear safety history
            </button>
            <button className="btn btn--danger-ghost" onClick={() => setConfirm('account')}>
              <Trash2 size={16} /> Delete account
            </button>
            <button
              className="btn btn--ghost"
              onClick={() => {
                logout();
                navigate('/login');
              }}
            >
              <LogOut size={16} /> Log out
            </button>
          </div>
        </Card>
      </div>

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm === 'account' ? 'Delete your account?' : 'Clear safety history?'}
        message={
          confirm === 'account'
            ? 'This permanently deletes your profile, contacts, journeys, history and emergency card. This cannot be undone.'
            : 'All check-ins and events in your timeline will be removed. Journeys and contacts are kept.'
        }
        confirmLabel={confirm === 'account' ? 'Delete everything' : 'Clear history'}
        busy={busy}
        onConfirm={runConfirm}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
