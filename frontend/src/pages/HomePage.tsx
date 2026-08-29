import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { api, errorMessage } from '../api/client';
import type { ExamView } from '../api/types';
import { useAuth } from '../auth/useAuth';
import { ErrorState, Spinner } from '../components/States';
import { useApi } from '../hooks/useApi';

export default function HomePage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [count, setCount] = useState(10);
  const [startError, setStartError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function startExam() {
    setStartError(null);
    setBusy(true);
    try {
      const exam = await api<ExamView>('/exams', { method: 'POST', body: { count } });
      navigate(`/exams/${exam.id}`);
    } catch (err) {
      setStartError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="rounded-2xl bg-gradient-to-br from-brand-700 to-brand-500 p-8 text-white">
        <h1 className="text-2xl font-bold">
          {user ? `Welcome back, ${user.email}!` : 'Practice for the AWS SAA exam'}
        </h1>
        <p className="mt-1 text-brand-100">
          Practice exam questions for the AWS Solutions Architect Associate certification. No account needed — just
          start an exam.
        </p>
      </section>

      {/* Start an exam */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Start a practice exam</h2>
        <p className="mt-1 text-sm text-slate-500">
          {count} random questions, drawn from the latest versions in the question bank.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label htmlFor="count" className="text-sm font-medium text-slate-700">
            Questions
          </label>
          <input
            id="count"
            type="number"
            min={1}
            max={50}
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(50, Number(e.target.value) || 10)))}
            className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
          <button
            type="button"
            onClick={startExam}
            disabled={busy}
            className="rounded-lg bg-brand-700 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? 'Creating…' : 'Start exam'}
          </button>
          {isAdmin && (
            <Link
              to="/admin/questions"
              className="rounded-lg border border-slate-300 px-5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Manage question bank →
            </Link>
          )}
        </div>
        {startError && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{startError}</p>}
      </section>

      {/* Exam history — only meaningful for signed-in users. */}
      {user ? (
        <ExamHistory />
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Sign in as admin to manage the question bank — practice exams work without an account.
        </section>
      )}
    </div>
  );
}

function ExamHistory() {
  const navigate = useNavigate();
  const history = useApi(() => api<ExamView[]>('/exams'), []);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold">Your exams</h2>
      {history.loading && <Spinner label="Loading exam history…" />}
      {history.error && <ErrorState message={history.error} onRetry={() => void history.reload()} />}
      {history.data && history.data.length === 0 && (
        <p className="mt-3 text-sm text-slate-500">No exams yet — start your first one above.</p>
      )}
      {history.data && history.data.length > 0 && (
        <ul className="mt-4 divide-y divide-slate-100">
          {history.data.map((exam) => (
            <li key={exam.id}>
              <button
                type="button"
                onClick={() => navigate(`/exams/${exam.id}`)}
                className="flex w-full items-center justify-between gap-4 py-3 text-left transition-colors hover:bg-slate-50"
              >
                <span className="text-sm text-slate-600">{new Date(exam.createdAt).toLocaleString()}</span>
                {exam.status === 'completed' ? (
                  <span className="text-sm font-semibold text-brand-600">
                    {exam.correctCount}/{exam.totalCount} correct
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                    In progress
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
