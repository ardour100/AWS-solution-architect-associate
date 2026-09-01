import { z } from 'zod';

const optionSchema = z
  .object({
    label: z.string().min(1).max(8),
    content: z.string().min(1).max(2000),
    isCorrect: z.boolean(),
  })
  .strict();

/**
 * Full question content — used by both create and update (an update is a
 * new immutable version, so it carries the complete new content).
 */
export const questionSchema = z
  .object({
    title: z.string().trim().min(1).max(800),
    explanation: z.string().trim().min(1).max(5000),
    qType: z.enum(['single', 'multiple']),
    options: z.array(optionSchema).min(2, 'At least 2 options are required').max(8),
  })
  .strict()
  .superRefine((value, ctx) => {
    const correctCount = value.options.filter((o) => o.isCorrect).length;
    if (correctCount === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['options'],
        message: 'At least one option must be marked correct',
      });
    }
    if (value.qType === 'single' && correctCount > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['options'],
        message: 'Single-choice questions must have exactly one correct option',
      });
    }
  });

export const listQuestionsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  includeDeleted: z.coerce.boolean().default(false),
});

export type QuestionInput = z.infer<typeof questionSchema>;
