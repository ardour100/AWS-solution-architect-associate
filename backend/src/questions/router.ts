import { Router } from 'express';
import { requireAdmin } from '../auth/middleware.js';
import { create, get, list, remove, update } from './controller.js';

// Question management is admin-only: create/update/delete/list.
const router = Router();

router.use(requireAdmin);

router.get('/', list);
router.post('/', create);
router.get('/:id', get);
router.put('/:id', update);
router.delete('/:id', remove);

export default router;
