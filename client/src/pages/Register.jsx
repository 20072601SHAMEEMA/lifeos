import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import AuthLayout from '../layouts/AuthLayout.jsx';
import { Field, Notice, Spinner } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { validateRegister } from '../utils/validators.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

function strength(pw) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(4, s);
}
const STRENGTH_LABEL = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];

export default function Register() {
  useDocumentTitle('Create account');
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((er) => ({ ...er, [key]: undefined }));
  };

  async function onSubmit(e) {
    e.preventDefault();
    const errs = validateRegister(form);
    setErrors(errs);
    setServerError('');
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await register({ name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), password: form.password });
      toast.success('Account created. Let’s add your first emergency contact.');
      navigate('/contacts', { replace: true });
    } catch (err) {
      setServerError(err.message);
      if (err.fields) setErrors(err.fields);
    } finally {
      setBusy(false);
    }
  }

  const s = strength(form.password);

  return (
    <AuthLayout title="Create your account" subtitle="Set up your safety center in under a minute.">
      <form className="form" noValidate onSubmit={onSubmit}>
        {serverError && <Notice tone="danger">{serverError}</Notice>}

        <Field label="Full name" error={errors.name} required>
          {(p) => <input {...p} className="input" autoComplete="name" value={form.name} onChange={set('name')} placeholder="Tejaswi Rao" />}
        </Field>

        <div className="form-grid">
          <Field label="Email" error={errors.email} required>
            {(p) => <input {...p} className="input" type="email" autoComplete="email" value={form.email} onChange={set('email')} placeholder="you@example.com" />}
          </Field>
          <Field label="Phone" error={errors.phone} hint="Optional">
            {(p) => <input {...p} className="input" type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" />}
          </Field>
        </div>

        <Field label="Password" error={errors.password} required>
          {(p) => (
            <>
              <div className="input-group">
                <input {...p} className="input" type={showPw ? 'text' : 'password'} autoComplete="new-password" value={form.password} onChange={set('password')} placeholder="At least 8 characters" />
                <button type="button" className="input-group__btn" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? 'Hide password' : 'Show password'}>
                  {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {form.password && (
                <div className={`strength strength--${s}`} aria-live="polite">
                  <span className="strength__bar">
                    <span style={{ width: `${(s / 4) * 100}%` }} />
                  </span>
                  <small>{STRENGTH_LABEL[s]}</small>
                </div>
              )}
            </>
          )}
        </Field>

        <Field label="Confirm password" error={errors.confirm} required>
          {(p) => <input {...p} className="input" type={showPw ? 'text' : 'password'} autoComplete="new-password" value={form.confirm} onChange={set('confirm')} placeholder="Repeat password" />}
        </Field>

        <button className="btn btn--primary btn--lg btn--block" disabled={busy}>
          {busy ? <Spinner /> : <ShieldCheck size={18} />} Create account
        </button>

        <p className="form__fine">Your data is stored securely and only used to power your safety features. Passwords are hashed with bcrypt.</p>
        <p className="form__alt">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
