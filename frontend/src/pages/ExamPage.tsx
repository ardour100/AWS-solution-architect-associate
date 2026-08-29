import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { api, errorMessage } from '../api/client';
import type { ExamRecordView, ExamView } from '../api/types';
import { ErrorState, Spinner } from '../components/States';
import { useApi } from '../hooks/useApi';

export default function ExamPage() {
  const { examId } = useParams();
  const { data: exam, loading, error, reload } = useApi(() => api<ExamView>(`/exams/${examId}`), [examId]);

  if (loading) return <Spinner label="Loading exam…" />;
  if (error || !exam) return <ErrorState message={error ?? 'Exam not found'} />;

  return exam.status === 'completed' ? <ExamResult exam={exam} /> : <ExamRunner exam={exam} onSubmitted={() => void reload()} />;
}

// ── In-progress view ────────────────────────────────────────────────────

function ExamRunner({ exam, onSubmitted }: { exam: ExamView; onSubmitted: () => void }) {
  const [current, setCurrent] = useState(0);
  const [selections, setSelections] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(exam.records.map((r) => [r.id, r.selectedOptionIds])),
  );
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const record = exam.records[current];
  const answeredCount = Object.values(selections).filter((ids) => ids.length > 0).length;

  /** Saves the selection immediately (single: replace; multiple: toggle). */
  async function select(recordId: string, qType: string, optionId: string) {
    const before = selections[recordId] ?? [];
    const next =
      qType === 'single'
        ? before.includes(optionId)
          ? []
          : [optionId]
        : before.includes(optionId)
          ? before.filter((id) => id !== optionId)
          : [...before, optionId];

    const updated = { ...selections, [recordId]: next };
    setSelections(updated);
    setError(null);
    setSaving(true);
    try {
      await api(`/exams/${exam.id}/records/${recordId}`, { method: 'PUT', body: { selectedOptionIds: next } });
    } catch (err) {
      setSelections(selections); // revert on failure
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      await api(`/exams/${exam.id}/submit`, { method: 'POST' });
      onSubmitted();
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
      setConfirmOpen(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header + progress */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Practice exam</h1>
          <p className="mt-1 text-sm text-slate-500">
            Question {current + 1} of {exam.records.length} · {answeredCount} answered
          </p>
        </div>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
        >
          Submit exam
        </button>
      </div>

      {/* Question navigator */}
      <div className="flex flex-wrap gap-2">
        {exam.records.map((r, index) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setCurrent(index)}
            className={`h-9 w-9 rounded-lg text-sm font-medium transition-colors ${
              index === current
                ? 'bg-brand-700 text-white'
                : (selections[r.id] ?? []).length > 0
                  ? 'bg-brand-100 text-brand-700 hover:bg-brand-200'
                  : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            {index + 1}
          </button>
        ))}
      </div>

      {/* Question card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="mb-1 flex items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold uppercase text-slate-500">
            {record.qType === 'single' ? 'Single choice' : 'Multiple choice'}
          </span>
        </div>
        <h2 className="text-lg font-semibold leading-relaxed">{record.title}</h2>

        <div className="mt-5 space-y-3">
          {record.options.map((option) => {
            const selected = (selections[record.id] ?? []).includes(option.id);
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => void select(record.id, record.qType, option.id)}
                className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                  selected
                    ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-100'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs font-bold ${
                    selected ? 'border-brand-600 bg-brand-700 text-white' : 'border-slate-300 text-slate-400'
                  }`}
                >
                  {option.label}
                </span>
                <span className="text-sm leading-relaxed text-slate-800">{option.content}</span>
              </button>
            );
          })}
        </div>

        {saving && <p className="mt-4 text-xs text-slate-400">Saving…</p>}
        {error && <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </div>

      {/* Prev / Next */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          disabled={current === 0}
          onClick={() => setCurrent((i) => i - 1)}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ← Previous
        </button>
        {current < exam.records.length - 1 ? (
          <button
            type="button"
            onClick={() => setCurrent((i) => i + 1)}
            className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
          >
            Next →
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            Finish and submit
          </button>
        )}
      </div>

      {/* Submit confirmation modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6">
            <h3 className="text-lg font-semibold">Submit exam?</h3>
            <p className="mt-2 text-sm text-slate-600">
              {answeredCount === exam.records.length
                ? 'All questions answered.'
                : `${exam.records.length - answeredCount} unanswered question(s) will be graded as incorrect.`}{' '}
              You cannot change answers after submitting.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Keep working
              </button>
              <button
                type="button"
                onClick={() => void submit()}
                disabled={submitting}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {submitting ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Result view (also shown when reloading a completed exam) ─────────────

function ExamResult({ exam }: { exam: ExamView }) {
  const percent = exam.totalCount > 0 ? Math.round((exam.correctCount / exam.totalCount) * 100) : 0;
  const passed = percent >= 72; // AWS SAA pass mark

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <h1 className="text-xl font-bold">Exam results</h1>
        <p className="mt-4 text-5xl font-bold text-brand-600">
          {exam.correctCount}
          <span className="text-2xl text-slate-400"> / {exam.totalCount}</span>
        </p>
        <p className="mt-2 text-sm text-slate-500">
          {percent}% correct · {passed ? 'Passing score 🎉' : 'Keep practicing!'}
        </p>
        <div className="mx-auto mt-5 h-2.5 w-full max-w-md overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-brand-500" style={{ width: `${percent}%` }} />
        </div>
        <Link
          to="/"
          className="mt-6 inline-block rounded-lg bg-brand-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-800"
        >
          Back to home
        </Link>
      </div>

      <div className="space-y-4">
        {exam.records.map((record, index) => (
          <ReviewCard key={record.id} record={record} index={index} />
        ))}
      </div>
    </div>
  );
}

function ReviewCard({ record, index }: { record: ExamRecordView; index: number }) {
  const selected = new Set(record.selectedOptionIds);
  const correct = new Set(record.correctOptionIds ?? []);

  return (
    <div className={`rounded-2xl border bg-white p-6 ${record.isCorrect ? 'border-emerald-200' : 'border-red-200'}`}>
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base font-semibold leading-relaxed">
          <span className="mr-2 text-slate-400">#{index + 1}</span>
          {record.title}
        </h2>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            record.isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
          }`}
        >
          {record.isCorrect ? 'Correct' : 'Incorrect'}
        </span>
      </div>

      <div className="mt-4 space-y-2">
        {record.options.map((option) => {
          const isCorrectOption = correct.has(option.id);
          const wasSelected = selected.has(option.id);
          const style = isCorrectOption
            ? 'border-emerald-300 bg-emerald-50'
            : wasSelected
              ? 'border-red-300 bg-red-50'
              : 'border-slate-200 bg-white';
          const mark = isCorrectOption ? '✓' : wasSelected ? '✗' : '';
          return (
            <div key={option.id} className={`flex items-start gap-3 rounded-xl border px-4 py-2.5 text-sm ${style}`}>
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-current/20 text-xs font-bold">
                {option.label}
              </span>
              <span className="flex-1 leading-relaxed text-slate-800">{option.content}</span>
              {mark && <span className="font-bold text-slate-500">{mark}</span>}
            </div>
          );
        })}
      </div>

      {record.explanation && (
        <div className="mt-4 rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Explanation</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-700">{record.explanation}</p>
        </div>
      )}
    </div>
  );
}
