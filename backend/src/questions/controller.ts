import type { Request, Response } from 'express';
import { listQuestionsQuerySchema, questionSchema } from './schemas.js';
import * as questionService from './service.js';

function parseBody(req: Request, res: Response) {
  const result = questionSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      error: 'Invalid request body',
      details: result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return undefined;
  }
  return result.data;
}

export async function list(req: Request, res: Response): Promise<void> {
  const query = listQuestionsQuerySchema.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: 'Invalid query parameters' });
    return;
  }
  res.json(await questionService.listQuestions(query.data.limit, query.data.offset, query.data.includeDeleted));
}

export async function get(req: Request, res: Response): Promise<void> {
  // Express 5 types params as string | string[]; our routes are single-segment.
  res.json(await questionService.getQuestion(req.params.id as string));
}

export async function create(req: Request, res: Response): Promise<void> {
  const body = parseBody(req, res);
  if (!body) return;
  res.status(201).json(await questionService.createQuestion(body));
}

export async function update(req: Request, res: Response): Promise<void> {
  const body = parseBody(req, res);
  if (!body) return;
  res.json(await questionService.updateQuestion(req.params.id as string, body));
}

export async function remove(req: Request, res: Response): Promise<void> {
  await questionService.deleteQuestion(req.params.id as string);
  res.status(204).end();
}
