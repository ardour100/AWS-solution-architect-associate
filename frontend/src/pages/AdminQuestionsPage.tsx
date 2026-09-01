import { useState, type FormEvent } from 'react';
import { api, errorMessage } from '../api/client';
import type { QuestionListResult, QuestionView } from '../api/types';
import { ErrorState, Spinner } from '../components/States';
import { useApi } from '../hooks/useApi';

const PAGE_SIZE = 10;
const LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export default function AdminQuestionsPage() {
  const [page, setPage] = useState(0);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [editing, setEditing] = useState<QuestionView | 'new' | null>(null);

  const { data, loading, error, reload } = useApi(
    () =>
      api<QuestionListResult>(
        `/questions?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}&includeDeleted=${String(includeDeleted)}`,
      ),
    [page, includeDeleted],
  );

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  async function handleDelete(question: QuestionView) {
    if (!window.confirm(`Delete "${question.title}"? It will disappear from practice exams.`)) return;
    try {
      await api(`/questions/${question.id}`, { method: 'DELETE' });
      void reload();
    } catch (err) {
      window.alert(errorMessage(err));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Question bank</h1>
          <p className="mt-1 text-sm text-slate-500">
            {data ? `${data.total} question(s)` : '…'} · edits create new immutable versions
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="rounded-lg bg-brand-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-800"
        >
          + New question
        </button>
      </div>

      {/* Filter */}
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={includeDeleted}
          onChange={(e) => {
            setIncludeDeleted(e.target.checked);
            setPage(0);
          }}
          className="h-4 w-4 rounded border-slate-300 accent-brand-600"
        />
        Show deleted questions
      </label>

      {loading && <Spinner label="Loading questions…" />}
      {error && <ErrorState message={error} onRetry={() => void reload()} />}

      {data && data.items.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          No questions yet — click “New question” to add the first one.
        </div>
      )}

      {/* Table */}
      {data && data.items.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Title</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Version</th>
                <th className="px-4 py-3 font-semibold">Created</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.items.map((question) => (
                <tr key={question.id} className="transition-colors hover:bg-slate-50">
                  <td className="max-w-xs truncate px-4 py-3 font-medium text-slate-800">{question.title}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                      {question.qType === 'single' ? 'Single' : 'Multiple'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">v{question.version}</td>
                  <td className="px-4 py-3 text-slate-500">{new Date(question.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {question.isDeleted ? (
                      <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                        Deleted
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {!question.isDeleted && (
                        <>
                          <button
                            type="button"
                            onClick={() => setEditing(question)}
                            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(question)}
                            className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {data && data.total > 0 && (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-slate-300 px-4 py-2 font-medium hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-slate-300 px-4 py-2 font-medium hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {editing && (
        <QuestionFormModal
          question={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void reload();
          }}
        />
      )}
    </div>
  );
}

// ── Create / edit modal ──────────────────────────────────────────────────

interface FormOption {
  label: string;
  content: string;
  isCorrect: boolean;
}

function QuestionFormModal({
  question,
  onClose,
  onSaved,
}: {
  question: QuestionView | 'new';
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = question === 'new';
  const [title, setTitle] = useState(isNew ? '' : question.title);
  const [explanation, setExplanation] = useState(isNew ? '' : question.explanation);
  const [qType, setQType] = useState<'single' | 'multiple'>(isNew ? 'single' : question.qType);
  const [options, setOptions] = useState<FormOption[]>(
    isNew
      ? [
          { label: 'A', content: '', isCorrect: false },
          { label: 'B', content: '', isCorrect: false },
        ]
      : question.options.map((o) => ({ label: o.label, content: o.content, isCorrect: o.isCorrect })),
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function patchOption(index: number, patch: Partial<FormOption>) {
    setOptions((prev) => prev.map((o, i) => (i === index ? { ...o, ...patch } : o)));
  }

  /** Single-choice: marking one correct unmarks the others. */
  function toggleCorrect(index: number) {
    setOptions((prev) =>
      prev.map((o, i) => {
        if (qType === 'single') return { ...o, isCorrect: i === index };
        return i === index ? { ...o, isCorrect: !o.isCorrect } : o;
      }),
    );
  }

  function addOption() {
    setOptions((prev) => (prev.length >= LABELS.length ? prev : [...prev, { label: LABELS[prev.length], content: '', isCorrect: false }]));
  }

  function removeOption(index: number) {
    setOptions((prev) => (prev.length <= 2 ? prev : prev.filter((_, i) => i !== index)));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (options.some((o) => o.content.trim() === '')) {
      setError('Every option needs content.');
      return;
    }
    if (!options.some((o) => o.isCorrect)) {
      setError('Mark at least one option as correct.');
      return;
    }

    const body = {
      title: title.trim(),
      explanation: explanation.trim(),
      qType,
      options: options.map((o) => ({ label: o.label, content: o.content.trim(), isCorrect: o.isCorrect })),
    };

    setBusy(true);
    try {
      if (isNew) {
        await api('/questions', { method: 'POST', body });
      } else {
        await api(`/questions/${question.id}`, { method: 'PUT', body });
      }
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 px-4 py-10">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {isNew ? 'New question' : `Edit question (creates v${question.version + 1})`}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="q-title" className="mb-1 block text-sm font-medium text-slate-700">
              Question
            </label>
            <textarea
              id="q-title"
              required
              rows={2}
              maxLength={800}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Which AWS service is a fully managed object store?"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label htmlFor="q-explanation" className="mb-1 block text-sm font-medium text-slate-700">
                Explanation
              </label>
              <textarea
                id="q-explanation"
                required
                rows={3}
                maxLength={5000}
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="Why is this the correct answer?"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>
            <div>
              <label htmlFor="q-type" className="mb-1 block text-sm font-medium text-slate-700">
                Type
              </label>
              <select
                id="q-type"
                value={qType}
                onChange={(e) => {
                  const next = e.target.value as 'single' | 'multiple';
                  setQType(next);
                  if (next === 'single') {
                    // Keep only the first correct option marked.
                    const firstCorrect = options.findIndex((o) => o.isCorrect);
                    setOptions((prev) => prev.map((o, i) => ({ ...o, isCorrect: i === firstCorrect })));
                  }
                }}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              >
                <option value="single">Single choice</option>
                <option value="multiple">Multiple choice</option>
              </select>
            </div>
          </div>

          {/* Options editor */}
          <div>
            <p className="mb-1 text-sm font-medium text-slate-700">
              Options <span className="font-normal text-slate-400">(mark the correct ones)</span>
            </p>
            <div className="space-y-2">
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleCorrect(index)}
                    title="Toggle correct"
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-sm font-bold transition-colors ${
                      option.isCorrect
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-slate-300 bg-white text-slate-400 hover:border-emerald-300'
                    }`}
                  >
                    {option.label}
                  </button>
                  <input
                    type="text"
                    required
                    maxLength={2000}
                    value={option.content}
                    onChange={(e) => patchOption(index, { content: e.target.value })}
                    placeholder={`Option ${option.label}`}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                  <button
                    type="button"
                    onClick={() => removeOption(index)}
                    disabled={options.length <= 2}
                    title="Remove option"
                    className="rounded-md px-2 py-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            {options.length < LABELS.length && (
              <button
                type="button"
                onClick={addOption}
                className="mt-2 rounded-md border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-500 hover:border-brand-400 hover:text-brand-600"
              >
                + Add option
              </button>
            )}
          </div>

          {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-brand-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
            >
              {busy ? 'Saving…' : isNew ? 'Create question' : `Save as v${question.version + 1}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
