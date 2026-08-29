import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

/**
 * Database schema for the AWS Solutions Architect practice platform.
 *
 * Design notes:
 * - Enum-like columns (role, q_type, status) are `text` + CHECK constraints
 *   instead of native PostgreSQL enums, so new values can be added with a
 *   plain `ALTER TABLE ... DROP CONSTRAINT / ADD CONSTRAINT` (native enums
 *   require `ALTER TYPE ... ADD VALUE`, which is awkward in migrations).
 * - `questions` uses an immutable, append-only versioning scheme: every edit
 *   creates a new row with `version + 1`; `is_latest` marks the current one.
 */

// ── users ────────────────────────────────────────────────────────────────
export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    role: text('role').notNull().default('user'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check('users_role_check', sql`${table.role} in ('user', 'admin')`)],
);

// ── questions (immutable versioning) ─────────────────────────────────────
export const questions = pgTable(
  'questions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // All versions of the same logical question share one group_id.
    groupId: uuid('group_id').notNull(),
    version: integer('version').notNull().default(1),
    isLatest: boolean('is_latest').notNull().default(false),
    // Soft delete: keeps exam history referential integrity intact while
    // removing the question from practice pools and default listings.
    isDeleted: boolean('is_deleted').notNull().default(false),
    title: text('title').notNull(),
    explanation: text('explanation').notNull(),
    qType: text('q_type').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('questions_version_check', sql`${table.version} >= 1`),
    check('questions_q_type_check', sql`${table.qType} in ('single', 'multiple')`),
    // One version number per group; also serves as the group_id lookup index.
    uniqueIndex('questions_group_version_unique').on(table.groupId, table.version),
    // At most one row per group may be flagged as latest.
    uniqueIndex('questions_one_latest_per_group_unique')
      .on(table.groupId)
      .where(sql`${table.isLatest} = true`),
    index('questions_is_latest_idx').on(table.isLatest),
    index('questions_is_deleted_idx').on(table.isDeleted),
  ],
);

// ── options ──────────────────────────────────────────────────────────────
export const options = pgTable(
  'options',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // Cascade: deleting a question version removes its options.
    questionId: uuid('question_id')
      .notNull()
      .references(() => questions.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    content: text('content').notNull(),
    isCorrect: boolean('is_correct').notNull().default(false),
  },
  (table) => [index('options_question_id_idx').on(table.questionId)],
);

// ── exams (exam sessions) ────────────────────────────────────────────────
export const exams = pgTable(
  'exams',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // Nullable: exams can be taken anonymously (no auth required on the
    // exam endpoints); when a valid token is presented we record the user.
    userId: uuid('user_id').references(() => users.id),
    status: text('status').notNull().default('in_progress'),
    totalCount: integer('total_count').notNull().default(10),
    correctCount: integer('correct_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [
    check('exams_status_check', sql`${table.status} in ('in_progress', 'completed')`),
    check('exams_total_count_check', sql`${table.totalCount} >= 1`),
    check('exams_correct_count_check', sql`${table.correctCount} >= 0`),
    index('exams_user_id_idx').on(table.userId),
  ],
);

// ── exam_records (per-question answer snapshot) ──────────────────────────
export const examRecords = pgTable(
  'exam_records',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // Cascade: deleting an exam removes all of its records.
    examId: uuid('exam_id')
      .notNull()
      .references(() => exams.id, { onDelete: 'cascade' }),
    // Points at the specific question version shown during the exam.
    // No cascade: exam history must survive even if the question is deleted.
    questionId: uuid('question_id')
      .notNull()
      .references(() => questions.id),
    // IDs of the options the user selected (UUIDs as strings).
    // Empty array means "not answered yet" for an in-progress exam.
    // Note: `.array()` (not a `{ array: true }` config option) makes this a text[].
    selectedOptionIds: text('selected_option_ids')
      .array()
      .notNull()
      .default(sql`'{}'`),
    // Filled in by the grading step when the exam is submitted.
    isCorrect: boolean('is_correct'),
  },
  (table) => [
    // One record per question per exam; prefix also serves as exam_id index.
    uniqueIndex('exam_records_exam_question_unique').on(table.examId, table.questionId),
    index('exam_records_question_id_idx').on(table.questionId),
  ],
);

// ── TypeScript row/insert types (convenience exports) ────────────────────
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Question = typeof questions.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;
export type Option = typeof options.$inferSelect;
export type NewOption = typeof options.$inferInsert;
export type Exam = typeof exams.$inferSelect;
export type NewExam = typeof exams.$inferInsert;
export type ExamRecord = typeof examRecords.$inferSelect;
export type NewExamRecord = typeof examRecords.$inferInsert;

// ── Relations (type-level only — do not affect migrations) ───────────────
export const usersRelations = relations(users, ({ many }) => ({
  exams: many(exams),
}));

export const questionsRelations = relations(questions, ({ many }) => ({
  options: many(options),
}));

export const examsRelations = relations(exams, ({ one, many }) => ({
  user: one(users, { fields: [exams.userId], references: [users.id] }),
  records: many(examRecords),
}));

export const optionsRelations = relations(options, ({ one }) => ({
  question: one(questions, { fields: [options.questionId], references: [questions.id] }),
}));

export const examRecordsRelations = relations(examRecords, ({ one }) => ({
  exam: one(exams, { fields: [examRecords.examId], references: [exams.id] }),
  question: one(questions, { fields: [examRecords.questionId], references: [questions.id] }),
}));
