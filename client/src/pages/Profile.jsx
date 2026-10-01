import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Camera, HeartPulse, KeyRound, Save, Settings as SettingsIcon, Trash2, User, Users } from 'lucide-react';
import { Avatar, Card, CardHeader, Field, PageHeader, Skeleton, Spinner } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { cardService, contactService, userService } from '../services/index.js';
import { formatDate } from '../utils/format.js';
import { validateProfile } from '../utils/validators.js';

/** Downscale an image file to a square JPEG data URL so profile photos stay small. */
function resizeImage(file, size = 256) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Please choose an image file.'));
    if (file.size > 8 * 1024 * 1024) return reject(new Error('Image must be smaller than 8 MB.'));
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      const s = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('That image could not be read.'));
    };
    img.src = url;
  });
}

export default function Profile() {
  useDocumentTitle('Profile');
  const { user, setUser } = useAuth();
  const { settings } = useSettings();
  const toast = useToast();
  const fileRef = useRef(null);
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '' });
  const [photo, setPhoto] = useState(user?.photo || null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [pwErrors, setPwErrors] = useState({});
  const [pwSaving, setPwSaving] = useState(false);

  const summary = useAsync(async () => {
    const [card, contacts] = await Promise.all([cardService.get(), contactService.list()]);
    return { card, contacts };
  });

  useEffect(() => {
    if (user) {
      setForm({ name: user.name, email: user.email, phone: user.phone || '' });
      setPhoto(user.photo);
    }
  }, [user]);

  const dirty = user && (form.name !== user.name || form.email !== user.email || form.phone !== (user.phone || '') || photo !== user.photo);
  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((er) => ({ ...er, [key]: undefined }));
  };

  async function onPhoto(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setPhoto(await resizeImage(file));
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function save(e) {
    e.preventDefault();
    const errs = validateProfile(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      const updated = await userService.updateProfile({ ...form, name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), photo });
      setUser(updated);
      toast.success('Profile updated.');
    } catch (err) {
      setErrors(err.fields || {});
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    const errs = {};
    if (!pw.currentPassword) errs.currentPassword = 'Enter your current password.';
    if (pw.newPassword.length < 8) errs.newPassword = 'Use at least 8 characters.';
    setPwErrors(errs);
    if (Object.keys(errs).length) return;
    setPwSaving(true);
    try {
      await userService.changePassword(pw.currentPassword, pw.newPassword);
      setPw({ currentPassword: '', newPassword: '' });
      toast.success('Password changed.');
    } catch (err) {
      setPwErrors(err.fields || {});
      toast.error(err.message);
    } finally {
      setPwSaving(false);
    }
  }

  const s = summary.data;
  const primary = s?.contacts.find((c) => c.isPrimary);

  return (
    <div className="page">
      <PageHeader eyebrow="Your account" title="Profile" subtitle="Personal details used across LifeOS and on your emergency card." />

      <div className="profile-layout">
        <Card className="profile-card">
          <div className="profile-hero">
            <div className="profile-photo">
              <Avatar name={form.name} photo={photo} size={112} />
              <button className="profile-photo__btn" onClick={() => fileRef.current?.click()} aria-label="Change profile photo">
                <Camera size={17} />
              </button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPhoto} />
            </div>
            <div>
              <h2>{user?.name}</h2>
              <p className="muted">{user?.email}</p>
              <p className="muted small">Member since {formatDate(user?.createdAt)}</p>
              {photo && (
                <button className="link-btn link-btn--danger" onClick={() => setPhoto(null)}>
                  <Trash2 size={13} /> Remove photo
                </button>
              )}
            </div>
          </div>

          <form className="form" noValidate onSubmit={save}>
            <CardHeader icon={User} title="Personal details" />
            <Field label="Full name" error={errors.name} required>
              {(p) => <input {...p} className="input" value={form.name} onChange={set('name')} autoComplete="name" />}
            </Field>
            <div className="form-grid">
              <Field label="Email" error={errors.email} required>
                {(p) => <input {...p} className="input" type="email" value={form.email} onChange={set('email')} autoComplete="email" />}
              </Field>
              <Field label="Phone" error={errors.phone}>
                {(p) => <input {...p} className="input" type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" placeholder="+91 98765 43210" />}
              </Field>
            </div>
            <button className="btn btn--primary" disabled={saving || !dirty}>
              {saving ? <Spinner size={16} /> : <Save size={17} />} {dirty ? 'Save profile' : 'All changes saved'}
            </button>
          </form>
        </Card>

        <div className="profile-side">
          <Card>
            <CardHeader icon={HeartPulse} title="Emergency information" tone="danger" action={<Link to="/card" className="link-btn">Edit <ArrowRight size={14} /></Link>} />
            {summary.loading ? (
              <Skeleton height={60} />
            ) : s ? (
              <dl className="kv">
                <div>
                  <dt>Blood group</dt>
                  <dd>{s.card.bloodGroup || 'Not set'}</dd>
                </div>
                <div>
                  <dt>Allergies</dt>
                  <dd>{s.card.allergies || 'None listed'}</dd>
                </div>
                <div>
                  <dt>QR sharing</dt>
                  <dd>{s.card.sharingEnabled ? 'On' : 'Off'}</dd>
                </div>
              </dl>
            ) : (
              <p className="muted small">Could not load.</p>
            )}
          </Card>

          <Card>
            <CardHeader icon={Users} title="Emergency contacts" tone="violet" action={<Link to="/contacts" className="link-btn">Manage <ArrowRight size={14} /></Link>} />
            {summary.loading ? (
              <Skeleton height={40} />
            ) : (
              <p className="muted">
                <strong className="text">{s?.contacts.length ?? 0}</strong> saved
                {primary && (
                  <>
                    {' '}
                    · primary: <strong className="text">{primary.name}</strong>
                  </>
                )}
              </p>
            )}
          </Card>

          <Card>
            <CardHeader icon={SettingsIcon} title="Emergency preferences" action={<Link to="/settings" className="link-btn">Change <ArrowRight size={14} /></Link>} />
            <dl className="kv">
              <div>
                <dt>SOS countdown</dt>
                <dd>{settings.countdownSeconds} seconds</dd>
              </div>
              <div>
                <dt>Alert</dt>
                <dd>{settings.alertMode === 'all' ? 'All contacts' : 'Primary contact'}</dd>
              </div>
              <div>
                <dt>Emergency number</dt>
                <dd className="mono">{settings.emergencyNumber}</dd>
              </div>
            </dl>
          </Card>

          <Card>
            <CardHeader icon={KeyRound} title="Change password" tone="warning" />
            <form className="form" noValidate onSubmit={changePassword}>
              <Field label="Current password" error={pwErrors.currentPassword}>
                {(p) => <input {...p} className="input" type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw((v) => ({ ...v, currentPassword: e.target.value }))} />}
              </Field>
              <Field label="New password" error={pwErrors.newPassword}>
                {(p) => <input {...p} className="input" type="password" autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw((v) => ({ ...v, newPassword: e.target.value }))} />}
              </Field>
              <button className="btn btn--ghost" disabled={pwSaving}>
                {pwSaving && <Spinner size={16} />} Update password
              </button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
