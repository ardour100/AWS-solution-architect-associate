import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router';
import { errorMessage } from '../api/client';
import { useAuth } from '../auth/useAuth';

export default function LoginPage() {
  const { user, login, register } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Already authenticated → straight to the app.
  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'signin') {
        await login(email, password);
      } else {
        await register(email, password);
      }
      // Success: AuthContext sets the user and the <Navigate> above kicks in.
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  function switchMode(next: 'signin' | 'signup') {
    setMode(next);
    setError(null);
    setPassword('');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-600 via-indigo-500 to-sky-400 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center text-white">
          <h1 className="text-3xl font-bold">AWS SAA Practice</h1>
          <p className="mt-2 text-indigo-100">Solutions Architect Associate — practice platform</p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-xl">
          {/* Mode tabs */}
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
            {(['signin', 'signup'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={`rounded-md py-2 text-sm font-medium transition-colors ${
                  mode === m ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {m === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

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
                placeholder="you@example.com"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
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
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
              {mode === 'signup' && (
                <p className="mt-1 text-xs text-slate-400">8–72 characters, at least one letter and one number.</p>
              )}
            </div>

            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
