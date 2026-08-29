import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { ApiError } from '../auth/errors.js';
import { db } from '../db/index.js';
import { isUuid } from '../params.js';
import {
  examRecords,
  exams,
  options,
  questions,
  type Exam,
  type ExamRecord,
  type Option,
  type Question,
} from '../db/schema.js';

/** Client-facing option view — `is_correct` never leaves the server before submit. */
export interface OptionView {
  id: string;
  label: string;
  content: string;
}

/** Client-facing record view; grading fields appear only after submit. */
export interface RecordView {
  id: string;
  questionId: string;
  title: string;
  qType: string;
  explanation?: string;
  selectedOptionIds: string[];
  correctOptionIds?: string[];
  isCorrect?: boolean;
  options: OptionView[];
}

export interface ExamView extends Exam {
  records: RecordView[];
}

/**
 * Builds record views from rows. When `reveal` is false (exam still in
 * progress) answer data is omitted so clients can't read the answer key.
 */
async function buildRecordViews(records: ExamRecord[], reveal: boolean): Promise<RecordView[]> {
  if (records.length === 0) return [];

  const questionIds = records.map((r) => r.questionId);
  const [questionRows, optionRows] = await Promise.all([
    db.select().from(questions).where(inArray(questions.id, questionIds)),
    db.select().from(options).where(inArray(options.questionId, questionIds)),
  ]);

  const questionById = new Map<string, Question>(questionRows.map((q) => [q.id, q]));
  const optionsByQuestion = new Map<string, Option[]>();
  for (const option of optionRows) {
    optionsByQuestion.set(option.questionId, [...(optionsByQuestion.get(option.questionId) ?? []), option]);
  }

  return records.map((record) => {
    const question = questionById.get(record.questionId);
    if (!question) throw new ApiError(500, `Question ${record.questionId} referenced by exam is missing`);
    const opts = optionsByQuestion.get(record.questionId) ?? [];

    const view: RecordView = {
      id: record.id,
      questionId: question.id,
      title: question.title,
      qType: question.qType,
      selectedOptionIds: record.selectedOptionIds,
      options: opts.map(({ id, label, content }) => ({ id, label, content })),
    };
    if (reveal) {
      view.explanation = question.explanation;
      view.correctOptionIds = opts.filter((o) => o.isCorrect).map((o) => o.id);
      view.isCorrect = record.isCorrect ?? false;
    }
    return view;
  });
}

/**
 * Starts an exam: picks `count` random latest non-deleted questions and
 * snapshots one exam_record per question (the snapshot keeps pointing at
 * the exact version served even if the question is edited later).
 */
export async function createExam(count: number, userId?: string): Promise<ExamView> {
  const pool = await db
    .select({ id: questions.id })
    .from(questions)
    .where(and(eq(questions.isLatest, true), eq(questions.isDeleted, false)))
    .orderBy(sql`random()`)
    .limit(count);

  if (pool.length === 0) {
    throw new ApiError(409, 'No questions available — seed the question bank first');
  }

  return db.transaction(async (tx) => {
    const [exam] = await tx
      .insert(exams)
      .values({ userId: userId ?? null, totalCount: pool.length })
      .returning();

    const records = await tx
      .insert(examRecords)
      .values(pool.map((q) => ({ examId: exam.id, questionId: q.id })))
      .returning();

    return { ...exam, records: await buildRecordViews(records, false) };
  });
}

export async function getExam(examId: string): Promise<ExamView> {
  if (!isUuid(examId)) throw new ApiError(404, 'Exam not found');
  const [exam] = await db.select().from(exams).where(eq(exams.id, examId)).limit(1);
  if (!exam) throw new ApiError(404, 'Exam not found');

  const records = await db.select().from(examRecords).where(eq(examRecords.examId, examId));
  return { ...exam, records: await buildRecordViews(records, exam.status === 'completed') };
}

/** Lists exams of one user (no records attached). */
export async function listExams(userId: string): Promise<Exam[]> {
  return db.select().from(exams).where(eq(exams.userId, userId)).orderBy(desc(exams.createdAt));
}

