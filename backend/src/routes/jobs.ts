import { Router } from 'express';

const router = Router();

// Placeholder routes
router.get('/', (req, res) => {
  res.json({ message: 'Get jobs endpoint' });
});

router.post('/', (req, res) => {
  res.json({ message: 'Create job endpoint' });
});

export default router; 