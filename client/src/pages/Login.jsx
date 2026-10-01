import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn, Sparkles } from 'lucide-react';
import AuthLayout from '../layouts/AuthLayout.jsx';
import { Field, Notice, Spinner } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { validateLogin } from '../utils/validators.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

// Matches the account created by server/src/seed.js
const DEMO = { email: 'demo@lifeos.app', password: 'demo1234' };

export default function Login() {
  useDocumentTitle('Log in');
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((er) => ({ ...er, [key]: undefined }));
  };

  async function submit(credentials) {
    const errs = validateLogin(credentials);
    setErrors(errs);
    setServerError('');
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await login(credentials.email.trim(), credentials.password);
      toast.success('Welcome back! You are protected.');
      navigate(location.state?.from || '/dashboard', { replace: true });
    } catch (err) {
      setServerError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to your personal safety center.">
      <form
        className="form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit(form);
        }}
      >
        {serverError && <Notice tone="danger">{serverError}</Notice>}

        <Field label="Email" error={errors.email} required>
          {(p) => <input {...p} className="input" type="email" autoComplete="email" value={form.email} onChange={set('email')} placeholder="you@example.com" />}
        </Field>

        <Field label="Password" error={errors.password} required>
          {(p) => (
            <div className="input-group">
              <input {...p} className="input" type={showPw ? 'text' : 'password'} autoComplete="current-password" value={form.password} onChange={set('password')} placeholder="Your password" />
              <button type="button" className="input-group__btn" onClick={() => setShowPw((s) => !s)} aria-label={showPw ? 'Hide password' : 'Show password'}>
                {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          )}
        </Field>

        <button className="btn btn--primary btn--lg btn--block" disabled={busy}>
          {busy ? <Spinner /> : <LogIn size={18} />} Log in
        </button>

        <div className="divider">
          <span>or</span>
        </div>

        <button
          type="button"
          className="btn btn--ghost btn--block"
          disabled={busy}
          onClick={() => {
            setForm(DEMO);
            submit(DEMO);
          }}
        >
          <Sparkles size={17} /> Explore with the demo account
        </button>

        <p className="form__alt">
          New to LifeOS? <Link to="/register">Create an account</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
