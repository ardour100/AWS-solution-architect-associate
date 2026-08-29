import type { Request, Response } from 'express';
import { answerSchema, createExamSchema } from './schemas.js';
import * as examService from './service.js';

export async function create(req: Request, res: Response): Promise<void> {
  const body = createExamSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: 'Invalid request body', details: body.error.issues });
    return;
  }
  // Anonymous by default; records the user when a valid token was presented.
  res.status(201).json(await examService.createExam(body.data.count, req.user?.userId));
}

export async function get(req: Request, res: Response): Promise<void> {
  res.json(await examService.getExam(req.params.examId as string));
}

export async function list(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required to list exams' });
    return;
  }
  res.json(await examService.listExams(req.user.userId));
}

export async function answer(req: Request, res: Response): Promise<void> {
  const body = answerSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: 'Invalid request body', details: body.error.issues });
    return;
  }
  res.json(
    await examService.answerExam(req.params.examId as string, req.params.recordId as string, body.data.selectedOptionIds),
  );
}

export async function submit(req: Request, res: Response): Promise<void> {
  res.json(await examService.submitExam(req.params.examId as string));
}
