import { and, asc, count, desc, eq, inArray } from 'drizzle-orm';
import { ApiError } from '../auth/errors.js';
import { db } from '../db/index.js';
import { options, questions, type Option, type Question } from '../db/schema.js';
import { isUuid } from '../params.js';
import type { QuestionInput } from './schemas.js';

interface QuestionWithOptions extends Question {
  options: Option[];
}

/** Attaches options to a batch of questions without N+1 queries. */
async function attachOptions(items: Question[]): Promise<QuestionWithOptions[]> {
  if (items.length === 0) return items as QuestionWithOptions[];
  const rows = await db
    .select()
    .from(options)
    .where(inArray(options.questionId, items.map((q) => q.id)))
    .orderBy(asc(options.label));
  const byQuestion = new Map<string, Option[]>();
  for (const row of rows) {
    byQuestion.set(row.questionId, [...(byQuestion.get(row.questionId) ?? []), row]);
  }
  return items.map((q) => ({ ...q, options: byQuestion.get(q.id) ?? [] }));
}

/** Fetches one row by id; 404 if missing or not a valid uuid. */
async function findOrThrow(id: string): Promise<Question> {
  if (!isUuid(id)) throw new ApiError(404, 'Question not found');
  const [row] = await db.select().from(questions).where(eq(questions.id, id)).limit(1);
  if (!row) throw new ApiError(404, 'Question not found');
  return row;
}

export async function listQuestions(limit: number, offset: number, includeDeleted: boolean) {
  const conditions = [eq(questions.isLatest, true)];
  if (!includeDeleted) conditions.push(eq(questions.isDeleted, false));
  const where = and(...conditions);

  const [items, total] = await Promise.all([
    db
      .select()
      .from(questions)
      .where(where)
      .orderBy(desc(questions.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ value: count() }).from(questions).where(where),
  ]);

  return { items: await attachOptions(items), total: total[0].value };
}

export async function getQuestion(id: string): Promise<QuestionWithOptions> {
  const question = await findOrThrow(id);
  return (await attachOptions([question]))[0];
}

/** Creates a question: version 1 of a new group, marked latest. */
export async function createQuestion(input: QuestionInput): Promise<QuestionWithOptions> {
  return db.transaction(async (tx) => {
    const [question] = await tx
      .insert(questions)
      .values({
        groupId: crypto.randomUUID(),
        version: 1,
        isLatest: true,
        title: input.title,
        explanation: input.explanation,
        qType: input.qType,
      })
      .returning();

    const created = await tx
      .insert(options)
      .values(input.options.map((o) => ({ ...o, questionId: question.id })))
      .returning();

    return { ...question, options: created };
  });
}

/**
 * Updates a question by appending a new immutable version: same group_id,
 * version + 1, old version's is_latest flipped off. Exam records keep
 * pointing at the version they served.
 */
export async function updateQuestion(id: string, input: QuestionInput): Promise<QuestionWithOptions> {
  return db.transaction(async (tx) => {
    const current = await findOrThrow(id);
    if (current.isDeleted) throw new ApiError(404, 'Question not found');
    if (!current.isLatest) throw new ApiError(409, 'Only the latest version can be updated');

    // Flip the old version off BEFORE inserting the new one: the partial
    // unique index (one is_latest per group) is checked per statement, so
    // two latest rows must never coexist even inside a transaction.
    await tx.update(questions).set({ isLatest: false }).where(eq(questions.id, current.id));

    const [next] = await tx
      .insert(questions)
      .values({
        groupId: current.groupId,
        version: current.version + 1,
        isLatest: true,
        title: input.title,
        explanation: input.explanation,
        qType: input.qType,
      })
      .returning();

    const created = await tx
      .insert(options)
      .values(input.options.map((o) => ({ ...o, questionId: next.id })))
      .returning();

    return { ...next, options: created };
  });
}

/**
 * Soft delete: the latest version stays latest (so the group's history is
 * intact) but is excluded from practice pools and default listings.
 * Hard delete is deliberately avoided — exam_records reference questions
 * without cascade to preserve exam history.
 */
export async function deleteQuestion(id: string): Promise<void> {
  const current = await findOrThrow(id);
  if (current.isDeleted) throw new ApiError(404, 'Question not found');
  if (!current.isLatest) throw new ApiError(409, 'Only the latest version can be deleted');
  await db.update(questions).set({ isDeleted: true }).where(eq(questions.id, current.id));
}
