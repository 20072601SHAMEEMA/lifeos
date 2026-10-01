import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Download, Droplet, ExternalLink, Eye, EyeOff, HeartPulse, Lock, RefreshCw, Save, ShieldAlert, User } from 'lucide-react';
import { Avatar, Card, CardHeader, ConfirmDialog, ErrorState, Field, LoadingState, Notice, PageHeader, Spinner, Toggle } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { cardService, contactService } from '../services/index.js';
import { isEmergencyNumber } from '../utils/validators.js';

const BLOOD_GROUPS = ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const VISIBILITY_FIELDS = [
  { key: 'emergencyContact', label: 'Primary emergency contact' },
  { key: 'emergencyPhone', label: 'Emergency phone number' },
  { key: 'photo', label: 'Profile photo' },
  { key: 'bloodGroup', label: 'Blood group' },
  { key: 'allergies', label: 'Allergies' },
  { key: 'conditions', label: 'Medical conditions' },
  { key: 'medications', label: 'Medications' },
  { key: 'notes', label: 'Important notes' },
];

export default function EmergencyCard() {
  useDocumentTitle('Emergency Card');
  const { user } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload, setData } = useAsync(async () => {
    const [card, contacts] = await Promise.all([cardService.get(), contactService.list()]);
    return { card, primary: contacts.find((c) => c.isPrimary) || contacts[0] || null };
  });
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);

  useEffect(() => {
    if (data?.card) setForm(data.card);
  }, [data?.card]);

  const dirty = useMemo(() => form && data?.card && JSON.stringify(form) !== JSON.stringify(data.card), [form, data]);
  const publicUrl = data?.card ? `${window.location.origin}/e/${data.card.shareId}` : '';

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((er) => ({ ...er, [key]: undefined }));
  };
  const setVis = (key) => (val) => setForm((f) => ({ ...f, visibility: { ...f.visibility, [key]: val } }));

  async function save(patch = form) {
    if (patch.emergencyPhone && !isEmergencyNumber(patch.emergencyPhone)) {
      setErrors({ emergencyPhone: 'Enter a valid phone number.' });
      return;
    }
    setSaving(true);
    try {
      const card = await cardService.update(patch);
      setData((d) => ({ ...d, card }));
      toast.success('Emergency card saved.');
    } catch (err) {
      setErrors(err.fields || {});
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleSharing(on) {
    setForm((f) => ({ ...f, sharingEnabled: on }));
    try {
      const card = await cardService.update({ sharingEnabled: on });
      setData((d) => ({ ...d, card }));
      setForm((f) => ({ ...f, sharingEnabled: card.sharingEnabled }));
      toast.success(on ? 'QR sharing turned on.' : 'QR sharing turned off. The link no longer works.');
    } catch (err) {
      setForm((f) => ({ ...f, sharingEnabled: !on }));
      toast.error(err.message);
    }
  }

  async function regenerate() {
    try {
      const card = await cardService.regenerate();
      setData((d) => ({ ...d, card }));
      toast.success('New QR link created. Old printed codes no longer work.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setConfirmRegen(false);
    }
  }

  function downloadQr() {
    const svg = document.getElementById('emergency-qr');
    if (!svg) return;
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'lifeos-emergency-qr.svg';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  if (loading || (!form && !error)) return <LoadingState label="Loading your emergency card…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const v = form.visibility;
  const primary = data.primary;

  return (
    <div className="page">
      <PageHeader
        eyebrow="Digital emergency card"
        title="Emergency Card"
        subtitle="Information first responders or bystanders can see by scanning your QR code. Only fields you switch on are shared."
      />

      <div className="card-layout">
        {/* Preview */}
        <div className="ecard-col">
          <div className={`ecard ${form.sharingEnabled ? '' : 'ecard--off'}`}>
            <div className="ecard__head">
              <span className="ecard__badge">
                <ShieldAlert size={14} aria-hidden="true" /> EMERGENCY INFO
              </span>
              <span className="ecard__brand">LifeOS</span>
            </div>
            <div className="ecard__id">
              <Avatar name={user?.name} photo={v.photo ? user?.photo : null} size={64} />
              <div>
                <h2>{user?.name}</h2>
                {v.bloodGroup && form.bloodGroup && (
                  <span className="blood-chip">
                    <Droplet size={13} aria-hidden="true" /> {form.bloodGroup}
                  </span>
                )}
              </div>
            </div>
            <dl className="ecard__fields">
              {v.emergencyContact && primary && (
                <div>
                  <dt>Emergency contact</dt>
                  <dd>
                    {primary.name} ({primary.relationship}) · <span className="mono">{primary.phone}</span>
                  </dd>
                </div>
              )}
              {v.emergencyPhone && form.emergencyPhone && (
                <div>
                  <dt>Emergency number</dt>
                  <dd className="mono">{form.emergencyPhone}</dd>
                </div>
              )}
              {v.allergies && form.allergies && (
                <div>
                  <dt>Allergies</dt>
                  <dd>{form.allergies}</dd>
                </div>
              )}
              {v.conditions && form.conditions && (
                <div>
                  <dt>Conditions</dt>
                  <dd>{form.conditions}</dd>
                </div>
              )}
              {v.medications && form.medications && (
                <div>
                  <dt>Medications</dt>
                  <dd>{form.medications}</dd>
                </div>
              )}
              {v.notes && form.notes && (
                <div>
                  <dt>Notes</dt>
                  <dd>{form.notes}</dd>
                </div>
              )}
            </dl>
            <div className="ecard__qr">
              <div className="qr-box">
                {form.sharingEnabled ? (
                  <QRCodeSVG id="emergency-qr" value={publicUrl} size={132} level="M" marginSize={1} bgColor="#ffffff" fgColor="#0b1220" />
                ) : (
                  <div className="qr-off">
                    <Lock size={26} aria-hidden="true" />
                    <span>Sharing off</span>
                  </div>
                )}
              </div>
              <div>
                <strong>Scan in case of emergency</strong>
                <p>{form.sharingEnabled ? 'Opens a read-only page with the details shown here.' : 'Turn on sharing to activate this QR code.'}</p>
              </div>
            </div>
          </div>

          <Card className="share-card">
            <Toggle
              checked={form.sharingEnabled}
              onChange={toggleSharing}
              label="QR code sharing"
              description="When off, the QR code and link stop working immediately."
            />
            {form.sharingEnabled && (
              <>
                <div className="share-url">
                  <input className="input mono" readOnly value={publicUrl} aria-label="Public emergency card link" onFocus={(e) => e.target.select()} />
                  <button
                    className="icon-btn"
                    aria-label="Copy link"
                    onClick={() => navigator.clipboard.writeText(publicUrl).then(() => toast.success('Link copied.'), () => toast.error('Could not copy.'))}
                  >
                    <Copy size={16} />
                  </button>
                </div>
                <div className="btn-row">
                  <Link className="btn btn--ghost btn--sm" to={`/e/${data.card.shareId}`} target="_blank">
                    <ExternalLink size={15} /> Preview public page
                  </Link>
                  <button className="btn btn--ghost btn--sm" onClick={downloadQr}>
                    <Download size={15} /> Download QR
                  </button>
                  <button className="btn btn--ghost btn--sm" onClick={() => setConfirmRegen(true)}>
                    <RefreshCw size={15} /> New link
                  </button>
                </div>
              </>
            )}
          </Card>
        </div>

        {/* Editor */}
        <div className="ecard-editor">
          <Card>
            <CardHeader icon={HeartPulse} title="Medical & emergency details" tone="danger" />
            <form
              className="form"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                save();
              }}
            >
              <div className="form-grid">
                <Field label="Blood group" hint="Optional">
                  {(p) => (
                    <select {...p} className="input" value={form.bloodGroup} onChange={set('bloodGroup')}>
                      {BLOOD_GROUPS.map((b) => (
                        <option key={b} value={b}>
                          {b || 'Not specified'}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
                <Field label="Emergency phone number" error={errors.emergencyPhone} hint="e.g. 112 or a doctor’s number">
                  {(p) => <input {...p} className="input" type="tel" value={form.emergencyPhone} onChange={set('emergencyPhone')} placeholder="112" />}
                </Field>
              </div>
              <Field label="Allergies" hint="Optional">
                {(p) => <input {...p} className="input" value={form.allergies} onChange={set('allergies')} placeholder="e.g. Penicillin, peanuts" maxLength={300} />}
              </Field>
              <Field label="Medical conditions" hint="Optional">
                {(p) => <input {...p} className="input" value={form.conditions} onChange={set('conditions')} placeholder="e.g. Asthma, diabetes" maxLength={300} />}
              </Field>
              <Field label="Medications" hint="Optional">
                {(p) => <input {...p} className="input" value={form.medications} onChange={set('medications')} placeholder="e.g. Inhaler" maxLength={300} />}
              </Field>
              <Field label="Important information" hint="Optional — anything a helper should know">
                {(p) => <textarea {...p} className="input" rows={3} value={form.notes} onChange={set('notes')} maxLength={500} placeholder="e.g. I wear contact lenses." />}
              </Field>
              <button className="btn btn--primary" disabled={saving || !dirty}>
                {saving ? <Spinner size={16} /> : <Save size={17} />} {dirty ? 'Save changes' : 'Saved'}
              </button>
            </form>
          </Card>

          <Card>
            <CardHeader icon={Eye} title="What the QR code shows" tone="primary" />
            <Notice tone="info" icon={Lock}>
              Your name is always shown. Everything else is <strong>hidden by default</strong> — switch on only what you’re comfortable sharing with
              anyone who scans the code.
            </Notice>
            <div className="toggle-list">
              {VISIBILITY_FIELDS.map((f) => (
                <Toggle key={f.key} checked={Boolean(v[f.key])} onChange={setVis(f.key)} label={f.label} />
              ))}
            </div>
            <div className="legend muted small">
              <span>
                <Eye size={13} /> visible on scan
              </span>
              <span>
                <EyeOff size={13} /> private
              </span>
            </div>
            <button className="btn btn--primary" onClick={() => save()} disabled={saving || !dirty}>
              {saving ? <Spinner size={16} /> : <Save size={17} />} Save visibility
            </button>
          </Card>

          <p className="muted small icon-line">
            <User size={14} aria-hidden="true" /> Name and photo come from your <Link to="/profile">profile</Link>; the emergency contact is your{' '}
            <Link to="/contacts">primary contact</Link>.
          </p>
        </div>
      </div>

      <ConfirmDialog
        open={confirmRegen}
        title="Create a new QR link?"
        message="Any QR code you already printed or shared will stop working. Use this if your card link was shared with the wrong people."
        confirmLabel="Create new link"
        tone="primary"
        onConfirm={regenerate}
        onCancel={() => setConfirmRegen(false)}
      />
    </div>
  );
}