/** Saves the user's selection for one record of an in-progress exam. */
export async function answerExam(examId: string, recordId: string, selectedOptionIds: string[]): Promise<ExamRecord> {
  if (!isUuid(examId)) throw new ApiError(404, 'Exam not found');
  const [exam] = await db.select().from(exams).where(eq(exams.id, examId)).limit(1);
  if (!exam) throw new ApiError(404, 'Exam not found');
  if (exam.status !== 'in_progress') throw new ApiError(409, 'Exam is already submitted');

  if (!isUuid(recordId)) throw new ApiError(404, 'Record not found');
  const [record] = await db
    .select()
    .from(examRecords)
    .where(and(eq(examRecords.id, recordId), eq(examRecords.examId, examId)))
    .limit(1);
  if (!record) throw new ApiError(404, 'Record not found');

  // Every selected id must be one of this question's options.
  if (selectedOptionIds.length > 0) {
    const valid = await db
      .select({ id: options.id })
      .from(options)
      .where(and(eq(options.questionId, record.questionId), inArray(options.id, selectedOptionIds)));
    if (valid.length !== selectedOptionIds.length) {
      throw new ApiError(400, 'Unknown option ids for this question');
    }
  }

  const [updated] = await db
    .update(examRecords)
    .set({ selectedOptionIds })
    .where(eq(examRecords.id, record.id))
    .returning();
  return updated;
}

/**
 * Grades and closes the exam. Strict grading: a record is correct only
 * when the selected set exactly matches the correct set (order-insensitive).
 * Backfills exam_records.is_correct, updates counts, sets completed_at.
 */
export async function submitExam(examId: string): Promise<ExamView> {
  if (!isUuid(examId)) throw new ApiError(404, 'Exam not found');
  const [exam] = await db.select().from(exams).where(eq(exams.id, examId)).limit(1);
  if (!exam) throw new ApiError(404, 'Exam not found');
  if (exam.status !== 'in_progress') throw new ApiError(409, 'Exam is already submitted');

  const records = await db.select().from(examRecords).where(eq(examRecords.examId, examId));
  const questionIds = records.map((r) => r.questionId);
  const [questionRows, optionRows] = await Promise.all([
    db.select().from(questions).where(inArray(questions.id, questionIds)),
    db.select().from(options).where(inArray(options.questionId, questionIds)),
  ]);

  const questionById = new Map<string, Question>(questionRows.map((q) => [q.id, q]));
  const optionsByQuestion = new Map<string, Option[]>();
  const correctByQuestion = new Map<string, string[]>();
  for (const option of optionRows) {
    optionsByQuestion.set(option.questionId, [...(optionsByQuestion.get(option.questionId) ?? []), option]);
    if (option.isCorrect) {
      correctByQuestion.set(option.questionId, [...(correctByQuestion.get(option.questionId) ?? []), option.id]);
    }
  }

  const graded = records.map((record) => {
    const correctIds = [...(correctByQuestion.get(record.questionId) ?? [])].sort();
    const selected = [...record.selectedOptionIds].sort();
    const isCorrect =
      correctIds.length === selected.length && correctIds.every((id, i) => id === selected[i]);
    return { record, isCorrect, correctIds, selected };
  });
  const correctCount = graded.filter((g) => g.isCorrect).length;
  const completedAt = new Date();

  await db.transaction(async (tx) => {
    for (const g of graded) {
      await tx.update(examRecords).set({ isCorrect: g.isCorrect }).where(eq(examRecords.id, g.record.id));
    }
    await tx
      .update(exams)
      .set({ status: 'completed', correctCount, completedAt })
      .where(eq(exams.id, examId));
  });

  return {
    ...exam,
    status: 'completed',
    correctCount,
    completedAt,
    records: graded.map((g) => {
      const question = questionById.get(g.record.questionId);
      const opts = optionsByQuestion.get(g.record.questionId) ?? [];
      return {
        id: g.record.id,
        questionId: g.record.questionId,
        title: question?.title ?? '',
        qType: question?.qType ?? 'single',
        explanation: question?.explanation ?? '',
        selectedOptionIds: g.selected,
        correctOptionIds: g.correctIds,
        isCorrect: g.isCorrect,
        options: opts.map(({ id, label, content }) => ({ id, label, content })),
      };
    }),
  };
}
