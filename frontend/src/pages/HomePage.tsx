import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { api, errorMessage } from '../api/client';
import type { ExamView } from '../api/types';
import { useAuth } from '../auth/useAuth';

const QUESTION_COUNT = 10;

export default function HomePage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [startError, setStartError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function startExam() {
    setStartError(null);
    setBusy(true);
    try {
      const exam = await api<ExamView>('/exams', { method: 'POST', body: { count: QUESTION_COUNT } });
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
          Sharpen your AWS Solutions Architect skills at your own pace.
        </h1>
        <p className="mt-1 text-brand-100">Zero sign-up, zero hassle — just jump right in.</p>
      </section>

      {/* Start an exam */}
      <section className="relative isolate flex min-h-[40vh] flex-col items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-6">
        <img
          src="/route-start-svgrepo-com.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 -z-10 w-[55%] max-w-[320px] -translate-x-1/2 -translate-y-1/2 opacity-10"
        />
        <h2 className="text-center text-lg font-semibold">Start a Practice Exam</h2>
        <p className="mt-1 text-center text-sm text-slate-500">
          10 fresh questions from the latest question bank.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={startExam}
            disabled={busy}
            className="min-w-[240px] rounded-lg bg-brand-700 px-6 py-3 text-base font-semibold text-white shadow-md transition-all hover:-translate-y-px hover:bg-brand-800 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-md"
          >
            {busy ? 'Creating…' : `Start Practice Exam (${QUESTION_COUNT} Questions)`}
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
    </div>
  );
}
