import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { errorMessage } from '../api/client';
import { useAuth } from '../auth/useAuth';

/**
 * Test admin credentials (created idempotently by `npm run db:seed`
 * in the backend). Practice exams don't require any account — this
 * sign-in exists only for managing the question bank.
 */
const TEST_EMAIL = 'admin@example.com';
const TEST_PASSWORD = 'admin1234';

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(TEST_EMAIL);
  const [password, setPassword] = useState(TEST_PASSWORD);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Already authenticated → straight to the app.
  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from ?? '/', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-700 via-brand-600 to-brand-400 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center text-white">
          <h1 className="text-3xl font-bold">AWS SAA Practice</h1>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>

            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-brand-700 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? 'Please wait…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-center text-xs text-slate-500">
            Test account: <code className="font-semibold">{TEST_EMAIL}</code> /{' '}
            <code className="font-semibold">{TEST_PASSWORD}</code>
          </p>
        </div>

        <p className="mt-4 text-center text-sm text-brand-100">
          <button type="button" onClick={() => navigate('/')} className="underline underline-offset-2">
            ← Back to practice
          </button>
        </p>
      </div>
    </div>
  );
}
