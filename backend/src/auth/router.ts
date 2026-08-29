import { Router } from 'express';
import { login, register } from './controller.js';
import { authenticateToken } from './middleware.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);

// Example of an authenticated route: echoes the claims from the token.
// Future question CRUD routes will mount `requireAdmin` the same way.
router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

export default router;
