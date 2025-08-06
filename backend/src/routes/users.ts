import { Router } from 'express';

const router = Router();

// Placeholder routes
router.get('/', (req, res) => {
  res.json({ message: 'Get users endpoint' });
});

router.get('/:id', (req, res) => {
  res.json({ message: 'Get user by ID endpoint' });
});

export default router; 