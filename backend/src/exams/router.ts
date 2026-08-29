import { Router } from 'express';
import { authenticateOptional } from '../auth/middleware.js';
import { answer, create, get, list, submit } from './controller.js';

// Exam endpoints are open (no auth required); when a valid token is
// presented the exam is linked to that user for the history listing.
const router = Router();

router.use(authenticateOptional);

router.get('/', list);
router.post('/', create);
router.get('/:examId', get);
router.put('/:examId/records/:recordId', answer);
router.post('/:examId/submit', submit);

export default router;
