import { z } from 'zod';

export const createExamSchema = z
  .object({
    // Number of random questions; clamps to the size of the question pool.
    count: z.coerce.number().int().min(1).max(50).default(10),
  })
  .strict();

export const answerSchema = z
  .object({
    selectedOptionIds: z.array(z.uuid()).max(8),
  })
  .strict();

export type CreateExamInput = z.infer<typeof createExamSchema>;
export type AnswerInput = z.infer<typeof answerSchema>;
