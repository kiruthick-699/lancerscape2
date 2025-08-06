import { Router } from 'express';

const router = Router();

// Placeholder routes
router.get('/', (req, res) => {
  res.json({ message: 'Get messages endpoint' });
});

router.post('/', (req, res) => {
  res.json({ message: 'Send message endpoint' });
});

export default router; 