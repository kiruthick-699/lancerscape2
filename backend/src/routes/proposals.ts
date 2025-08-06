import { Router } from 'express';

const router = Router();

// Placeholder routes
router.get('/', (req, res) => {
  res.json({ message: 'Get proposals endpoint' });
});

router.post('/', (req, res) => {
  res.json({ message: 'Create proposal endpoint' });
});

export default router; 